export type ProviderName = "gemini" | "groq";

export type JSONSchema = Record<string, unknown>;

export type ToolDef = {
  name: string;
  description: string;
  parameters: JSONSchema; // JSON Schema (object)
};

export type ToolCall = {
  id: string; // stable id we use internally
  providerId?: string; // id the provider gave us (Gemini may omit it)
  name: string;
  args: Record<string, unknown>;
};

export type ToolResult = { id: string; providerId?: string; name: string; result: unknown };

export type ChatMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content?: string;
      toolCalls?: ToolCall[];
      // Provider-native turn, replayed verbatim to the same provider (keeps Gemini thought signatures).
      raw?: { provider: ProviderName; data: unknown };
    }
  | { role: "tool"; results: ToolResult[] };

export type RunOptions = {
  system: string;
  toolChoice?: "auto" | "required";
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};

export type LLMResult = {
  text: string;
  toolCalls: ToolCall[];
  usage: { input: number; output: number };
  provider: ProviderName;
  model: string;
  finishReason?: string;
  raw?: unknown;
};

export interface LLMProvider {
  name: ProviderName;
  model: string;
  /** One model turn: given the conversation and the available tools, return text and/or tool calls. */
  runWithTools(messages: ChatMessage[], tools: ToolDef[], opts: RunOptions): Promise<LLMResult>;
}

export class LLMError extends Error {
  status?: number;
  retryable: boolean;
  provider: ProviderName;
  retryAfterMs?: number;
  constructor(
    provider: ProviderName,
    message: string,
    opts: { status?: number; retryable?: boolean; retryAfterMs?: number } = {}
  ) {
    super(message);
    this.name = "LLMError";
    this.provider = provider;
    this.status = opts.status;
    this.retryable = opts.retryable ?? false;
    this.retryAfterMs = opts.retryAfterMs;
  }
  get isRateLimit() {
    return this.status === 429;
  }
}
