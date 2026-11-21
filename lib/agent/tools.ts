import { Types } from "mongoose";
import { Ambassador, Doubt, Lead, Match, PincodeDistrict, type LeadDoc } from "@/lib/db/models";
import { resolveDistrict, type DistrictResolution } from "@/lib/geo/indiaPost";
import { districtKey } from "@/lib/geo/districts";
import { BOOKING_PLACEHOLDER, FEE_BANDS, LANGUAGES, UNIVERSITIES, langName, type FeeBand, type LangCode } from "@/lib/constants";
import type { AgentTool } from "./loop";
import {
  CreateMatchArgs,
  DraftFamilyMessageArgs,
  ExtractDoubtsArgs,
  GetLeadArgs,
  ResolveDistrictArgs,
  ScoreCandidatesArgs,
  SearchAmbassadorsArgs,
  WriteBriefArgs,
  type Brief,
} from "./schemas";
import { ensureOptOut, foreignIndicChars, isInLanguage, quoteInNotes, scanRedFlags, scriptShare, wordCount } from "./validators";
import type { z } from "zod";

export type Candidate = {
  ambassador_id: string; // short code, e.g. "amb_07"
  db_id: string;
  name: string;
  tier: number;
  tier_label: string;
  district: string;
  district_key: string;
  state: string;
  university: string;
  campus_city: string;
  child_year: number;
  languages: string[];
  bio: string;
  calls_this_week: number;
  max_calls_per_week: number;
};

export type Facts = {
  same_district: boolean;
  same_state: boolean;
  speaks_family_language: boolean;
  same_university: boolean;
  child_year: number;
};

export type Ranked = { ambassador_id: string; name: string; score: number; reasons: string[]; addresses_doubts: string[]; facts: Facts };

export type MatchCtx = {
  runId: Types.ObjectId;
  leadId: string;
  targetLanguage?: LangCode; // family message language (defaults to the lead's language)
  lead: LeadDoc | null;
  doubts: Array<{ category: string; evidence_quote: string; severity: number; quote_verified: boolean }>;
  resolution: DistrictResolution | null;
  candidates: Candidate[];
  ranked: Ranked[];
  match: { match_id: string; ambassador_id: string; db_id: string; ambassador_name: string; score: number; reasons: string[] } | null;
  brief: Brief | null;
  familyMessage: { language: LangCode; body: string; word_count: number } | null;
  called: Set<string>;
};

export function newMatchCtx(runId: Types.ObjectId, leadId: string, targetLanguage?: LangCode): MatchCtx {
  return {
    runId,
    leadId,
    targetLanguage,
    lead: null,
    doubts: [],
    resolution: null,
    candidates: [],
    ranked: [],
    match: null,
    brief: null,
    familyMessage: null,
    called: new Set(),
  };
}

const TIER_LABEL: Record<number, string> = {
  1: "same district",
  2: "same state + same university",
  3: "speaks family's language",
  4: "same state",
};

function canonicalUniversity(s: string | null | undefined): string {
  if (!s) return "";
  const n = s.toLowerCase();
  const u = UNIVERSITIES.find((u) => n.includes(u.name.toLowerCase().split(" ")[0]));
  return u?.name ?? s;
}

