import { z } from "zod";
import { DOUBT_CATEGORIES, LANG_CODES } from "@/lib/constants";
import type { JSONSchema } from "@/lib/llm/types";

const Lang = z.enum(LANG_CODES as [string, ...string[]]);

export const GetLeadArgs = z.object({ lead_id: z.string().describe("The lead id you were given") });

export const ExtractDoubtsArgs = z.object({
  doubts: z
    .array(
      z.object({
        category: z.enum(DOUBT_CATEGORIES),
        evidence_quote: z
          .string()
          .min(3)
          .max(300)
          .describe("Words copied exactly from the counselling notes that show this doubt"),
        severity: z.number().int().min(1).max(3).describe("1 = minor, 2 = important, 3 = deal-breaker"),
      })
    )
    .min(1)
    .max(5)
    .describe("1–5 distinct doubts, most severe first"),
});

export const ResolveDistrictArgs = z.object({
  pincode: z.string().describe("6-digit Indian PIN code from the lead"),
});

export const SearchAmbassadorsArgs = z.object({
  district: z.string().describe("Resolved district of the family (from resolve_district)"),
  state: z.string().describe("Resolved state of the family"),
  language: Lang.describe("Family's language code"),
  university: z.string().describe("Family's preferred partner university, or empty string"),
  exclude_ids: z.array(z.string()).optional().describe("Ambassador ids to exclude"),
});

export const ScoreCandidatesArgs = z.object({
  scores: z
    .array(
      z.object({
        ambassador_id: z.string(),
        score: z.number().min(0).max(100),
        reasons: z.array(z.string()).min(1).max(4).describe("Short reasons (district, language, university, child's year, bio vs doubts)"),
        addresses_doubts: z
          .array(z.enum(DOUBT_CATEGORIES))
          .optional()
          .describe("Doubt categories this parent's bio suggests they personally had"),
      })
    )
    .min(1)
    .max(8),
});

export const CreateMatchArgs = z.object({
  lead_id: z.string(),
  ambassador_id: z.string(),
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()).min(1).max(5),
});

export const BriefBody = z.object({
  family_summary: z.string().min(10).describe("2–3 sentences: who the family is and where they are stuck"),
  doubts: z
    .array(z.object({ doubt: z.string(), quote: z.string().describe("The family's own words from the notes") }))
    .min(1)
    .max(3),
  questions_to_ask: z.array(z.string()).min(3).max(3).describe("Exactly 3 open questions to ask the family"),
  do_not_say: z.array(z.string()).min(4).max(6),
});

export const WriteBriefArgs = z.object({
  ambassador_id: z.string(),
  language: Lang.describe("The ambassador's first language"),
  native: BriefBody.describe("The brief written in the ambassador's language (native script)"),
  english: BriefBody.describe("The same brief in English"),
});

export const DraftFamilyMessageArgs = z.object({
  language: Lang.describe("The family's language"),
  body: z.string().min(20).max(1500).describe("The WhatsApp message text"),
});

export const SaveCallSummaryArgs = z.object({
  doubts_resolved: z.array(z.string()).max(6),
  doubts_remaining: z.array(z.string()).max(6),
  family_sentiment: z.enum(["positive", "leaning_positive", "neutral", "leaning_negative", "negative"]),
  sentiment_reason: z.string().max(300),
  next_best_action: z.string().max(400).describe("One concrete next step for the counsellor"),
  red_flags: z
    .array(z.string())
    .max(6)
    .describe("Anything the parent ambassador said that overpromised (jobs, placements, salaries, fee discounts) or criticised other colleges"),
});

const DoubtOut = z.object({
  category: z.enum(DOUBT_CATEGORIES),
  evidence_quote: z.string(),
  severity: z.number(),
  quote_verified: z.boolean(),
});

/** The agent's final contract: { match, brief, family_message, doubts } */
export const MatchFinalOutput = z.object({
  match: z.object({
    match_id: z.string(),
    ambassador_id: z.string(),
    ambassador_name: z.string(),
    score: z.number(),
    reasons: z.array(z.string()),
    facts: z.record(z.string(), z.unknown()),
    other_candidates: z.array(
      z.object({ ambassador_id: z.string(), name: z.string(), score: z.number(), reasons: z.array(z.string()) })
    ),
  }),
  brief: z.object({ language: z.string(), native: BriefBody, english: BriefBody }),
  family_message: z.object({ language: z.string(), body: z.string() }),
  doubts: z.array(DoubtOut).min(1),
});
export type MatchFinalOutput = z.infer<typeof MatchFinalOutput>;
export type Brief = z.infer<typeof WriteBriefArgs>;

export const CallSummary = SaveCallSummaryArgs.extend({
  red_flags: z.array(z.string()),
  red_flags_detected: z.array(z.object({ rule: z.string(), excerpt: z.string() })),
});
export type CallSummary = z.infer<typeof CallSummary>;

/** zod → JSON Schema for function declarations (Gemini & OpenAI-compatible). */
export function toParameters(schema: z.ZodType): JSONSchema {
  const js = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

export function formatZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 6)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}
