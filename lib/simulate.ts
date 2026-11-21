import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Ambassador, Call, CreditLedger, Event, Lead, Meta } from "@/lib/db/models";
import { CREDIT_PER_CALL_INR } from "@/lib/constants";

/** Plausible funnel probabilities (assumptions, shown on the dashboard). */
export const SIM_PARAMS = {
  reach: 0.93, // treatment family reachable on WhatsApp → offered
  accept: 0.38, // offered → books a call
  show: 0.86, // booked → call happens
  seatAfterCall: 0.4, // reserve a seat within 21 days after a call
  seatOfferedNoCall: 0.11,
  seatNotOffered: 0.08,
  seatControl: 0.105, // business-as-usual counsellor follow-up
  within14: 0.85, // share of 21-day conversions that land inside the 14-day window
  withdrawTreatment: 0.05,
  withdrawControl: 0.06,
  redFlagRate: 0.03,
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;

export async function clearSimulation() {
  await connectDB();
  const calls = await Call.find({ simulated: true }).select("_id").lean();
  await CreditLedger.deleteMany({ $or: [{ simulated: true }, { call_id: { $in: calls.map((c) => c._id) } }] });
  await Call.deleteMany({ simulated: true });
  await Event.deleteMany({ simulated: true });
  await Meta.deleteOne({ key: "simulation" });
}

export async function simulate21Days(seed = Date.now() % 2_147_483_647) {
  await connectDB();
  await clearSimulation();
  const rng = mulberry32(seed);
  const P = SIM_PARAMS;
  const now = Date.now();
  const start = now - 21 * DAY;

  const [leads, realEventLeads, ambassadors] = await Promise.all([
    Lead.find({ in_experiment: true }).select("_id arm district_key").lean(),
    Event.distinct("lead_id", { simulated: false }),
    Ambassador.find({ active: true, consent_given: true }).select("_id district_key").lean(),
  ]);
  const hasReal = new Set(realEventLeads.map(String));
  const byKey = ambassadors.reduce<Record<string, Types.ObjectId[]>>((m, a) => ((m[a.district_key] ??= []).push(a._id), m), {});
  const pickAmb = (key: string) => {
    const pool = byKey[key]?.length ? byKey[key] : ambassadors.map((a) => a._id);
    return pool[Math.floor(rng() * pool.length)];
  };
  const pickRating = (converted: boolean) => {
    const w = converted ? [0, 0.02, 0.1, 0.38, 0.5] : [0.05, 0.1, 0.3, 0.35, 0.2];
    let r = rng();
    for (let i = 0; i < 5; i++) if ((r -= w[i]) <= 0) return i + 1;
    return 4;
  };
  const at = (day: number) => new Date(Math.min(start + day * DAY, now - 60_000));
  const seatDay = (t0Day: number) => (rng() < P.within14 ? t0Day + 1 + rng() * 12.5 : t0Day + 14.2 + rng() * (20.5 - 14.2 - t0Day));

  const events: Array<Record<string, unknown>> = [];
  const calls: Array<Record<string, unknown>> = [];
  const ledger: Array<Record<string, unknown>> = [];
  const ev = (lead_id: Types.ObjectId, arm: string, type: string, day: number) =>
    events.push({ lead_id, arm, type, at: at(day), simulated: true });

  for (const l of leads) {
    if (hasReal.has(String(l._id))) continue; // real data wins
    if (l.arm === "control") {
      if (rng() < P.seatControl) {
        const d = seatDay(0);
        ev(l._id, "control", "seat_reserved", d);
        if (rng() < P.withdrawControl) ev(l._id, "control", "withdrawn_30d", Math.min(d + 3 + rng() * 10, 20.9));
      }
      continue;
    }
    // treatment
    let seatP = P.seatNotOffered;
    let t0 = 0;
    if (rng() < P.reach) {
      t0 = rng() * 1.5;
      ev(l._id, "treatment", "offered", t0);
      seatP = P.seatOfferedNoCall;
      if (rng() < P.accept) {
        const acc = t0 + rng() * 2;
        ev(l._id, "treatment", "accepted", acc);
        if (rng() < P.show) {
          const cd = acc + 0.5 + rng() * 1.5;
          ev(l._id, "treatment", "call_done", cd);
          seatP = P.seatAfterCall;
          const callId = new Types.ObjectId();
          const ambId = pickAmb(l.district_key);
          const red = rng() < P.redFlagRate;
          calls.push({
            _id: callId,
            lead_id: l._id,
            ambassador_id: ambId,
            ambassador_notes: "(simulated call)",
            ai_summary: { simulated: true, red_flags: red ? ["(simulated) Told the family placement is 'almost guaranteed'"] : [], red_flags_detected: [] },
            summary_status: "done",
            duration_min: 15 + Math.floor(rng() * 15),
            simulated: true,
            createdAt: at(cd),
            _converted: false,
          });
          ledger.push({ ambassador_id: ambId, call_id: callId, amount_inr: CREDIT_PER_CALL_INR, reason: "Completed parent call (simulated)", simulated: true });
        }
      }
    }
    if (rng() < seatP) {
      const d = seatDay(t0);
      ev(l._id, "treatment", "seat_reserved", d);
      const c = calls.find((x) => String(x.lead_id) === String(l._id));
      if (c) c._converted = true;
      if (rng() < P.withdrawTreatment) ev(l._id, "treatment", "withdrawn_30d", Math.min(d + 3 + rng() * 10, 20.9));
    }
  }
  for (const c of calls) {
    c.trust_rating = rng() < 0.85 ? pickRating(!!c._converted) : null; // some families never rate
    delete c._converted;
  }

  if (events.length) await Event.insertMany(events);
  if (calls.length) await Call.insertMany(calls);
  if (ledger.length) await CreditLedger.insertMany(ledger);
  const summary = { seed, ran_at: new Date(now), start_at: new Date(start), params: P, counts: { events: events.length, calls: calls.length, skipped_real: hasReal.size } };
  await Meta.updateOne({ key: "simulation" }, { $set: { value: summary } }, { upsert: true });
  return summary;
}
