import type { z } from "zod";
import {
  runWithTools,
  newRouterState,
  type ChatMessage,
  type RouterState,
  type ToolDef,
  type ToolResult,
} from "@/lib/llm";
import { formatZodError, toParameters } from "./schemas";

export type StepRecord = {
  i: number; // global step index (tool call #)
  turn: number; // model turn that requested it
  tool: string;
  args: unknown;
  result: unknown;
  ok: boolean;
  ms: number;
  summary?: string; // one-line human summary for the trace card
  source?: string; // e.g. "Postal PIN lookup", "MongoDB", "cache"
};

export type LlmTurnRecord = {
  turn: number;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  ms: number;
  tool_calls: string[];
  text?: string;
  fallback?: string; // e.g. "gemini 429 → groq"
};

export type AgentEvent =
  | { type: "run_started"; run_id: string; kind: string; cached?: false }
  | { type: "llm"; turn: LlmTurnRecord }
  | { type: "step_started"; i: number; turn: number; tool: string; args: unknown }
  | { type: "step"; step: StepRecord }
  | { type: "note"; message: string }
  | {
      type: "done";
      run_id: string;
      final_output: unknown;
      totals: { provider: string; model: string; input_tokens: number; output_tokens: number; llm_calls: number; duration_ms: number };
    }
  | { type: "error"; run_id?: string; message: string; retryable: boolean; rate_limited?: boolean };

export type ToolOutcome = { result: unknown; ok?: boolean; summary?: string; source?: string };

export type AgentTool<C> = {
  name: string;
  description: string;
  schema: z.ZodType;
  run: (args: never, ctx: C) => Promise<ToolOutcome>;
};

export function toToolDefs<C>(tools: AgentTool<C>[]): ToolDef[] {
  return tools.map((t) => ({ name: t.name, description: t.description, parameters: toParameters(t.schema) }));
}

export class TokenBudgetError extends Error {}

export async function runAgentLoop<C>(opts: {
  system: string;
  prompt: string;
  tools: AgentTool<C>[];
  ctx: C;
  maxTurns?: number; // model turns (max 8)
  maxTotalTokens?: number;
  maxOutputTokens?: number;
  firstTurnRequired?: boolean;
  missing: (ctx: C) => string[]; // what's still missing from the output contract
  onEvent: (e: AgentEvent) => void;
  onStep?: (s: StepRecord, turn: LlmTurnRecord | null) => Promise<void>;
  onTurn?: (t: LlmTurnRecord) => Promise<void>;
  router?: RouterState;
}) {
  const router = opts.router ?? newRouterState();
  const defs = toToolDefs(opts.tools);
  const byName = new Map(opts.tools.map((t) => [t.name, t]));
  const messages: ChatMessage[] = [{ role: "user", content: opts.prompt }];
  const steps: StepRecord[] = [];
  const turns: LlmTurnRecord[] = [];
  const usage = { input: 0, output: 0 };
  const maxTurns = Math.min(opts.maxTurns ?? 8, 8);
  let finalText = "";

  for (let turn = 1; turn <= maxTurns; turn++) {
    const attemptsBefore = router.attempts.length;
    const t0 = Date.now();
    const res = await runWithTools(
      messages,
      defs,
      {
        system: opts.system,
        toolChoice: turn === 1 && opts.firstTurnRequired ? "required" : "auto",
        maxOutputTokens: opts.maxOutputTokens,
      },
      router
    );
    usage.input += res.usage.input;
    usage.output += res.usage.output;
    const failed = router.attempts.slice(attemptsBefore).filter((a) => !a.ok);
    const turnRec: LlmTurnRecord = {
      turn,
      provider: res.provider,
      model: res.model,
      input_tokens: res.usage.input,
      output_tokens: res.usage.output,
      ms: Date.now() - t0,
      tool_calls: res.toolCalls.map((c) => c.name),
      text: res.text ? res.text.slice(0, 500) : undefined,
      fallback: failed.length
        ? `${failed.map((f) => `${f.model} ${f.status ?? "error"}`).join(", ")} → ${res.model}`
        : undefined,
    };
    turns.push(turnRec);
    opts.onEvent({ type: "llm", turn: turnRec });
    await opts.onTurn?.(turnRec);

    messages.push({
      role: "assistant",
      content: res.text,
      toolCalls: res.toolCalls,
      raw: res.raw ? { provider: res.provider, data: res.raw } : undefined,
    });

    if (!res.toolCalls.length) {
      const missing = opts.missing(opts.ctx);
      if (!missing.length) {
        finalText = res.text;
        break;
      }
      if (turn === maxTurns) break;
      messages.push({
        role: "user",
        content: `Not finished yet — still missing: ${missing.join(", ")}. Call the tools needed to complete them now.`,
      });
      continue;
    }

    // Execute tool calls in the order the model gave them (they share run state).
    const results: ToolResult[] = [];
    let anyError = false;
    for (const call of res.toolCalls) {
      const i = steps.length + 1;
      opts.onEvent({ type: "step_started", i, turn, tool: call.name, args: call.args });
      const s0 = Date.now();
      let outcome: ToolOutcome;
      const tool = byName.get(call.name);
      if (!tool) {
        outcome = { ok: false, result: { error: `Unknown tool "${call.name}"` } };
      } else {
        const parsed = tool.schema.safeParse(call.args);
        if (!parsed.success) {
          outcome = {
            ok: false,
            result: { error: `Invalid arguments — ${formatZodError(parsed.error)}. Fix and call again.` },
            summary: "Rejected: invalid arguments",
          };
        } else {
          try {
            outcome = await tool.run(parsed.data as never, opts.ctx);
          } catch (e) {
            outcome = { ok: false, result: { error: (e as Error).message }, summary: `Error: ${(e as Error).message}` };
          }
        }
      }
      const ok = outcome.ok ?? true;
      if (!ok) anyError = true;
      const step: StepRecord = {
        i,
        turn,
        tool: call.name,
        args: call.args,
        result: outcome.result,
        ok,
        ms: Date.now() - s0,
        summary: outcome.summary,
        source: outcome.source,
      };
      steps.push(step);
      opts.onEvent({ type: "step", step });
      await opts.onStep?.(step, turnRec);
      results.push({ id: call.id, providerId: call.providerId, name: call.name, result: outcome.result });
    }
    messages.push({ role: "tool", results });

    // Output contract satisfied and nothing failed → stop here (saves a free-tier request).
    if (!anyError && opts.missing(opts.ctx).length === 0) break;

    if (opts.maxTotalTokens && usage.input + usage.output > opts.maxTotalTokens) {
      throw new TokenBudgetError(
        `Token budget exceeded (${usage.input + usage.output} > ${opts.maxTotalTokens}) — run stopped to protect the free tier.`
      );
    }
  }

  return { steps, turns, usage, router, finalText, missing: opts.missing(opts.ctx) };
}
