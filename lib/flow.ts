import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Ambassador, Booking, Call, CreditLedger, Event, Lead, Match, type LeadDoc } from "@/lib/db/models";
import { BOOKING_PLACEHOLDER, CREDIT_PER_CALL_INR, type EventType } from "@/lib/constants";
import { deliver } from "@/lib/whatsapp/deliver";
import { formatSlot, waText } from "@/lib/i18n";
import { runSummariseAgent } from "@/lib/agent/summariseAgent";

export class FlowError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function baseUrlFrom(req: Request): string {
  const env = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const fromReq = host ? `${proto}://${host}` : null;
  // Prefer the real public origin; fall back to APP_BASE_URL.
  if (fromReq && !/localhost|127\.0\.0\.1/.test(fromReq)) return fromReq;
  return env || fromReq || "http://localhost:3000";
}

const token = () => randomBytes(9).toString("base64url");
const firstName = (n: string) => n.split(" ")[0];

/** Record a real funnel event once per lead/type; a real flow supersedes that family's simulated data. */
export async function recordEvent(lead: Pick<LeadDoc, "_id" | "arm">, type: EventType) {
  const hadSim = await Event.exists({ lead_id: lead._id, simulated: true });
  if (hadSim) {
    await Event.deleteMany({ lead_id: lead._id, simulated: true });
    const simCalls = await Call.find({ lead_id: lead._id, simulated: true }).select("_id").lean();
    await CreditLedger.deleteMany({ call_id: { $in: simCalls.map((c) => c._id) } });
    await Call.deleteMany({ lead_id: lead._id, simulated: true });
  }
  await Event.updateOne(
    { lead_id: lead._id, type, simulated: false },
    { $setOnInsert: { at: new Date(), arm: lead.arm } },
    { upsert: true }
  );
}

/** Six slots over the next 48 hours at family-friendly IST times. */
export function proposeSlots(now = new Date()): Date[] {
  const IST = 5.5 * 3600_000;
  const times = [
    [10, 30],
    [13, 0],
    [17, 30],
    [19, 30],
  ];
  const earliest = now.getTime() + 2 * 3600_000;
  const latest = now.getTime() + 48 * 3600_000;
  const out: Date[] = [];
  const istNow = new Date(now.getTime() + IST);
  for (let d = 0; d < 3 && out.length < 6; d++) {
    for (const [h, m] of times) {
      const t = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + d, h, m) - IST;
      if (t >= earliest && t <= latest && out.length < 6) out.push(new Date(t));
    }
  }
  return out;
}

async function latestMatch(leadId: Types.ObjectId | string) {
  return Match.findOne({ lead_id: leadId, family_message: { $ne: null } }).sort({ createdAt: -1 });
}

/** Counsellor clicks "Send WhatsApp": create the booking link and send the agent's offer. */
export async function sendOffer(leadId: string, baseUrl: string) {
  await connectDB();
  const lead = await Lead.findById(leadId).lean<LeadDoc>();
  if (!lead) throw new FlowError("Lead not found", 404);
  if (lead.arm !== "treatment") throw new FlowError("Control-arm families get business-as-usual follow-up only.", 409);
  const match = await latestMatch(lead._id);
  if (!match) throw new FlowError("Run the agent first.", 409);
  const fm = match.family_message as { language: string; body: string };

  let booking = await Booking.findOne({ lead_id: lead._id, match_id: match._id, status: { $in: ["proposed", "confirmed"] } });
  if (!booking) {
    booking = await Booking.create({
      lead_id: lead._id,
      ambassador_id: match.ambassador_id,
      match_id: match._id,
      token: token(),
      ambassador_token: token(),
      family_language: fm.language,
      status: "proposed",
    });
  } else if (booking.status === "proposed" && booking.family_language !== fm.language) {
    booking.family_language = fm.language;
    await booking.save();
  }
  const link = `${baseUrl}/b/${booking.token}`;
  const msg = await deliver({
    leadId: lead._id,
    ambassadorId: match.ambassador_id,
    bookingId: booking._id,
    audience: "family",
    kind: "offer",
    language: fm.language,
    body: fm.body.replaceAll(BOOKING_PLACEHOLDER, link),
    consent: !!lead.consent_whatsapp,
    baseUrl,
  });
  if (lead.consent_whatsapp) {
    if (lead.status === "counselled" || lead.status === "no_response") await Lead.updateOne({ _id: lead._id }, { $set: { status: "offered" } });
    await recordEvent(lead, "offered");
  }
  return { message: msg.toObject(), booking: booking.toObject(), links: { family: link, ambassador: `${baseUrl}/a/${booking.ambassador_token}` } };
}

