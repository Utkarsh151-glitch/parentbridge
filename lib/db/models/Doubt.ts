import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { DOUBT_CATEGORIES } from "@/lib/constants";

const DoubtSchema = new Schema(
  {
    lead_id: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    agent_run_id: { type: Schema.Types.ObjectId, ref: "AgentRun", default: null },
    category: { type: String, enum: DOUBT_CATEGORIES, required: true },
    evidence_quote: { type: String, required: true },
    quote_verified: { type: Boolean, default: false }, // quote found verbatim (fuzzy) in the notes
    severity: { type: Number, min: 1, max: 3, required: true },
  },
  { timestamps: true }
);

export type DoubtDoc = InferSchemaType<typeof DoubtSchema> & { _id: Types.ObjectId };
export const Doubt = (models.Doubt as Model<DoubtDoc>) || model<DoubtDoc>("Doubt", DoubtSchema, "doubts");
