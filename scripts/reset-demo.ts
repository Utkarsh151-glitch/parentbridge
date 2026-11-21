/**
 * Reset the live demo to a clean state (e.g. before recording the Loom):
 *  - removes real bookings, calls, credits, messages, events and rate-limit counters
 *  - sets every family back to "counselled", restores parent ambassadors' weekly load
 *  - keeps saved agent runs, matches and briefs (no AI quota needed to show them)
 *  - re-runs the 21-day simulation so the dashboard is populated
 *   npm run demo:reset            (add --no-sim to leave the dashboard empty, --drop-manual to delete reviewer-added leads,
 *                                  --seed=N for a different simulation; default seed 97 = the numbers in the Loom script)
 */
import "./env";
import { connectDB, disconnectDB } from "../lib/db/connect";
import { AgentRun, Ambassador, Booking, Call, CreditLedger, Event, Lead, Match, Message, RateLimit } from "../lib/db/models";
import { isInLanguage } from "../lib/agent/validators";
import type { LangCode } from "../lib/constants";
import { clearSimulation, simulate21Days } from "../lib/simulate";

async function main() {
  await connectDB();
  const [b, c, l, m, e, r] = await Promise.all([
    Booking.deleteMany({}),
    Call.deleteMany({ simulated: false }),
    CreditLedger.deleteMany({ simulated: false }),
    Message.deleteMany({}),
    Event.deleteMany({ simulated: false }),
    RateLimit.deleteMany({}),
  ]);
  await Lead.updateMany({}, { $set: { status: "counselled" } });
  await Lead.updateMany({ featured: true }, { $set: { consent_whatsapp: true } }); // undo a STOP sent during a demo
  await Ambassador.updateMany({}, { $set: { calls_this_week: 0 } });
  await Ambassador.updateOne({ code: "amb_05" }, { $set: { calls_this_week: 3 } }); // one parent at the weekly cap
  // Restore each family's original agent-written offer; drop cached translations that fail today's validator.
  let dropped = 0;
  for (const m of await Match.find({ family_message: { $ne: null } })) {
    const variants = (m.family_message_variants ?? {}) as Record<string, { body: string; at: Date }>;
    const clean = Object.fromEntries(
      Object.entries(variants).filter(([lang, v]) => isInLanguage(v.body, lang as LangCode, lang === "en" ? 0.9 : 0.5) || (dropped++, false))
    );
    const run = m.agent_run_id ? await AgentRun.findById(m.agent_run_id).select("final_output").lean() : null;
    const original = (run?.final_output as { family_message?: { language: string; body: string } } | null)?.family_message;
    m.family_message_variants = clean;
    if (original) m.family_message = original;
    m.markModified("family_message_variants");
    m.markModified("family_message");
    await m.save();
  }
  console.log(`Restored original offers; dropped ${dropped} invalid cached translations`);
  if (process.argv.includes("--drop-manual")) {
    const d = await Lead.deleteMany({ source: "manual" });
    console.log(`Deleted ${d.deletedCount} reviewer-added leads`);
  }
  console.log(
    `Removed: ${b.deletedCount} bookings, ${c.deletedCount} calls, ${l.deletedCount} credits, ${m.deletedCount} messages, ${e.deletedCount} real events, ${r.deletedCount} rate-limit counters`
  );
  if (process.argv.includes("--no-sim")) {
    await clearSimulation();
    console.log("Simulation cleared.");
  } else {
    const seedArg = process.argv.find((a) => a.startsWith("--seed="));
    const s = await simulate21Days(seedArg ? Number(seedArg.split("=")[1]) : Number(process.env.DEMO_SIM_SEED ?? 97));
    console.log(`Simulation re-run (seed ${s.seed}): ${s.counts.events} events, ${s.counts.calls} calls`);
  }
  await disconnectDB();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
