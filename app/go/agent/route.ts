import { connection } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Lead } from "@/lib/db/models";

/** Landing shortcut → the Guntur showcase family (opens its saved run instantly, or starts one). */
export async function GET(req: Request) {
  await connection();
  await connectDB();
  const lead =
    (await Lead.findOne({ featured: true, pincode: "522002" }).select("_id").lean()) ??
    (await Lead.findOne({ featured: true }).select("_id").lean());
  const url = new URL(lead ? `/console/lead/${lead._id}?run=1` : "/console", req.url);
  return Response.redirect(url, 307);
}