function daysSince(d: Date | string) {
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

async function loadLead(ctx: MatchCtx): Promise<LeadDoc> {
  if (ctx.lead) return ctx.lead;
  const lead = await Lead.findById(ctx.leadId).lean<LeadDoc>();
  if (!lead) throw new Error("Lead not found");
  ctx.lead = lead;
  return lead;
}

function computeFacts(c: Candidate, ctx: MatchCtx): Facts {
  const lead = ctx.lead;
  const famKey = ctx.resolution?.district_key || lead?.district_key || "";
  const famState = ctx.resolution?.state || lead?.state || "";
  return {
    same_district: !!famKey && c.district_key === famKey,
    same_state: !!famState && c.state === famState,
    speaks_family_language: !!lead && c.languages.includes(lead.language),
    same_university: !!lead?.preferred_university && c.university === canonicalUniversity(lead.preferred_university),
    child_year: c.child_year,
  };
}

function findCandidate(ctx: MatchCtx, id: string): Candidate | undefined {
  const k = id.trim().toLowerCase();
  return ctx.candidates.find((c) => c.ambassador_id === k || c.db_id === id.trim());
}

const STANDARD_DO_NOT_SAY = [
  "Never guarantee a job, placement or salary — no programme cohort has graduated yet.",
  "Never promise fee discounts, refunds or concessions.",
  "Never criticise other colleges or courses.",
  "Refer every fee or payment question to the programme counsellor.",
];

// ─── 1. get_lead ──────────────────────────────────────────────────────────────
const getLead: AgentTool<MatchCtx> = {
  name: "get_lead",
  description: "Fetch the stalled family's lead record and counselling notes. Always call this first.",
  schema: GetLeadArgs,
  async run(args: z.infer<typeof GetLeadArgs>, ctx) {
    ctx.called.add("get_lead");
    const lead = await loadLead(ctx);
    const warn = args.lead_id !== ctx.leadId ? "This agent run is scoped to one lead; returned the assigned lead." : undefined;
    const lang = lead.language as LangCode;
    return {
      source: "MongoDB",
      summary: `${lead.student_name}'s family · ${langName(lang)} · PIN ${lead.pincode} · ${daysSince(lead.counselling_date)} days since counselling`,
      result: {
        lead_id: String(lead._id),
        student_name: lead.student_name,
        parent_name: lead.parent_name,
        pincode: lead.pincode,
        family_language: `${lang} (${LANGUAGES[lang]?.name ?? lang})`,
        preferred_university: lead.preferred_university || "(not stated)",
        fee: `₹${FEE_BANDS[lead.fee_band as FeeBand] ?? "?"} lakh/year (${lead.fee_band} band)`,
        counselling_date: new Date(lead.counselling_date).toISOString().slice(0, 10),
        days_since_counselling: daysSince(lead.counselling_date),
        status: lead.status,
        consent_whatsapp: lead.consent_whatsapp,
        counselling_notes: lead.counselling_notes,
        ...(warn ? { warning: warn } : {}),
      },
    };
  },
};

// ─── 2. extract_doubts ────────────────────────────────────────────────────────
const extractDoubts: AgentTool<MatchCtx> = {
  name: "extract_doubts",
  description:
    "Save the family's doubts that you extracted from the counselling notes. Categories: trust_not_a_college, degree_validity, two_fee_payees, placement, hostel_safety, distance, price, other. evidence_quote must be copied word-for-word from the notes (quotes are verified).",
  schema: ExtractDoubtsArgs,
  async run(args: z.infer<typeof ExtractDoubtsArgs>, ctx) {
    ctx.called.add("extract_doubts");
    const lead = await loadLead(ctx);
    const rows = args.doubts.map((d) => ({
      lead_id: lead._id,
      agent_run_id: ctx.runId,
      category: d.category,
      evidence_quote: d.evidence_quote.trim(),
      severity: d.severity,
      quote_verified: quoteInNotes(d.evidence_quote, lead.counselling_notes),
    }));
    await Doubt.deleteMany({ lead_id: lead._id });
    await Doubt.insertMany(rows);
    ctx.doubts = rows.map(({ category, evidence_quote, severity, quote_verified }) => ({
      category,
      evidence_quote,
      severity,
      quote_verified,
    }));
    const verified = rows.filter((r) => r.quote_verified).length;
    return {
      source: "MongoDB",
      summary: `${rows.length} doubts saved · ${verified}/${rows.length} quotes verified against the notes`,
      result: {
        saved: rows.length,
        doubts: ctx.doubts.map((d) => ({ category: d.category, severity: d.severity, quote_verified: d.quote_verified })),
        ...(verified < rows.length
          ? { warning: "Some quotes were not found verbatim in the notes — they are flagged as unverified." }
          : {}),
      },
    };
  },
};

// ─── 3. resolve_district ──────────────────────────────────────────────────────
const resolveDistrictTool: AgentTool<MatchCtx> = {
  name: "resolve_district",
  description:
    "Resolve the family's PIN code to district and state using the public postal PIN lookup (falls back to a local cache).",
  schema: ResolveDistrictArgs,
  async run(args: z.infer<typeof ResolveDistrictArgs>, ctx) {
    ctx.called.add("resolve_district");
    const r = await resolveDistrict(args.pincode, {
      timeoutMs: 3000,
      cacheLookup: async (pin) => PincodeDistrict.findOne({ pincode: pin }).lean(),
    });
    if (!r.ok) {
      return { ok: false, source: "Postal PIN lookup", summary: r.error, result: { error: r.error } };
    }
    ctx.resolution = r;
    // Persist on the lead (manual leads arrive without a district).
    await Lead.updateOne(
      { _id: ctx.leadId },
      { $set: { district: r.district, district_key: r.district_key, state: r.state } }
    );
    if (r.source === "india_post") {
      await PincodeDistrict.updateOne(
        { pincode: r.pincode },
        {
          $set: {
            district: r.district,
            postal_district: r.postal_district,
            district_key: r.district_key,
            state: r.state,
            office: r.office,
          },
        },
        { upsert: true }
      );
    }
    const via = r.source === "india_post" ? "postal PIN endpoint" : `cache (${r.fallback_reason})`;
    return {
      source: r.source === "india_post" ? "Postal PIN lookup" : "cache",
      summary: `${r.district}, ${r.state} · ${via} · ${r.latency_ms} ms`,
      result: {
        district: r.district,
        state: r.state,
        post_office: r.office,
        source: r.source,
        latency_ms: r.latency_ms,
        ...(r.note ? { note: r.note } : {}),
      },
    };
  },
};

// ─── 4. search_ambassadors ────────────────────────────────────────────────────
const searchAmbassadors: AgentTool<MatchCtx> = {
  name: "search_ambassadors",
  description:
    "Find available parent ambassadors (active, consented, under their weekly call cap). Ranked: same district first, then same state + same university, then same language. Returns up to 8 candidates.",
  schema: SearchAmbassadorsArgs,
  async run(args: z.infer<typeof SearchAmbassadorsArgs>, ctx) {
    ctx.called.add("search_ambassadors");
    const lead = await loadLead(ctx);
    const key = districtKey(args.district) || ctx.resolution?.district_key || lead.district_key;
    const state = args.state || ctx.resolution?.state || lead.state;
    const university = canonicalUniversity(args.university) || canonicalUniversity(lead.preferred_university);
    const language = args.language || lead.language;
    const exclude = (args.exclude_ids ?? [])
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean);

    const rows = await Ambassador.aggregate([
      {
        $match: {
          active: true,
          consent_given: true,
          code: { $nin: exclude },
          $expr: { $lt: ["$calls_this_week", "$max_calls_per_week"] },
        },
      },
      {
        $addFields: {
          tier: {
            $switch: {
              branches: [
                { case: { $eq: ["$district_key", key] }, then: 1 },
                { case: { $and: [{ $eq: ["$state", state] }, { $eq: ["$university", university] }] }, then: 2 },
                { case: { $in: [language, "$languages"] }, then: 3 },
                { case: { $eq: ["$state", state] }, then: 4 },
              ],
              default: 9,
            },
          },
          speaks: { $in: [language, "$languages"] },
          same_state: { $eq: ["$state", state] },
        },
      },
      { $match: { tier: { $lt: 9 } } },
      // Within a tier: speaks the language, same state, then the least-loaded parent (spreads calls fairly).
      { $sort: { tier: 1, speaks: -1, same_state: -1, calls_this_week: 1, child_year: -1 } },
      { $limit: 8 },
    ]);

    ctx.candidates = rows.map((a) => ({
      ambassador_id: a.code,
      db_id: String(a._id),
      name: a.name,
      tier: a.tier,
      tier_label: TIER_LABEL[a.tier] ?? "other",
      district: a.district,
      district_key: a.district_key,
      state: a.state,
      university: a.university,
      campus_city: a.campus_city,
      child_year: a.child_year,
      languages: a.languages,
      bio: a.bio,
      calls_this_week: a.calls_this_week,
      max_calls_per_week: a.max_calls_per_week,
    }));

    const counts = ctx.candidates.reduce<Record<string, number>>((m, c) => {
      m[c.tier_label] = (m[c.tier_label] ?? 0) + 1;
      return m;
    }, {});
    return {
      source: "MongoDB aggregation",
      summary: ctx.candidates.length
        ? `${ctx.candidates.length} candidates · ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}`
        : "No available parent ambassadors found",
      result: {
        count: ctx.candidates.length,
        candidates: ctx.candidates.map((c) => ({
          ambassador_id: c.ambassador_id,
          name: c.name,
          match_tier: c.tier_label,
          district: c.district,
          state: c.state,
          child: `Year ${c.child_year} at ${c.university}, ${c.campus_city}`,
          languages: c.languages.map((l) => `${l} (${langName(l)})`),
          brief_language: c.languages[0],
          load: `${c.calls_this_week}/${c.max_calls_per_week} calls this week`,
          bio: c.bio.slice(0, 260),
        })),
      },
    };
  },
};

