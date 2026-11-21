import type { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Booking, Call, Lead, Message } from "@/lib/db/models";
import { demoRecipient, twiml, validTwilioSignature } from "@/lib/whatsapp/twilio";

/**
 * Inbound WhatsApp (Twilio sandbox webhook).
 *  - "STOP" → consent_whatsapp=false for that family (DPDP opt-out). "START" re-subscribes.
 *  - "1".."5" → the family's trust rating for their most recent call.
 * The demo phone stands in for synthetic families, so it maps to the family most recently messaged.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  const sig = req.headers.get("x-twilio-signature");
  const url = new URL(req.url);
  const candidates = [
    req.url,
    `${process.env.APP_BASE_URL?.replace(/\/$/, "")}${url.pathname}`,
    `https://${req.headers.get("x-forwarded-host") ?? url.host}${url.pathname}`,
  ];
  if (!candidates.some((u) => validTwilioSignature(u, params, sig))) {
    return new Response("Invalid Twilio signature", { status: 403 });
  }

  await connectDB();
  const from = params.From ?? "";
  const text = (params.Body ?? "").trim();
  const isDemo = from === demoRecipient();

  // Which family is this? Real number match first, then the demo-phone mapping.
  const byPhone = await Lead.findOne({ parent_phone: from.replace(/^whatsapp:/, "") }).select("_id").lean();
  let lead: { _id: Types.ObjectId } | null = byPhone ? { _id: byPhone._id } : null;
  if (!lead && isDemo) {
    const last = await Message.findOne({ direction: "outbound", audience: "family" }).sort({ createdAt: -1 }).select("lead_id").lean();
    if (last?.lead_id) lead = { _id: last.lead_id };
  }

  await Message.create({
    lead_id: lead?._id ?? null,
    direction: "inbound",
    kind: "inbound",
    channel: "whatsapp",
    body: text.slice(0, 1000) || "(empty)",
    to_masked: "",
    twilio_sid: params.MessageSid ?? null,
    status: "received",
  });

  const upper = text.toUpperCase();
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(upper)) {
    if (lead) await Lead.updateOne({ _id: lead._id }, { $set: { consent_whatsapp: false } });
    return twiml("You're opted out of ParentBridge messages. Reply START to opt back in.");
  }
  if (upper === "START") {
    if (lead) await Lead.updateOne({ _id: lead._id }, { $set: { consent_whatsapp: true } });
    return twiml("You're opted back in to ParentBridge messages. Reply STOP any time to opt out.");
  }
  if (/^[1-5]$/.test(text) && lead) {
    const booking = await Booking.findOne({ lead_id: lead._id, status: "completed" }).sort({ updatedAt: -1 }).select("_id").lean();
    const call = booking ? await Call.findOneAndUpdate({ booking_id: booking._id, simulated: false }, { $set: { trust_rating: Number(text) } }) : null;
    if (call) return twiml(`🙏 Thank you! Trust rating ${text}/5 recorded.`);
  }
  return twiml();
}
