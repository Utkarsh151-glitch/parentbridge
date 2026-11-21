import type { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { AgentRun, Ambassador, Booking, Call, Doubt, Lead, Match } from "@/lib/db/models";
import { AllProvidersFailedError, describeProviders, newRouterState } from "@/lib/llm";
import { DOUBT_LABELS, langName, type DoubtCategory } from "@/lib/constants";
import { runAgentLoop, type AgentTool } from "./loop";
import { CallSummary, SaveCallSummaryArgs } from "./schemas";
import { scanRedFlags, type RedFlag } from "./validators";

const SYSTEM = `You summarise a 20-minute parent-to-parent call for the programme's admissions counsellor.
A parent ambassador ("ambassador") spoke with a stalled family. Their notes may be in any language or a pasted voice-note transcript; always answer in English.
Only use what is in the notes — never invent. Map what happened to the family's known doubts.
red_flags: list anything the parent ambassador said that overpromised (guaranteed jobs/placements, salary figures, fee discounts or refunds) or that criticised other colleges, quoting it briefly. Empty list if none.
next_best_action: one concrete step for the counsellor (e.g. "Call father Thursday with the fee-receipt split; send hostel photos").
Save with save_call_summary.`;

type Ctx = { notes: string; summary: CallSummary | null; detected: RedFlag[] };

const saveSummary: AgentTool<Ctx> = {
  name: "save_call_summary",
  description: "Save the structured call summary for the counsellor (English).",
  schema: SaveCallSummaryArgs,
  async run(args: z.infer<typeof SaveCallSummaryArgs>, ctx) {
    ctx.summary = { ...args, red_flags_detected: ctx.detected };
    const totalFlags = args.red_flags.length + ctx.detected.length;
    return {
      source: "agent output (validated)",
      summary: `${args.doubts_resolved.length} resolved · ${args.doubts_remaining.length} remaining · sentiment ${args.family_sentiment}${totalFlags ? ` · ⚠ ${totalFlags} red flag(s)` : ""}`,
      result: { saved: true, rule_based_red_flags: ctx.detected.map((d) => d.rule) },
    };
  },
};

export async function runSummariseAgent(opts: { callId: string; ipHash?: string | null }) {
  await connectDB();
  const call = await Call.findById(opts.callId);
  if (!call) throw new Error("Call not found");
  const [booking, lead, amb] = await Promise.all([
    Booking.findById(call.booking_id).lean(),
    Lead.findById(call.lead_id).lean(),
    Ambassador.findById(call.ambassador_id).lean(),
  ]);
  const doubts = lead ? await Doubt.find({ lead_id: lead._id }).lean() : [];
  const match = booking?.match_id ? await Match.findById(booking.match_id).lean() : null;
  const brief = match?.brief as { english?: { questions_to_ask?: string[] } } | null;

  const run = await AgentRun.create({
    lead_id: lead?._id ?? null,
    call_id: call._id,
    kind: "summarise",
    status: "running",
    ip_hash: opts.ipHash ?? null,
  });
  const ctx: Ctx = { notes: call.ambassador_notes, summary: null, detected: scanRedFlags(call.ambassador_notes) };
  const router = newRouterState();
  const t0 = Date.now();

  const prompt = [
    `Family: ${lead?.parent_name ?? "?"} (parent of ${lead?.student_name ?? "?"}), ${lead?.district ?? ""}, speaks ${langName(lead?.language)}.`,
    `parent ambassador: ${amb?.name ?? "?"}, child in Year ${amb?.child_year ?? "?"} at ${amb?.university ?? "?"}.`,
    `Family's doubts before the call:\n${doubts.map((d) => `- ${DOUBT_LABELS[d.category as DoubtCategory] ?? d.category} (severity ${d.severity}): "${d.evidence_quote}"`).join("\n") || "- (none recorded)"}`,
    brief?.english?.questions_to_ask?.length ? `Questions the parent ambassador was asked to cover:\n${brief.english.questions_to_ask.map((q) => `- ${q}`).join("\n")}` : "",
    `parent ambassador's notes / transcript:\n"""${call.ambassador_notes}"""`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const res = await runAgentLoop({
      system: SYSTEM,
      prompt,
      tools: [saveSummary],
      ctx,
      maxTurns: 3,
      firstTurnRequired: true,
      maxOutputTokens: 2048,
      missing: (c) => (c.summary ? [] : ["save_call_summary"]),
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
    if (!ctx.summary) throw new Error(`No summary produced (${res.missing.join(", ")})`);
    const summary = CallSummary.parse(ctx.summary);
    call.ai_summary = summary;
    call.summary_status = "done";
    call.agent_run_id = run._id;
    call.markModified("ai_summary");
    await call.save();
    const who = describeProviders(router);
    await AgentRun.updateOne(
      { _id: run._id },
      { $set: { status: "done", final_output: summary, provider: who.provider, model: who.model, duration_ms: Date.now() - t0 } }
    );
    return { ok: true as const, summary, runId: String(run._id), ...who, duration_ms: Date.now() - t0 };
  } catch (e) {
    const rate = e instanceof AllProvidersFailedError && e.rateLimited;
    const msg = rate ? "The free AI quota is exhausted right now — retry the summary in a minute." : (e as Error).message;
    call.summary_status = "error";
    await call.save();
    await AgentRun.updateOne({ _id: run._id }, { $set: { status: "error", error: msg, duration_ms: Date.now() - t0 } });
    return { ok: false as const, error: msg, rate_limited: rate, detected: ctx.detected };
  }
}