// ─── 5. score_candidates ──────────────────────────────────────────────────────
const scoreCandidates: AgentTool<MatchCtx> = {
  name: "score_candidates",
  description:
    "Record your 0–100 score for every candidate with short reasons. Weigh: same district, speaks the family's language, same university as the family's preference, child's year (older = more lived experience), and whether the parent's bio shows they had the same doubts as this family.",
  schema: ScoreCandidatesArgs,
  async run(args: z.infer<typeof ScoreCandidatesArgs>, ctx) {
    ctx.called.add("score_candidates");
    if (!ctx.candidates.length) return { ok: false, result: { error: "Call search_ambassadors first." } };
    const unknown = args.scores.filter((s) => !findCandidate(ctx, s.ambassador_id)).map((s) => s.ambassador_id);
    const ranked: Ranked[] = [];
    for (const s of args.scores) {
      const c = findCandidate(ctx, s.ambassador_id);
      if (!c || ranked.some((r) => r.ambassador_id === c.ambassador_id)) continue;
      ranked.push({
        ambassador_id: c.ambassador_id,
        name: c.name,
        score: Math.round(s.score),
        reasons: s.reasons,
        addresses_doubts: (s.addresses_doubts ?? []) as string[],
        facts: computeFacts(c, ctx),
      });
    }
    ranked.sort((a, b) => b.score - a.score);
    if (!ranked.length) {
      return { ok: false, result: { error: `None of the ids are candidates: ${unknown.join(", ")}` } };
    }
    ctx.ranked = ranked;
    return {
      source: "agent judgement + verified facts",
      summary: `Top: ${ranked[0].name} (${ranked[0].score}) · ${ranked.length} scored`,
      result: {
        ranked: ranked.map((r) => ({ ambassador_id: r.ambassador_id, name: r.name, score: r.score, verified_facts: r.facts })),
        ...(unknown.length ? { warning: `Ignored unknown ids: ${unknown.join(", ")}` } : {}),
      },
    };
  },
};

