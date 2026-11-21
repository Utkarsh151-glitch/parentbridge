import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const MatchSchema = new Schema(
  {
    lead_id: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    ambassador_id: { type: Schema.Types.ObjectId, ref: "Ambassador", required: true },
    score: { type: Number, required: true },
    reasons: { type: Schema.Types.Mixed, default: [] }, // string[]
    agent_run_id: { type: Schema.Types.ObjectId, ref: "AgentRun", default: null },
    // Outputs the agent produced for this match (latest versions)
    brief: { type: Schema.Types.Mixed, default: null }, // { language, native, english }
    family_message: { type: Schema.Types.Mixed, default: null }, // { language, body } — current draft
    family_message_variants: { type: Schema.Types.Mixed, default: {} }, // { [lang]: { body, at } } cache for language switching
  },
  { timestamps: true }
);

export type MatchDoc = InferSchemaType<typeof MatchSchema> & { _id: Types.ObjectId };
export const Match = (models.Match as Model<MatchDoc>) || model<MatchDoc>("Match", MatchSchema, "matches");
