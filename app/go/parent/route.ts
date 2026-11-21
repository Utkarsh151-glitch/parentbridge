import { connection } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Booking, Lead, Match } from "@/lib/db/models";
import { newToken } from "@/lib/flow";

/**
 * Landing shortcut → a family's booking page. Reuses an open (unbooked) showcase booking,
 * or opens a fresh one for a showcase family the agent has already matched.
 */
export async function GET(req: Request) {
  await connection();
  await connectDB();
  const featured = await Lead.find({ featured: true }).select("_id").lean();
  const ids = featured.map((l) => l._id);
  const open = await Booking.findOne({ lead_id: { $in: ids }, status: "proposed" }).sort({ createdAt: -1 }).lean();
  if (open) return Response.redirect(new URL(`/b/${open.token}`, req.url), 307);

  const match = await Match.findOne({ lead_id: { $in: ids }, family_message: { $ne: null } }).sort({ createdAt: -1 }).lean();
  if (!match) return Response.redirect(new URL("/console?hint=run-first", req.url), 307);
  const fm = match.family_message as { language: string };
  const b = await Booking.create({
    lead_id: match.lead_id,
    ambassador_id: match.ambassador_id,
    match_id: match._id,
    token: newToken(),
    ambassador_token: newToken(),
    family_language: fm.language,
    status: "proposed",
  });
  return Response.redirect(new URL(`/b/${b.token}`, req.url), 307);
}
