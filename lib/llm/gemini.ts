import { GoogleGenAI, FunctionCallingConfigMode, ThinkingLevel, type Content, type Part } from "@google/genai";
import { LLMError, type ChatMessage, type LLMProvider, type LLMResult, type ToolDef } from "./types";

function toContents(messages: ChatMessage[]): Content[] {
  const out: Content[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", parts: [{ text: m.content }] });
    } else if (m.role === "assistant") {
      if (m.raw?.provider === "gemini" && m.raw.data) {
        out.push(m.raw.data as Content); // verbatim, keeps thoughtSignature parts
        continue;
      }
      const parts: Part[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const c of m.toolCalls ?? []) parts.push({ functionCall: { name: c.name, args: c.args } });
      if (parts.length) out.push({ role: "model", parts });
    } else {
      out.push({
        role: "user",
        parts: m.results.map((r) => ({
          functionResponse: {
            ...(r.providerId ? { id: r.providerId } : {}),
            name: r.name,
            response:
              r.result && typeof r.result === "object" && !Array.isArray(r.result)
                ? (r.result as Record<string, unknown>)
                : { result: r.result },
          },
        })),
      });
    }
  }
  return out;
}

function thinkingConfig(model: string) {
  // Keep reasoning short: it costs free-tier tokens and latency.
  if (/gemini-3/.test(model)) return { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };
  if (/gemini-2\.5-flash/.test(model)) return { thinkingConfig: { thinkingBudget: 1024 } };
  return {};
}

export function geminiProvider(model = process.env.LLM_MODEL || "gemini-3.5-flash-lite"): LLMProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LLMError("gemini", "GEMINI_API_KEY is not set", { status: 401 });
  // attempts: 1 → no silent SDK retries (it would otherwise back off up to 5× on 429s);
  // our router decides when to retry and when to fall back to Groq.
  const ai = new GoogleGenAI({ apiKey, httpOptions: { retryOptions: { attempts: 1 } } });

  return {
    name: "gemini",
    model,
    async runWithTools(messages, tools: ToolDef[], opts): Promise<LLMResult> {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: toContents(messages),
          config: {
            systemInstruction: opts.system,
            temperature: opts.temperature ?? 0.3,
            maxOutputTokens: opts.maxOutputTokens ?? 8192,
            abortSignal: opts.signal,
            ...thinkingConfig(model),
            ...(tools.length
              ? {
                  tools: [
                    {
                      functionDeclarations: tools.map((t) => ({
                        name: t.name,
                        description: t.description,
                        parametersJsonSchema: t.parameters,
                      })),
                    },
                  ],
                  toolConfig: {
                    functionCallingConfig: {
                      mode:
                        opts.toolChoice === "required" ? FunctionCallingConfigMode.ANY : FunctionCallingConfigMode.AUTO,
                    },
                  },
                }
              : {}),
          },
        });
        const cand = res.candidates?.[0];
        const parts = cand?.content?.parts ?? [];
        const toolCalls = parts
          .filter((p) => p.functionCall?.name)
          .map((p, i) => ({
            id: p.functionCall!.id || `g${Date.now().toString(36)}_${i}`,
            providerId: p.functionCall!.id || undefined,
            name: p.functionCall!.name!,
            args: (p.functionCall!.args ?? {}) as Record<string, unknown>,
          }));
        const text = parts
          .filter((p) => typeof p.text === "string" && !p.thought)
          .map((p) => p.text)
          .join("")
          .trim();
        if (!toolCalls.length && !text) {
          throw new LLMError("gemini", `Empty response (finishReason: ${cand?.finishReason ?? "unknown"})`, {
            retryable: true,
            status: 502,
          });
        }
        const u = res.usageMetadata;
        return {
          text,
          toolCalls,
          usage: {
            input: u?.promptTokenCount ?? 0,
            output: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
          },
          provider: "gemini",
          model: res.modelVersion || model,
          finishReason: cand?.finishReason,
          raw: cand?.content,
        };
      } catch (e) {
        if (e instanceof LLMError) throw e;
        const status = (e as { status?: number }).status;
        const msg = e instanceof Error ? e.message : String(e);
        const retryMatch = /retry in ([\d.]+)s/i.exec(msg) || /"retryDelay":\s*"(\d+)s"/.exec(msg);
        throw new LLMError("gemini", shorten(msg), {
          status,
          retryable: status === 429 || status === 500 || status === 503 || status === 504,
          retryAfterMs: retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) : undefined,
        });
      }
    },
  };
}

function shorten(msg: string) {
  // Gemini errors embed a large JSON blob; keep the human part.
  const m = /"message":\s*"([^"]+)"/.exec(msg);
  return (m ? m[1] : msg).slice(0, 400);
}
