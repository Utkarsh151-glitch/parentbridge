/**
 * Run the matching agent from the command line on seeded leads and print the trace.
 *   npm run agent:test                 → 3 featured leads
 *   npm run agent:test -- <leadId> ... → specific leads
 */
import "./env";
import { connectDB, disconnectDB } from "../lib/db/connect";
import { Lead } from "../lib/db/models";
import { runMatchAgent } from "../lib/agent/matchAgent";
import type { AgentEvent } from "../lib/agent/loop";

const short = (v: unknown, n = 140) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + "…" : s;
};

async function main() {
  await connectDB();
  const ids = process.argv.slice(2).filter((a) => /^[a-f0-9]{24}$/.test(a));
  const leads = ids.length
    ? await Lead.find({ _id: { $in: ids } }).lean()
    : await Lead.find({ featured: true, pincode: { $in: (process.env.PINS ?? "522002,500028,517501").split(",") } }).lean();

  for (const lead of leads) {
    console.log(`\n══ ${lead.student_name} · ${lead.district} · ${lead.language} · ${lead._id} ══`);
    console.log(`notes: ${lead.counselling_notes}\n`);
    const onEvent = (e: AgentEvent) => {
      if (e.type === "llm")
        console.log(
          `  [model turn ${e.turn.turn}] ${e.turn.provider}/${e.turn.model} · in ${e.turn.input_tokens} out ${e.turn.output_tokens} tok · ${e.turn.ms} ms → ${e.turn.tool_calls.join(", ") || `"${short(e.turn.text)}"`}${e.turn.fallback ? ` (fallback: ${e.turn.fallback})` : ""}`
        );
      if (e.type === "step")
        console.log(`    ${e.step.ok ? "✓" : "✗"} ${e.step.tool}(${short(e.step.args, 90)}) → ${e.step.summary ?? short(e.step.result)} · ${e.step.ms} ms`);
      if (e.type === "error") console.log(`  ✗ ERROR: ${e.message}`);
      if (e.type === "done") {
        const f = e.final_output as {
          match: { ambassador_name: string; score: number; reasons: string[] };
          family_message: { language: string; body: string };
          brief: { language: string; native: { family_summary: string; questions_to_ask: string[] } };
          doubts: Array<{ category: string; severity: number; evidence_quote: string; quote_verified: boolean }>;
        };
        console.log(`\n  DOUBTS:`);
        for (const d of f.doubts) console.log(`   - ${d.category} (sev ${d.severity}) ${d.quote_verified ? "✓" : "?"} "${d.evidence_quote}"`);
        console.log(`  MATCH: ${f.match.ambassador_name} · score ${f.match.score}\n   - ${f.match.reasons.join("\n   - ")}`);
        console.log(`  BRIEF (${f.brief.language}): ${f.brief.native.family_summary}`);
        console.log(`   Q: ${f.brief.native.questions_to_ask.join(" | ")}`);
        console.log(`  FAMILY MESSAGE (${f.family_message.language}):\n${f.family_message.body.replace(/^/gm, "   │ ")}`);
        console.log(
          `  TOTALS: ${e.totals.provider} · ${e.totals.model} · ${e.totals.llm_calls} model calls · ${e.totals.input_tokens}+${e.totals.output_tokens} tokens · ${(e.totals.duration_ms / 1000).toFixed(1)} s`
        );
      }
    };
    await runMatchAgent({ leadId: String(lead._id), onEvent });
  }
  await disconnectDB();
}

main().catch(async (e) => {
  console.error(e);
  await disconnectDB();
  process.exit(1);
});
