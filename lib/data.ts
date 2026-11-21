import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AgentRun, Ambassador, Booking, Call, CreditLedger, Doubt, Lead, Match, Message, type LeadDoc } from "@/lib/db/models";
import { LEAD_STATUSES } from "@/lib/constants";

/** Mongo docs → plain JSON for Client Components. */
export function plain<T>(x: unknown): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

export type ConsoleFilters = { district?: string; language?: string; status?: string; q?: string; saved?: string; page?: number };

export async function getConsoleLeads(f: ConsoleFilters) {
  await connectDB();
  const PAGE = 30;
  const where: Record<string, unknown> = { arm: "treatment" };
  if (f.district) where.district = f.district;
  if (f.language) where.language = f.language;
  if (f.status && (LEAD_STATUSES as readonly string[]).includes(f.status)) where.status = f.status;
  if (f.saved === "1") where.last_match_run_id = { $ne: null };
  if (f.q) {
    const rx = new RegExp(f.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    where.$or = [{ student_name: rx }, { parent_name: rx }, { pincode: rx }];
  }
  const page = Math.max(1, f.page ?? 1);
  const [rows, total, districts, languages] = await Promise.all([
    Lead.find(where)
      .sort({ source: -1, featured: -1, last_match_run_id: -1, counselling_date: 1 })
      .skip((page - 1) * PAGE)
      .limit(PAGE)
      .select("student_name parent_name pincode district state language preferred_university status counselling_date featured source in_experiment last_match_run_id consent_whatsapp createdAt")
      .lean(),
    Lead.countDocuments(where),
    Lead.distinct("district", { arm: "treatment" }),
    Lead.distinct("language", { arm: "treatment" }),
  ]);
  return plain<{
    rows: Array<LeadDoc & { _id: string }>;
    total: number;
    page: number;
    pages: number;
    districts: string[];
    languages: string[];
  }>({ rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE)), districts: districts.filter(Boolean).sort(), languages: languages.sort() });
}

export async function getLeadView(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const lead = await Lead.findById(id).lean();
  if (!lead) return null;
  const run = await AgentRun.findOne({ lead_id: lead._id, kind: "match" }).sort({ createdAt: -1 }).lean();
  // Latest *successful* run (shown when the newest one failed)
  const lastGood =
    run && run.status !== "done" ? await AgentRun.findOne({ lead_id: lead._id, kind: "match", status: "done" }).sort({ createdAt: -1 }).lean() : run;
  const match = lastGood ? await Match.findOne({ agent_run_id: lastGood._id }).lean() : null;
  const [ambassador, messages, booking, doubts] = await Promise.all([
    match ? Ambassador.findById(match.ambassador_id).select("-phone").lean() : null,
    Message.find({ lead_id: lead._id }).sort({ createdAt: -1 }).limit(20).lean(),
    Booking.findOne({ lead_id: lead._id }).sort({ createdAt: -1 }).lean(),
    Doubt.find({ lead_id: lead._id }).lean(),
  ]);
  const call = booking ? await Call.findOne({ booking_id: booking._id, simulated: false }).lean() : null;
  // Other candidates' public details for the "other candidates" list
  const final = lastGood?.final_output as { match?: { other_candidates?: Array<{ ambassador_id: string }> } } | null;
  const codes = final?.match?.other_candidates?.map((c) => c.ambassador_id) ?? [];
  const others = codes.length ? await Ambassador.find({ code: { $in: codes } }).select("code name district child_year university campus_city languages").lean() : [];
  const { parent_phone: _omit, ...safeLead } = lead;
  void _omit;
  return plain<{
    lead: Omit<LeadDoc, "parent_phone"> & { _id: string };
    run: Record<string, unknown> | null;
    lastGood: Record<string, unknown> | null;
    match: Record<string, unknown> | null;
    ambassador: Record<string, unknown> | null;
    others: Array<Record<string, unknown>>;
    messages: Array<Record<string, unknown>>;
    booking: Record<string, unknown> | null;
    call: Record<string, unknown> | null;
    doubts: Array<Record<string, unknown>>;
  }>({ lead: safeLead, run, lastGood, match, ambassador, others, messages, booking, call, doubts });
}

export async function getBookingView(token: string) {
  await connectDB();
  const booking = await Booking.findOne({ token }).lean();
  if (!booking) return null;
  const [lead, amb, call, offer, match] = await Promise.all([
    Lead.findById(booking.lead_id).select("student_name parent_name language district").lean(),
    Ambassador.findById(booking.ambassador_id).select("name child_year university campus_city district languages").lean(),
    Call.findOne({ booking_id: booking._id, simulated: false }).select("trust_rating createdAt").lean(),
    Message.findOne({ booking_id: booking._id, kind: "offer" }).sort({ createdAt: -1 }).select("body language").lean(),
    booking.match_id ? Match.findById(booking.match_id).select("family_message").lean() : null,
  ]);
  if (!lead || !amb) return null;
  const fm = match?.family_message as { body: string; language: string } | null;
  return plain<{
    booking: { token: string; status: string; slot_start: string | null; meet_link: string; family_language: string };
    lead: { student_name: string; parent_name: string; language: string; district: string };
    amb: { first_name: string; child_year: number; university: string; campus_city: string; district: string };
    call: { trust_rating: number | null } | null;
    offer: { body: string; language: string } | null;
  }>({
    offer: offer ? { body: offer.body, language: offer.language } : fm ? { body: fm.body.replaceAll("{{BOOKING_LINK}}", "(this page)"), language: fm.language } : null,
    booking: { token: booking.token, status: booking.status, slot_start: booking.slot_start, meet_link: booking.meet_link, family_language: booking.family_language },
    lead: { student_name: lead.student_name, parent_name: lead.parent_name, language: lead.language, district: lead.district },
    // first name only — never the parent ambassador's phone number
    amb: { first_name: amb.name.split(" ")[0], child_year: amb.child_year, university: amb.university, campus_city: amb.campus_city, district: amb.district },
    call: call ? { trust_rating: call.trust_rating ?? null } : null,
  });
}

export async function getAmbassadorView(token: string) {
  await connectDB();
  const booking = await Booking.findOne({ ambassador_token: token }).lean();
  if (!booking) return null;
  const [lead, amb, match, call] = await Promise.all([
    Lead.findById(booking.lead_id).select("student_name parent_name language district state preferred_university").lean(),
    Ambassador.findById(booking.ambassador_id).select("-phone").lean(),
    booking.match_id ? Match.findById(booking.match_id).select("brief score reasons").lean() : null,
    Call.findOne({ booking_id: booking._id, simulated: false }).lean(),
  ]);
  if (!lead || !amb) return null;
  const credits = await CreditLedger.aggregate([
    { $match: { ambassador_id: amb._id, simulated: false } },
    { $group: { _id: null, total: { $sum: "$amount_inr" }, calls: { $sum: 1 } } },
  ]);
  return plain<{
    booking: Record<string, unknown>;
    lead: Record<string, unknown>;
    amb: Record<string, unknown>;
    match: Record<string, unknown> | null;
    call: Record<string, unknown> | null;
    credits: { total: number; calls: number };
  }>({ booking, lead, amb, match, call, credits: credits[0] ?? { total: 0, calls: 0 } });
}

export async function getLandingStats() {
  await connectDB();
  const [leads, ambassadors, runs] = await Promise.all([
    Lead.countDocuments({ in_experiment: true }),
    Ambassador.countDocuments({ active: true }),
    AgentRun.countDocuments({ kind: "match", status: "done" }),
  ]);
  return { leads, ambassadors, runs };
}