// ─── 6. create_match ──────────────────────────────────────────────────────────
const createMatch: AgentTool<MatchCtx> = {
  name: "create_match",
  description: "Save the single best parent ambassador for this family, with the score and the reasons.",
  schema: CreateMatchArgs,
  async run(args: z.infer<typeof CreateMatchArgs>, ctx) {
    ctx.called.add("create_match");
    const lead = await loadLead(ctx);
    const c = findCandidate(ctx, args.ambassador_id);
    if (!c) return { ok: false, result: { error: `ambassador_id ${args.ambassador_id} is not one of the candidates.` } };
    const doc = await Match.create({
      lead_id: lead._id,
      ambassador_id: new Types.ObjectId(c.db_id),
      score: Math.round(args.score),
      reasons: args.reasons,
      agent_run_id: ctx.runId,
    });
    ctx.match = {
      match_id: String(doc._id),
      ambassador_id: c.ambassador_id,
      db_id: c.db_id,
      ambassador_name: c.name,
      score: Math.round(args.score),
      reasons: args.reasons,
    };
    return {
      source: "MongoDB",
      summary: `Matched with ${c.name} (${c.district}) · score ${Math.round(args.score)}`,
      result: { match_id: String(doc._id), ambassador_id: c.ambassador_id, name: c.name },
    };
  },
};