/** Family confirms a slot on /b/[token]. */
export async function confirmBooking(opts: { token: string; slot: string; consent: boolean; language?: string; baseUrl: string }) {
  await connectDB();
  if (!opts.consent) throw new FlowError("Consent is required to book the call.");
  const booking = await Booking.findOne({ token: opts.token });
  if (!booking) throw new FlowError("Booking not found", 404);
  if (booking.status === "cancelled") throw new FlowError("This booking is no longer active.", 409);
  if (booking.status !== "proposed") return { booking: booking.toObject(), already: true };
  const slot = new Date(opts.slot);
  const now = Date.now();
  if (Number.isNaN(slot.getTime()) || slot.getTime() < now || slot.getTime() > now + 50 * 3600_000) {
    throw new FlowError("Please pick one of the offered times.");
  }
  const [lead, amb] = await Promise.all([Lead.findById(booking.lead_id).lean<LeadDoc>(), Ambassador.findById(booking.ambassador_id).lean()]);
  if (!lead || !amb) throw new FlowError("Booking is incomplete", 409);

  booking.slot_start = slot;
  booking.status = "confirmed";
  booking.recording_consent = true;
  booking.confirmed_at = new Date();
  booking.meet_link = `https://meet.jit.si/ParentBridge-${booking.token.replace(/[^A-Za-z0-9]/g, "")}`;
  if (opts.language) booking.family_language = opts.language;
  await booking.save();
  await Ambassador.updateOne({ _id: amb._id }, { $inc: { calls_this_week: 1 } });
  await Lead.updateOne({ _id: lead._id, status: { $in: ["counselled", "offered", "no_response"] } }, { $set: { status: "call_booked" } });
  await recordEvent(lead, "accepted");

  const famLang = booking.family_language || lead.language;
  const ambLang = amb.languages[0] ?? "en";
  const familyMsg = await deliver({
    leadId: lead._id,
    ambassadorId: amb._id,
    bookingId: booking._id,
    audience: "family",
    kind: "booking_confirmation",
    language: famLang,
    body: waText("familyConfirm", famLang, { amb: firstName(amb.name), time: formatSlot(slot, famLang), link: booking.meet_link }),
    consent: !!lead.consent_whatsapp,
    baseUrl: opts.baseUrl,
  });
  const ambMsg = await deliver({
    leadId: lead._id,
    ambassadorId: amb._id,
    bookingId: booking._id,
    audience: "ambassador",
    kind: "booking_confirmation",
    language: ambLang,
    body: waText("ambassadorConfirm", ambLang, {
      family: firstName(lead.student_name),
      district: lead.district,
      time: formatSlot(slot, ambLang),
      alink: `${opts.baseUrl}/a/${booking.ambassador_token}`,
      link: booking.meet_link,
    }),
    consent: !!amb.consent_given,
    baseUrl: opts.baseUrl,
  });
  return { booking: booking.toObject(), messages: [familyMsg.toObject(), ambMsg.toObject()], already: false };
}

export async function sendReminder(bookingId: string, baseUrl: string) {
  await connectDB();
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== "confirmed" || !booking.slot_start) throw new FlowError("Only confirmed bookings get reminders.", 409);
  const [lead, amb] = await Promise.all([Lead.findById(booking.lead_id).lean<LeadDoc>(), Ambassador.findById(booking.ambassador_id).lean()]);
  if (!lead || !amb) throw new FlowError("Booking is incomplete", 409);
  const lang = booking.family_language || lead.language;
  const msg = await deliver({
    leadId: lead._id,
    ambassadorId: amb._id,
    bookingId: booking._id,
    audience: "family",
    kind: "reminder",
    language: lang,
    body: waText("reminder", lang, { amb: firstName(amb.name), time: formatSlot(booking.slot_start, lang), link: booking.meet_link }),
    consent: !!lead.consent_whatsapp,
    baseUrl,
  });
  return msg.toObject();
}

