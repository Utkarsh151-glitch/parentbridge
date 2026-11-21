import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const MessageSchema = new Schema(
  {
    lead_id: { type: Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    ambassador_id: { type: Schema.Types.ObjectId, ref: "Ambassador", default: null },
    booking_id: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    direction: { type: String, enum: ["outbound", "inbound"], required: true },
    audience: { type: String, enum: ["family", "ambassador"], default: "family" },
    kind: {
      type: String,
      enum: ["offer", "booking_confirmation", "reminder", "rating_request", "inbound"],
      default: "offer",
    },
    channel: { type: String, enum: ["whatsapp", "preview"], required: true },
    language: { type: String, default: "te" },
    body: { type: String, required: true },
    to_masked: { type: String, default: "" },
    wa_link: { type: String, default: "" }, // https://wa.me/?text=... for the preview fallback
    twilio_sid: { type: String, default: null },
    status: { type: String, default: "preview" }, // queued | sent | delivered | preview | failed | received
    fallback_reason: { type: String, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ direction: 1, createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof MessageSchema> & { _id: Types.ObjectId };
export const Message =
  (models.Message as Model<MessageDoc>) || model<MessageDoc>("Message", MessageSchema, "messages");
