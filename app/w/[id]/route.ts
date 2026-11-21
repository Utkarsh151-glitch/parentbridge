import { connection } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Message } from "@/lib/db/models";

/**
 * Short link for the preview fallback: /w/<messageId> → wa.me with the exact message pre-filled.
 * Keeps the QR code small (a full Telugu message would not fit in a scannable QR).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) return new Response("Not found", { status: 404 });
  await connectDB();
  const m = await Message.findById(id).select("wa_link direction").lean();
  if (!m?.wa_link || m.direction !== "outbound") return new Response("Not found", { status: 404 });
  return Response.redirect(m.wa_link, 302);
}