// ─── 7. write_ambassador_brief ────────────────────────────────────────────────
const writeBrief: AgentTool<MatchCtx> = {
  name: "write_ambassador_brief",
  description:
    "Save the call brief for the matched parent ambassador: in their first language (native script) AND in English. Include who the family is, their 2–3 real doubts with the family's own words, exactly 3 questions to ask, and a do-not-say list (no job/placement/salary guarantees, no fee promises, don't criticise other colleges, refer fee questions to the counsellor).",
  schema: WriteBriefArgs,
  async run(args: z.infer<typeof WriteBriefArgs>, ctx) {
    ctx.called.add("write_ambassador_brief");
    const c = findCandidate(ctx, args.ambassador_id);
    if (!c) return { ok: false, result: { error: `ambassador_id ${args.ambassador_id} is not one of the candidates.` } };
    if (ctx.match && ctx.match.ambassador_id !== c.ambassador_id) {
      return { ok: false, result: { error: `Write the brief for the matched parent (${ctx.match.ambassador_id}).` } };
    }
    const lang = args.language as LangCode;
    if (!c.languages.includes(lang)) {
      return { ok: false, result: { error: `${c.name} speaks ${c.languages.join(", ")} — write the brief in ${c.languages[0]}.` } };
    }
    const nativeText = [
      args.native.family_summary,
      ...args.native.doubts.map((d) => d.doubt),
      ...args.native.questions_to_ask,
      ...args.native.do_not_say,
    ].join(" ");
    if (lang !== "en" && !isInLanguage(nativeText, lang, 0.5)) {
      return {
        ok: false,
        result: {
          error: `The native brief must be written only in ${langName(lang)} script (${Math.round(scriptShare(nativeText, lang) * 100)}% is${foreignIndicChars(nativeText, lang).length ? `; it also contains ${foreignIndicChars(nativeText, lang).map(langName).join("/")} letters` : ""}). Rewrite it.`,
        },
      };
    }
    const englishText = [
      args.english.family_summary,
      ...args.english.doubts.map((d) => d.doubt),
      ...args.english.questions_to_ask,
      ...args.english.do_not_say,
    ].join(" ");
    if (!isInLanguage(englishText, "en", 0.7)) {
      return {
        ok: false,
        result: { error: "The `english` brief must be written entirely in English (it is the counsellor's translation). Rewrite it." },
      };
    }
    const warnings: string[] = [];
    const en = args.english.do_not_say.join(" ").toLowerCase();
    const needs: Array<[RegExp, string]> = [
      [/guarant|promise.*(job|placement)|placement/, STANDARD_DO_NOT_SAY[0]],
      [/fee|discount|refund/, STANDARD_DO_NOT_SAY[1]],
      [/college/, STANDARD_DO_NOT_SAY[2]],
      [/counsel/, STANDARD_DO_NOT_SAY[3]],
    ];
    const english = { ...args.english, do_not_say: [...args.english.do_not_say] };
    for (const [re, line] of needs) {
      if (!re.test(en)) {
        english.do_not_say.push(line);
        warnings.push(`Added mandatory rule: "${line}"`);
      }
    }
    ctx.brief = { ...args, ambassador_id: c.ambassador_id, english };
    return {
      source: "agent output (validated)",
      summary: `${langName(lang)} brief + English · ${args.native.doubts.length} doubts · ${args.native.questions_to_ask.length} questions · ${english.do_not_say.length} do-not-say rules`,
      result: { saved: true, language: lang, ...(warnings.length ? { warnings } : {}) },
    };
  },
};

