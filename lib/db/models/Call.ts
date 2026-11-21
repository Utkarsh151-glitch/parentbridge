import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const CallSchema = new Schema(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    lead_id: { type: Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    ambassador_id: { type: Schema.Types.ObjectId, ref: "Ambassador", default: null, index: true },
    ambassador_notes: { type: String, default: "" },
    // { doubts_resolved[], doubts_remaining[], family_sentiment, next_best_action, red_flags[] }
    ai_summary: { type: Schema.Types.Mixed, default: null },
    summary_status: { type: String, enum: ["pending", "done", "error"], default: "pending" },
    trust_rating: { type: Number, min: 1, max: 5, default: null }, // from the family
    duration_min: { type: Number, default: 20 },
    agent_run_id: { type: Schema.Types.ObjectId, ref: "AgentRun", default: null },
    simulated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type CallDoc = InferSchemaType<typeof CallSchema> & { _id: Types.ObjectId };
export const Call = (models.Call as Model<CallDoc>) || model<CallDoc>("Call", CallSchema, "calls");
