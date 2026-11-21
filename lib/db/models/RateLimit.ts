import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

// Counters for public-demo guardrails. A TTL index deletes each counter after it expires.
const RateLimitSchema = new Schema({
  key: { type: String, required: true },
  count: { type: Number, default: 0 },
  last_at: { type: Date, default: null },
  expires_at: { type: Date, required: true },
});

RateLimitSchema.index({ key: 1 }, { unique: true });
RateLimitSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export type RateLimitDoc = InferSchemaType<typeof RateLimitSchema> & { _id: Types.ObjectId };
export const RateLimit =
  (models.RateLimit as Model<RateLimitDoc>) || model<RateLimitDoc>("RateLimit", RateLimitSchema, "rate_limits");
