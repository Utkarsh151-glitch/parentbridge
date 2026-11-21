import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { EVENT_TYPES } from "@/lib/constants";

const EventSchema = new Schema(
  {
    lead_id: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    at: { type: Date, default: () => new Date() },
    simulated: { type: Boolean, default: false },
    arm: { type: String, enum: ["treatment", "control"] }, // denormalised for fast aggregation
  },
  { timestamps: true }
);

EventSchema.index({ lead_id: 1, type: 1 });
EventSchema.index({ simulated: 1 });

export type EventDoc = InferSchemaType<typeof EventSchema> & { _id: Types.ObjectId };
export const Event = (models.Event as Model<EventDoc>) || model<EventDoc>("Event", EventSchema, "events");
