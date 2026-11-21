import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

// ₹1,500 fee credit per *completed call* — never per sale.
const CreditLedgerSchema = new Schema(
  {
    ambassador_id: { type: Schema.Types.ObjectId, ref: "Ambassador", required: true, index: true },
    call_id: { type: Schema.Types.ObjectId, ref: "Call", required: true },
    amount_inr: { type: Number, default: 1500 },
    reason: { type: String, default: "Completed parent call" },
    simulated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CreditLedgerSchema.index({ call_id: 1 }, { unique: true }); // one credit per call, idempotent

export type CreditLedgerDoc = InferSchemaType<typeof CreditLedgerSchema> & { _id: Types.ObjectId };
export const CreditLedger =
  (models.CreditLedger as Model<CreditLedgerDoc>) ||
  model<CreditLedgerDoc>("CreditLedger", CreditLedgerSchema, "credit_ledger");
