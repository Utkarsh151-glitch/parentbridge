import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AgentRun, Ambassador, Lead, Match, type LeadDoc } from "@/lib/db/models";
import { describeProviders, newRouterState, AllProvidersFailedError } from "@/lib/llm";
import { BOOKING_PLACEHOLDER, langName, type LangCode } from "@/lib/constants";
import { runAgentLoop } from "./loop";
import { draftFamilyMessage, newMatchCtx } from "./tools";

const SYSTEM = `You adapt ParentBridge WhatsApp offers into other Indian languages for the education programme.
Rules: native script only (no letters from other scripts); under 60 words; warm and respectful, with that language's honorific (Telugu "గారు", Hindi "जी", Tamil "அவர்களே", Kannada "ಅವರೇ", Malayalam "ശ്രീ" before the name, English "Mr./Ms.") — never carry over the source language's honorific; keep the same facts; include ${BOOKING_PLACEHOLDER} exactly; end with "Reply STOP to opt out" (STOP stays in English).
Never mention jobs, placements, salaries, guarantees or fee amounts. Never invent facts. Save the result with draft_family_message; if it is rejected, fix it and call again.`;

export type RegenerateResult =
  | { ok: true; language: LangCode; body: string; cached: boolean; runId?: string; provider?: string; model?: string }
  | { ok: false; error: string; retryable: boolean; rate_limited?: boolean };

export async function regenerateFamilyMessage(opts: {
  leadId: string;
  language: LangCode;
  force?: boolean;
  ipHash?: string | null;
}): Promise<RegenerateResult> {
  await connectDB();
  const lead = await Lead.findById(opts.leadId).lean<LeadDoc>();
  if (!lead) return { ok: false, error: "Lead not found", retryable: false };
  const match = await Match.findOne({ lead_id: lead._id, family_message: { $ne: null } }).sort({ createdAt: -1 });
  if (!match?.family_message) return { ok: false, error: "Run the agent for this family first.", retryable: false };

  const variants = (match.family_message_variants ?? {}) as Record<string, { body: string; at: Date }>;
  if (variants[opts.language] && !opts.force) {
    match.family_message = { language: opts.language, body: variants[opts.language].body };
    match.markModified("family_message");
    await match.save();
    return { ok: true, language: opts.language, body: variants[opts.language].body, cached: true };
  }

  const amb = await Ambassador.findById(match.ambassador_id).lean();
  const current = match.family_message as { language: string; body: string };
  const run = await AgentRun.create({ lead_id: lead._id, kind: "regenerate", status: "running", ip_hash: opts.ipHash ?? null });
  const ctx = newMatchCtx(run._id as Types.ObjectId, String(lead._id), opts.language);
  ctx.lead = lead;
  const router = newRouterState();
  const t0 = Date.now();
  try {
    const res = await runAgentLoop({
      system: SYSTEM,
      prompt: [
        `Write this WhatsApp offer in ${langName(opts.language)} (${opts.language}).`,
        `RECIPIENT (the stalled family): ${lead.parent_name}, parent of ${lead.student_name} (a prospective student who has NOT joined yet), from ${lead.district}.`,
        amb
          ? `THE PARENT AMBASSADOR they can talk to: ${amb.name.split(" ")[0]} from ${amb.district} — a different family, whose own child ${amb.child_name} is already in Year ${amb.child_year} at ${amb.university}, ${amb.campus_city}. Speaks: ${amb.languages.map(langName).join(", ")}.`
          : "",
        "Keep these roles exactly; the message is from ParentBridge support team.",
        `Current message (${langName(current.language)}):\n"""${current.body}"""`,
      ].join("\n"),
      tools: [draftFamilyMessage],
      ctx,
      maxTurns: 3,
      firstTurnRequired: true,
      maxOutputTokens: 2048,
      missing: (c) => (c.familyMessage ? [] : ["draft_family_message"]),
      onEvent: () => {},
      onStep: async (s) => {
        await AgentRun.updateOne({ _id: run._id }, { $push: { steps: { kind: "tool", ...s } } });
      },
      onTurn: async (t) => {
        await AgentRun.updateOne(
          { _id: run._id },
          { $push: { steps: { kind: "llm", ...t } }, $inc: { input_tokens: t.input_tokens, output_tokens: t.output_tokens, llm_calls: 1 } }
        );
      },
      router,
    });
    if (!ctx.familyMessage) throw new Error(`Could not produce a valid ${langName(opts.language)} message: ${JSON.stringify(res.steps.at(-1)?.result ?? {})}`);
    const body = ctx.familyMessage.body;
    match.family_message = { language: opts.language, body };
    match.family_message_variants = { ...variants, [opts.language]: { body, at: new Date() } };
    match.markModified("family_message");
    match.markModified("family_message_variants");
    await match.save();
    const who = describeProviders(router);
    await AgentRun.updateOne(
      { _id: run._id },
      { $set: { status: "done", final_output: { language: opts.language, body }, provider: who.provider, model: who.model, duration_ms: Date.now() - t0 } }
    );
    return { ok: true, language: opts.language, body, cached: false, runId: String(run._id), ...who };
  } catch (e) {
    const rate = e instanceof AllProvidersFailedError && e.rateLimited;
    const msg = rate ? "The free AI quota is exhausted right now — please retry in a minute." : (e as Error).message;
    await AgentRun.updateOne({ _id: run._id }, { $set: { status: "error", error: msg, duration_ms: Date.now() - t0 } });
    return { ok: false, error: msg, retryable: true, rate_limited: rate };
  }
}
