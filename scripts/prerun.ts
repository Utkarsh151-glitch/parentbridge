/**
 * Pre-run the agent so reviewers find saved runs (★) that open instantly without spending AI quota:
 * every showcase family plus one treatment family per district.
 *   npm run demo:prerun
 */
import "./env";
import { connectDB, disconnectDB } from "../lib/db/connect";
import { Lead } from "../lib/db/models";
import { runMatchAgent } from "../lib/agent/matchAgent";

async function main() {
  await connectDB();
  const featured = await Lead.find({ featured: true, last_match_run_id: null }).select("_id student_name district").lean();
  const perDistrict = await Lead.aggregate([
    { $match: { arm: "treatment", featured: false, source: "seed" } },
    { $sort: { counselling_date: 1 } },
    { $group: { _id: "$district_key", lead: { $first: "$$ROOT" }, ran: { $max: { $cond: [{ $ne: ["$last_match_run_id", null] }, 1, 0] } } } },
    { $match: { ran: 0 } },
  ]);
  const todo = [...featured, ...perDistrict.map((g) => g.lead)];
  console.log(`Pre-running ${todo.length} families…`);
  for (const l of todo) {
    const t0 = Date.now();
    const r = await runMatchAgent({ leadId: String(l._id) });
    console.log(`${r.ok ? "✓" : "✗"} ${l.student_name} (${l.district}) ${((Date.now() - t0) / 1000).toFixed(1)} s${r.ok ? ` → ${r.final?.match.ambassador_name}` : ` — ${r.error}`}`);
    await new Promise((res) => setTimeout(res, 4000)); // stay under free-tier requests/minute
  }
  await disconnectDB();
}

main().catch(async (e) => {
  console.error(e);
  await disconnectDB();
  process.exit(1);
});
