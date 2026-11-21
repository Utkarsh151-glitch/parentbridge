import { LLMError, type ChatMessage, type LLMProvider, type LLMResult, type ToolDef } from "./types";

// Groq exposes an OpenAI-compatible Chat Completions API.
const URL = "https://api.groq.com/openai/v1/chat/completions";

type OAIMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

function toMessages(system: string, messages: ChatMessage[]): OAIMessage[] {
  const out: OAIMessage[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") out.push({ role: "user", content: m.content });
    else if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.content || null,
        ...(m.toolCalls?.length
          ? {
              tool_calls: m.toolCalls.map((c) => ({
                id: c.id,
                type: "function" as const,
                function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) },
              })),
            }
          : {}),
      });
    } else {
      for (const r of m.results) {
        out.push({ role: "tool", tool_call_id: r.id, content: JSON.stringify(r.result) });
      }
    }
  }
  return out;
}

export function groqProvider(model = process.env.GROQ_MODEL || "openai/gpt-oss-120b"): LLMProvider {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new LLMError("groq", "GROQ_API_KEY is not set", { status: 401 });

  return {
    name: "groq",
    model,
    async runWithTools(messages, tools: ToolDef[], opts): Promise<LLMResult> {
      let res: Response;
      try {
        res = await fetch(URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          signal: opts.signal,
          body: JSON.stringify({
            model,
            messages: toMessages(opts.system, messages),
            temperature: opts.temperature ?? 0.3,
            max_completion_tokens: opts.maxOutputTokens ?? 8192,
            ...(tools.length
              ? {
                  tools: tools.map((t) => ({
                    type: "function",
                    function: { name: t.name, description: t.description, parameters: t.parameters },
                  })),
                  tool_choice: opts.toolChoice === "required" ? "required" : "auto",
                }
              : {}),
          }),
        });
      } catch (e) {
        throw new LLMError("groq", `Network error: ${(e as Error).message}`, { retryable: true, status: 503 });
      }

      if (!res.ok) {
        const body = await res.text();
        let msg = body;
        let code = "";
        try {
          const j = JSON.parse(body);
          msg = j?.error?.message ?? body;
          code = j?.error?.code ?? "";
        } catch {}
        const ra = Number(res.headers.get("retry-after"));
        throw new LLMError("groq", `${res.status} ${msg}`.slice(0, 400), {
          status: res.status,
          // tool_use_failed = the model produced a malformed tool call; a retry usually fixes it
          retryable: res.status === 429 || res.status >= 500 || code === "tool_use_failed",
          retryAfterMs: Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined,
        });
      }

      const j = await res.json();
      const msg = j.choices?.[0]?.message ?? {};
      const toolCalls = (msg.tool_calls ?? []).map(
        (c: { id: string; function: { name: string; arguments: string } }) => {
          let args: Record<string, unknown> = {};
          try {
            args = c.function.arguments ? JSON.parse(c.function.arguments) : {};
          } catch {
            args = { __invalid_json__: c.function.arguments };
          }
          return { id: c.id, providerId: c.id, name: c.function.name, args };
        }
      );
      return {
        text: (msg.content ?? "").trim(),
        toolCalls,
        usage: { input: j.usage?.prompt_tokens ?? 0, output: j.usage?.completion_tokens ?? 0 },
        provider: "groq",
        model: j.model ?? model,
        finishReason: j.choices?.[0]?.finish_reason,
      };
    },
  };
}
