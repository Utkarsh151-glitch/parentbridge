import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const BookingSchema = new Schema(
  {
    lead_id: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    ambassador_id: { type: Schema.Types.ObjectId, ref: "Ambassador", required: true },
    match_id: { type: Schema.Types.ObjectId, ref: "Match", default: null },
    slot_start: { type: Date, default: null },
    meet_link: { type: String, default: "" },
    status: {
      type: String,
      enum: ["proposed", "confirmed", "completed", "no_show", "cancelled"],
      default: "proposed",
    },
    token: { type: String, required: true }, // family's public link /b/[token]
    ambassador_token: { type: String, required: true }, // parent ambassador's link /a/[token]
    family_language: { type: String, default: "te" },
    recording_consent: { type: Boolean, default: false },
    confirmed_at: { type: Date, default: null },
  },
  { timestamps: true }
);

BookingSchema.index({ token: 1 }, { unique: true });
BookingSchema.index({ ambassador_token: 1 }, { unique: true });

export type BookingDoc = InferSchemaType<typeof BookingSchema> & { _id: Types.ObjectId };
export const Booking =
  (models.Booking as Model<BookingDoc>) || model<BookingDoc>("Booking", BookingSchema, "bookings");
