import { geminiProvider } from "./gemini";
import { groqProvider } from "./groq";
import { LLMError, type ChatMessage, type LLMProvider, type LLMResult, type ProviderName, type RunOptions, type ToolDef } from "./types";

export * from "./types";

export type Attempt = { provider: ProviderName; model: string; ok: boolean; error?: string; status?: number; ms: number };

/** One link in the fallback chain. */
export type ChainEntry = { provider: ProviderName; model: string };

/** Per-run router state: once we fall back, stay on what worked for the rest of the run. */
export type RouterState = { sticky?: string; attempts: Attempt[] };

export function newRouterState(): RouterState {
  return { attempts: [] };
}

const keyOf = (e: ChainEntry) => `${e.provider}:${e.model}`;

function make(e: ChainEntry): LLMProvider {
  return e.provider === "groq" ? groqProvider(e.model) : geminiProvider(e.model);
}

/**
 * Ordered chain, all free tier:
 *   LLM_PROVIDER's model (default Gemini LLM_MODEL) → GEMINI_FALLBACK_MODEL (optional) → Groq GROQ_MODEL.
 */
export function providerChain(state?: RouterState): ChainEntry[] {
  const gemini: ChainEntry[] = process.env.GEMINI_API_KEY
    ? [
        { provider: "gemini" as const, model: process.env.LLM_MODEL || "gemini-3.5-flash-lite" },
        ...(process.env.GEMINI_FALLBACK_MODEL ? [{ provider: "gemini" as const, model: process.env.GEMINI_FALLBACK_MODEL }] : []),
      ]
    : [];
  const groq: ChainEntry[] = process.env.GROQ_API_KEY ? [{ provider: "groq", model: process.env.GROQ_MODEL || "openai/gpt-oss-120b" }] : [];
  let chain = process.env.LLM_PROVIDER === "groq" ? [...groq, ...gemini] : [...gemini, ...groq];
  if (state?.sticky) {
    const s = chain.find((e) => keyOf(e) === state.sticky);
    if (s) chain = [s, ...chain.filter((e) => e !== s)];
  }
  return chain;
}

export function llmConfigured(): boolean {
  return providerChain().length > 0;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AllProvidersFailedError extends Error {
  attempts: Attempt[];
  rateLimited: boolean;
  constructor(attempts: Attempt[]) {
    const rateLimited = attempts.length > 0 && attempts.every((a) => a.status === 429 || a.status === 504);
    super(
      attempts.length
        ? `All AI providers failed: ${attempts.map((a) => `${a.provider}/${a.model} (${a.status ?? "error"}: ${a.error})`).join(" · ")}`
        : "No AI provider is configured (set GEMINI_API_KEY and/or GROQ_API_KEY)."
    );
    this.name = "AllProvidersFailedError";
    this.attempts = attempts;
    this.rateLimited = rateLimited;
  }
}

/**
 * The single LLM entry point: one model turn with tools.
 * On a retryable error (429/5xx) retry once; on a second failure, a timeout or a hard error,
 * move down the chain (Gemini → Gemini fallback model → Groq). Every attempt is recorded.
 */
export async function runWithTools(
  messages: ChatMessage[],
  tools: ToolDef[],
  opts: RunOptions,
  state: RouterState = newRouterState()
): Promise<LLMResult> {
  const chain = providerChain(state);
  const failures: Attempt[] = [];
  for (const entry of chain) {
    let provider: LLMProvider;
    try {
      provider = make(entry);
    } catch (e) {
      failures.push({ provider: entry.provider, model: entry.model, ok: false, error: (e as Error).message, ms: 0 });
      continue;
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t0 = Date.now();
      // Hard per-call timeout: a hung model must not hang the run — move to the next link instead.
      const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 45_000);
      const timeout = AbortSignal.timeout(timeoutMs);
      const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
      try {
        const r = await provider.runWithTools(messages, tools, { ...opts, signal });
        state.attempts.push({ provider: entry.provider, model: entry.model, ok: true, ms: Date.now() - t0 });
        state.sticky = keyOf(entry);
        return r;
      } catch (e) {
        let err = e instanceof LLMError ? e : new LLMError(entry.provider, (e as Error).message);
        if (timeout.aborted && !opts.signal?.aborted) {
          err = new LLMError(entry.provider, `no response within ${Math.round(timeoutMs / 1000)} s`, { status: 504, retryable: false });
        }
        const a: Attempt = { provider: entry.provider, model: entry.model, ok: false, error: err.message, status: err.status, ms: Date.now() - t0 };
        state.attempts.push(a);
        failures.push(a);
        if (opts.signal?.aborted) throw err;
        // Retry once on retryable errors; long server-requested waits go straight to the next link instead.
        if (attempt === 1 && err.retryable && (err.retryAfterMs ?? 0) <= 8000) {
          await sleep(Math.min(err.retryAfterMs ?? 1500, 4000));
          continue;
        }
        break;
      }
    }
  }
  throw new AllProvidersFailedError(failures);
}

/** Human label for the trace, e.g. provider "gemini", model "gemini-3.8-flash". */
export function describeProviders(state: RouterState): { provider: string; model: string } {
  const ok = state.attempts.filter((a) => a.ok);
  const providers = [...new Set(ok.map((a) => a.provider))];
  const models = [...new Set(ok.map((a) => a.model))];
  return { provider: providers.join("→"), model: models.join(" → ") };
}