// ─── 8. draft_family_message ──────────────────────────────────────────────────
export const draftFamilyMessage: AgentTool<MatchCtx> = {
  name: "draft_family_message",
  description: `Save the WhatsApp offer to the family, in the family's language (native script). It is sent by ParentBridge support team — write about the parent ambassador in the third person, never as them. Under 60 words, warm and respectful, no sales pitch. Say who the parent ambassador is (first name, their child's year and campus, same district/language) and offer a free 20-minute call. Must include the placeholder ${BOOKING_PLACEHOLDER} and end with "Reply STOP to opt out" (keep STOP in English). Never mention placements, jobs, salaries, guarantees or fee amounts. Use the honorific of the family's language: Telugu "గారు", Hindi "जी", Tamil "அவர்களே", Kannada "ಅವರೇ", Malayalam "ശ്രീ" before the name, English "Mr./Ms.".`,
  schema: DraftFamilyMessageArgs,
  async run(args: z.infer<typeof DraftFamilyMessageArgs>, ctx) {
    ctx.called.add("draft_family_message");
    const lead = await loadLead(ctx);
    const target = (ctx.targetLanguage ?? lead.language) as LangCode;
    const lang = args.language as LangCode;
    const errors: string[] = [];
    if (lang !== target) errors.push(`The message must be in ${langName(target)} (${target}), not ${lang}.`);
    if (!args.body.includes(BOOKING_PLACEHOLDER)) errors.push(`Include the placeholder ${BOOKING_PLACEHOLDER} exactly.`);
    const words = wordCount(args.body);
    if (words > 60) errors.push(`Too long: ${words} words (max 60, excluding the link and opt-out line). Shorten it.`);
    if (target === "en" ? !isInLanguage(args.body, "en", 0.9) : !isInLanguage(args.body, target, 0.5)) {
      errors.push(`Write it only in ${langName(target)} script (currently ${Math.round(scriptShare(args.body, target) * 100)}%${foreignIndicChars(args.body, target).length ? `, plus stray ${foreignIndicChars(args.body, target).map(langName).join("/")} letters` : ""}).`);
    }
    const flags = scanRedFlags(args.body);
    if (flags.length) errors.push(`Remove promises/claims: ${flags.map((f) => f.rule).join(", ")}.`);
    if (errors.length) {
      return { ok: false, summary: `Rejected: ${errors[0]}`, result: { error: errors.join(" ") } };
    }
    const body = ensureOptOut(args.body);
    ctx.familyMessage = { language: target, body, word_count: words };
    return {
      source: "agent output (validated)",
      summary: `${langName(target)} · ${words} words · booking link ✓ · opt-out ✓`,
      result: { saved: true, language: target, word_count: words },
    };
  },
};

export const MATCH_TOOLS: AgentTool<MatchCtx>[] = [
  getLead,
  extractDoubts,
  resolveDistrictTool,
  searchAmbassadors,
  scoreCandidates,
  createMatch,
  writeBrief,
  draftFamilyMessage,
];

export function missingForMatch(ctx: MatchCtx): string[] {
  const m: string[] = [];
  for (const t of ["get_lead", "extract_doubts", "resolve_district", "search_ambassadors", "score_candidates"]) {
    if (!ctx.called.has(t)) m.push(t);
  }
  if (!ctx.doubts.length) m.push("doubts (extract_doubts)");
  if (!ctx.match) m.push("match (create_match)");
  if (!ctx.brief) m.push("brief (write_ambassador_brief)");
  if (!ctx.familyMessage) m.push("family message (draft_family_message)");
  return [...new Set(m)];
}

export { computeFacts, findCandidate };
