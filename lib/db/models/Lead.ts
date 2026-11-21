import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { LEAD_STATUSES } from "@/lib/constants";

const LeadSchema = new Schema(
  {
    student_name: { type: String, required: true },
    parent_name: { type: String, required: true },
    parent_phone: { type: String, required: true }, // fake in demo
    pincode: { type: String, required: true },
    district: { type: String, default: "" }, // filled from India Post (or cache)
    district_key: { type: String, default: "" },
    state: { type: String, default: "" },
    language: { type: String, default: "te" },
    preferred_university: { type: String, default: "" },
    fee_band: { type: String, enum: ["low", "mid", "high"], default: "mid" },
    counselling_date: { type: Date, required: true },
    counselling_notes: { type: String, required: true },
    status: { type: String, enum: LEAD_STATUSES, default: "counselled" },
    arm: { type: String, enum: ["treatment", "control"], required: true }, // set at insert
    consent_whatsapp: { type: Boolean, default: false },
    // demo bookkeeping
    source: { type: String, enum: ["seed", "manual"], default: "seed" },
    in_experiment: { type: Boolean, default: true }, // manual leads are not randomised → excluded
    featured: { type: Boolean, default: false },
    last_match_run_id: { type: Schema.Types.ObjectId, ref: "AgentRun", default: null },
  },
  { timestamps: true }
);

LeadSchema.index({ status: 1 });
LeadSchema.index({ arm: 1 });
LeadSchema.index({ district: 1 });
LeadSchema.index({ arm: 1, featured: -1, counselling_date: 1 });

export type LeadDoc = InferSchemaType<typeof LeadSchema> & { _id: Types.ObjectId };
export const Lead = (models.Lead as Model<LeadDoc>) || model<LeadDoc>("Lead", LeadSchema, "leads");
