import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const AgentRunSchema = new Schema(
  {
    lead_id: { type: Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    call_id: { type: Schema.Types.ObjectId, ref: "Call", default: null },
    kind: { type: String, enum: ["match", "summarise", "regenerate"], required: true },
    status: { type: String, enum: ["running", "done", "error"], default: "running" },
    provider: { type: String, default: "" }, // provider(s) that answered, e.g. "gemini" or "gemini→groq"
    model: { type: String, default: "" },
    input_tokens: { type: Number, default: 0 },
    output_tokens: { type: Number, default: 0 },
    llm_calls: { type: Number, default: 0 },
    steps: { type: [Schema.Types.Mixed], default: [] }, // every tool call: { i, tool, args, result, ok, ms, ... }
    final_output: { type: Schema.Types.Mixed, default: null },
    duration_ms: { type: Number, default: 0 },
    error: { type: String, default: null },
    ip_hash: { type: String, default: null },
  },
  { timestamps: true }
);

AgentRunSchema.index({ lead_id: 1, kind: 1, createdAt: -1 });

export type AgentRunDoc = InferSchemaType<typeof AgentRunSchema> & { _id: Types.ObjectId };
export const AgentRun =
  (models.AgentRun as Model<AgentRunDoc>) || model<AgentRunDoc>("AgentRun", AgentRunSchema, "agent_runs");
