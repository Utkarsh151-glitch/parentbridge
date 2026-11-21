import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

// Fallback cache for the India Post PIN code API.
const PincodeDistrictSchema = new Schema(
  {
    pincode: { type: String, required: true },
    district: { type: String, required: true }, // display name, e.g. "Rangareddy"
    postal_district: { type: String, default: "" }, // raw India Post name, e.g. "K.V.Rangareddy"
    district_key: { type: String, required: true },
    state: { type: String, required: true },
    office: { type: String, default: "" },
  },
  { timestamps: true }
);

PincodeDistrictSchema.index({ pincode: 1 }, { unique: true });

export type PincodeDistrictDoc = InferSchemaType<typeof PincodeDistrictSchema> & { _id: Types.ObjectId };
export const PincodeDistrict =
  (models.PincodeDistrict as Model<PincodeDistrictDoc>) ||
  model<PincodeDistrictDoc>("PincodeDistrict", PincodeDistrictSchema, "pincode_district");