/** parent ambassador marks the call done on /a/[token]: credit, AI summary, rating request. */
export async function completeCall(opts: { ambassadorToken: string; notes: string; durationMin?: number; baseUrl: string; ipHash?: string }) {
  await connectDB();
  const notes = opts.notes.trim();
  if (notes.length < 20) throw new FlowError("Please add a few lines of notes about the call (at least 20 characters).");
  if (notes.length > 6000) throw new FlowError("Notes are too long (max 6,000 characters).");
  const booking = await Booking.findOne({ ambassador_token: opts.ambassadorToken });
  if (!booking) throw new FlowError("Booking not found", 404);
  if (!["confirmed", "completed"].includes(booking.status)) throw new FlowError("The family hasn't booked a slot yet.", 409);
  const [lead, amb] = await Promise.all([Lead.findById(booking.lead_id).lean<LeadDoc>(), Ambassador.findById(booking.ambassador_id).lean()]);
  if (!lead || !amb) throw new FlowError("Booking is incomplete", 409);

  let call = await Call.findOne({ booking_id: booking._id, simulated: false });
  const firstTime = !call;
  if (!call) {
    call = await Call.create({
      booking_id: booking._id,
      lead_id: lead._id,
      ambassador_id: amb._id,
      ambassador_notes: notes,
      duration_min: opts.durationMin ?? 20,
    });
  } else {
    call.ambassador_notes = notes;
    if (opts.durationMin) call.duration_min = opts.durationMin;
    call.summary_status = "pending";
    await call.save();
  }

  // ₹1,500 per completed call — unique index on call_id makes this idempotent.
  await CreditLedger.updateOne(
    { call_id: call._id },
    { $setOnInsert: { ambassador_id: amb._id, amount_inr: CREDIT_PER_CALL_INR, reason: "Completed parent call", simulated: false } },
    { upsert: true }
  );
  if (booking.status !== "completed") {
    booking.status = "completed";
    await booking.save();
  }
  await Lead.updateOne({ _id: lead._id, status: { $in: ["counselled", "offered", "call_booked", "no_response"] } }, { $set: { status: "call_done" } });
  await recordEvent(lead, "call_done");

  const summary = await runSummariseAgent({ callId: String(call._id), ipHash: opts.ipHash });

  let ratingMsg = null;
  if (firstTime) {
    const lang = booking.family_language || lead.language;
    ratingMsg = (
      await deliver({
        leadId: lead._id,
        ambassadorId: amb._id,
        bookingId: booking._id,
        audience: "family",
        kind: "rating_request",
        language: lang,
        body: waText("ratingRequest", lang, { amb: firstName(amb.name) }),
        consent: !!lead.consent_whatsapp,
        baseUrl: opts.baseUrl,
      })
    ).toObject();
  }
  const fresh = await Call.findById(call._id).lean();
  return { call: fresh, summary, credit_inr: CREDIT_PER_CALL_INR, rating_message: ratingMsg };
}

export async function retrySummary(callId: string, ipHash?: string) {
  await connectDB();
  return runSummariseAgent({ callId, ipHash });
}

/** Family rates trust 1–5 (web fallback for the WhatsApp reply). */
export async function rateCall(bookingToken: string, rating: number) {
  await connectDB();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new FlowError("Rating must be 1–5");
  const booking = await Booking.findOne({ token: bookingToken }).lean();
  if (!booking) throw new FlowError("Booking not found", 404);
  const call = await Call.findOneAndUpdate({ booking_id: booking._id, simulated: false }, { $set: { trust_rating: rating } }, { returnDocument: "after" });
  if (!call) throw new FlowError("The call hasn't happened yet.", 409);
  return { ok: true, rating };
}

/** Counsellor records the outcome for the experiment. */
export async function setOutcome(leadId: string, outcome: "seat_reserved" | "withdrawn") {
  await connectDB();
  const lead = await Lead.findById(leadId).lean<LeadDoc>();
  if (!lead) throw new FlowError("Lead not found", 404);
  if (outcome === "seat_reserved") {
    await Lead.updateOne({ _id: lead._id }, { $set: { status: "seat_reserved" } });
    await recordEvent(lead, "seat_reserved");
  } else {
    const hadSeat = await Event.exists({ lead_id: lead._id, type: "seat_reserved", simulated: false });
    await Lead.updateOne({ _id: lead._id }, { $set: { status: "withdrawn" } });
    if (hadSeat) await recordEvent(lead, "withdrawn_30d");
  }
  return { ok: true };
}

export { token as newToken };
