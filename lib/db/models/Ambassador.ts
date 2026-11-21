import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const AmbassadorSchema = new Schema(
  {
    code: { type: String, required: true }, // short handle the LLM uses, e.g. "amb_07"
    name: { type: String, required: true },
    child_name: { type: String, required: true },
    child_year: { type: Number, min: 1, max: 4, required: true },
    university: { type: String, required: true },
    campus_city: { type: String, required: true },
    district: { type: String, required: true }, // modern district name, e.g. "NTR (Vijayawada)"
    district_key: { type: String, required: true }, // canonical key shared with India Post names, e.g. "krishna"
    state: { type: String, required: true },
    languages: { type: [String], default: ["te"] }, // ISO codes, first = preferred
    phone: { type: String, required: true }, // fake in demo
    max_calls_per_week: { type: Number, default: 3 },
    calls_this_week: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    bio: { type: String, default: "" }, // short, first-person
    consent_given: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AmbassadorSchema.index({ code: 1 }, { unique: true });
AmbassadorSchema.index({ district: 1, languages: 1, active: 1 });
AmbassadorSchema.index({ district_key: 1, languages: 1, active: 1 });

export type AmbassadorDoc = InferSchemaType<typeof AmbassadorSchema> & { _id: Types.ObjectId };
export const Ambassador =
  (models.Ambassador as Model<AmbassadorDoc>) ||
  model<AmbassadorDoc>("Ambassador", AmbassadorSchema, "ambassadors");
