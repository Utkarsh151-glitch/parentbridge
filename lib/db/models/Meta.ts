import { Schema, model, models, type Model } from "mongoose";

// Small key/value store for app-level state (e.g. the last simulation run).
const MetaSchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);
MetaSchema.index({ key: 1 }, { unique: true });

export type MetaDoc = { key: string; value: unknown };
export const Meta = (models.Meta as Model<MetaDoc>) || model<MetaDoc>("Meta", MetaSchema, "meta");
