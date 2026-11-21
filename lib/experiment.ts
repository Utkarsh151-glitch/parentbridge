import { connectDB } from "@/lib/db/connect";
import { Ambassador, Call, CreditLedger, Event, Lead, Meta } from "@/lib/db/models";
import { EXPERIMENT, langName } from "@/lib/constants";

export type View = "all" | "real" | "simulated";
type Arm = "treatment" | "control";
const DAY = 86_400_000;

export type StageCount = { total: number; simulated: number };
export type ArmStats = {
  n: number;
  offered: StageCount;
  accepted: StageCount;
  call_done: StageCount;
  seat14: StageCount;
  seat_any: number;
  withdrawn: number;
  conversion: number;
  withdrawal_rate: number;
};

export type Gate = { label: string; value: string; target: string; pass: boolean | null };
export type Verdict = { status: "win" | "kill" | "inconclusive" | "insufficient"; headline: string; detail: string; gates: Gate[] };

export type Breakdown = { key: string; label: string; nT: number; nC: number; seatsT: number; seatsC: number; convT: number; convC: number; lift: number | null };

export type AmbassadorRow = {
  id: string;
  code: string;
  name: string;
  district: string;
  calls: number;
  credit_inr: number;
  avg_trust: number | null;
  ratings: number;
  red_flags: number;
  load: string;
};

export type Dashboard = {
  view: View;
  arms: Record<Arm, ArmStats>;
  lift: number | null;
  acceptance: number | null;
  verdict: Verdict;
  stats: { diff: number; ci_low: number; ci_high: number; p_value: number | null };
  byDistrict: Breakdown[];
  byLanguage: Breakdown[];
  ambassadors: AmbassadorRow[];
  cost: { credits_treatment: number; extra_seats: number; per_extra_seat: number | null; calls: number };
  simulation: { seed: number; ran_at: string; start_at: string; params: Record<string, number>; counts: Record<string, number> } | null;
  has_simulated: boolean;
  real_event_count: number;
};

function erf(x: number) {
  // Abramowitz–Stegun 7.1.26
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

function twoProportion(x1: number, n1: number, x2: number, n2: number) {
  const p1 = n1 ? x1 / n1 : 0;
  const p2 = n2 ? x2 / n2 : 0;
  const pool = n1 + n2 ? (x1 + x2) / (n1 + n2) : 0;
  const se0 = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2));
  const z = se0 > 0 ? (p1 - p2) / se0 : 0;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  return { diff: p1 - p2, ci_low: p1 - p2 - 1.96 * se, ci_high: p1 - p2 + 1.96 * se, p_value: se0 > 0 ? 2 * (1 - phi(Math.abs(z))) : null };
}

const pct = (x: number | null) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);

export async function computeDashboard(view: View = "all"): Promise<Dashboard> {
  await connectDB();
  const simFilter = view === "all" ? {} : { simulated: view === "simulated" };
  const [leads, events, calls, ledger, ambassadors, meta, hasSim, realCount] = await Promise.all([
    Lead.find({ in_experiment: true }).select("_id arm district district_key language").lean(),
    Event.find(simFilter).select("lead_id type at simulated").lean(),
    Call.find(simFilter).select("_id lead_id ambassador_id trust_rating ai_summary simulated").lean(),
    CreditLedger.find(simFilter).select("ambassador_id call_id amount_inr").lean(),
    Ambassador.find().select("_id code name district calls_this_week max_calls_per_week").lean(),
    Meta.findOne({ key: "simulation" }).lean(),
    Event.exists({ simulated: true }),
    Event.countDocuments({ simulated: false }),
  ]);
  const sim = (meta?.value ?? null) as Dashboard["simulation"];
  const simStart = sim ? new Date(sim.start_at).getTime() : null;

  // earliest event per lead per type
  const byLead = new Map<string, Map<string, { at: number; simulated: boolean }>>();
  for (const e of events) {
    const k = String(e.lead_id);
    const m = byLead.get(k) ?? new Map();
    const prev = m.get(e.type);
    const t = new Date(e.at).getTime();
    if (!prev || t < prev.at) m.set(e.type, { at: t, simulated: !!e.simulated });
    byLead.set(k, m);
  }

  const blank = (): ArmStats => ({
    n: 0,
    offered: { total: 0, simulated: 0 },
    accepted: { total: 0, simulated: 0 },
    call_done: { total: 0, simulated: 0 },
    seat14: { total: 0, simulated: 0 },
    seat_any: 0,
    withdrawn: 0,
    conversion: 0,
    withdrawal_rate: 0,
  });
  const arms: Record<Arm, ArmStats> = { treatment: blank(), control: blank() };
  const dist = new Map<string, Breakdown>();
  const lang = new Map<string, Breakdown>();
  const bump = (map: Map<string, Breakdown>, key: string, label: string, arm: Arm, seat: boolean) => {
    const b = map.get(key) ?? { key, label, nT: 0, nC: 0, seatsT: 0, seatsC: 0, convT: 0, convC: 0, lift: null };
    if (arm === "treatment") {
      b.nT++;
      if (seat) b.seatsT++;
    } else {
      b.nC++;
      if (seat) b.seatsC++;
    }
    map.set(key, b);
  };
  const leadArm = new Map<string, Arm>();

  for (const l of leads) {
    const arm = l.arm as Arm;
    leadArm.set(String(l._id), arm);
    const a = arms[arm];
    a.n++;
    const ev = byLead.get(String(l._id));
    const count = (stage: "offered" | "accepted" | "call_done", type: string) => {
      const e = ev?.get(type);
      if (e) {
        a[stage].total++;
        if (e.simulated) a[stage].simulated++;
      }
    };
    count("offered", "offered");
    count("accepted", "accepted");
    count("call_done", "call_done");
    const seat = ev?.get("seat_reserved");
    let in14 = false;
    if (seat) {
      a.seat_any++;
      const t0 = ev?.get("offered")?.at ?? (seat.simulated && simStart ? simStart : seat.at);
      in14 = seat.at - t0 <= EXPERIMENT.windowDays * DAY;
      if (in14) {
        a.seat14.total++;
        if (seat.simulated) a.seat14.simulated++;
      }
      if (ev?.get("withdrawn_30d")) a.withdrawn++;
    }
    bump(dist, l.district_key || "unknown", l.district || "Unknown", arm, in14);
    bump(lang, l.language, langName(l.language), arm, in14);
  }
  for (const a of Object.values(arms)) {
    a.conversion = a.n ? a.seat14.total / a.n : 0;
    a.withdrawal_rate = a.seat_any ? a.withdrawn / a.seat_any : 0;
  }
  const T = arms.treatment;
  const C = arms.control;
  const lift = C.conversion > 0 ? T.conversion / C.conversion : null;
  const acceptance = T.offered.total ? T.accepted.total / T.offered.total : null;
  const stats = twoProportion(T.seat14.total, T.n, C.seat14.total, C.n);
  const wd = twoProportion(T.withdrawn, T.seat_any, C.withdrawn, C.seat_any);

  const gates: Gate[] = [
    { label: "Treatment converts ≥ 15% in 14 days", value: pct(T.conversion), target: "≥ 15%", pass: T.n ? T.conversion >= EXPERIMENT.winMinConversion : null },
    { label: "Lift vs control ≥ 1.5×", value: lift == null ? "—" : `${lift.toFixed(2)}×`, target: "≥ 1.5× (kill < 1.2×)", pass: lift == null ? null : lift >= EXPERIMENT.winMinLift },
    { label: "≥ 30% of offered families take the call", value: pct(acceptance), target: "≥ 30%", pass: acceptance == null ? null : acceptance >= EXPERIMENT.minCallAcceptance },
    {
      // Guardrail on small counts: fail only on a statistically detectable rise (one-sided p < 0.05).
      label: "No rise in 30-day withdrawals vs control",
      value: `${pct(T.withdrawal_rate)} vs ${pct(C.withdrawal_rate)}${wd.p_value != null && T.withdrawal_rate > C.withdrawal_rate ? ` (p=${(wd.p_value / 2).toFixed(2)})` : ""}`,
      target: "no significant rise (one-sided p ≥ 0.05)",
      pass:
        T.seat_any && C.seat_any
          ? T.withdrawal_rate <= C.withdrawal_rate || wd.p_value == null || wd.p_value / 2 >= 0.05
          : null,
    },
  ];
  let verdict: Verdict;
  const totalSeats = T.seat14.total + C.seat14.total;
  if (!events.length || totalSeats === 0 || C.seat14.total === 0) {
    verdict = {
      status: "insufficient",
      headline: "Not enough data yet",
      detail: view === "real" ? "Only real events are shown — run the pilot (or switch to Simulated) to fill the funnel." : "Press “Simulate 21 days” to generate a plausible pilot.",
      gates,
    };
  } else if (lift != null && lift < EXPERIMENT.killBelowLift) {
    verdict = { status: "kill", headline: "Kill", detail: `Lift ${lift.toFixed(2)}× is below the 1.2× kill line.`, gates };
  } else if (gates.every((g) => g.pass)) {
    verdict = { status: "win", headline: "Win — scale it", detail: "All four Layer-2 thresholds are met.", gates };
  } else {
    const failing = gates.filter((g) => g.pass === false).map((g) => g.label);
    verdict = { status: "inconclusive", headline: "Inconclusive — keep iterating", detail: `Not yet met: ${failing.join("; ")}.`, gates };
  }

  const finish = (map: Map<string, Breakdown>) =>
    [...map.values()]
      .map((b) => {
        b.convT = b.nT ? b.seatsT / b.nT : 0;
        b.convC = b.nC ? b.seatsC / b.nC : 0;
        b.lift = b.convC > 0 ? b.convT / b.convC : null;
        return b;
      })
      .sort((x, y) => y.nT + y.nC - (x.nT + x.nC));

  // Ambassador table
  const credit = new Map<string, number>();
  for (const c of ledger) credit.set(String(c.ambassador_id), (credit.get(String(c.ambassador_id)) ?? 0) + (c.amount_inr ?? 0));
  const agg = new Map<string, { calls: number; ratingSum: number; ratings: number; flags: number }>();
  for (const c of calls) {
    const k = String(c.ambassador_id);
    const a = agg.get(k) ?? { calls: 0, ratingSum: 0, ratings: 0, flags: 0 };
    a.calls++;
    if (c.trust_rating) {
      a.ratingSum += c.trust_rating;
      a.ratings++;
    }
    const s = c.ai_summary as { red_flags?: string[]; red_flags_detected?: unknown[] } | null;
    if ((s?.red_flags?.length ?? 0) + (s?.red_flags_detected?.length ?? 0) > 0) a.flags++;
    agg.set(k, a);
  }
  const ambRows: AmbassadorRow[] = ambassadors
    .map((a) => {
      const g = agg.get(String(a._id)) ?? { calls: 0, ratingSum: 0, ratings: 0, flags: 0 };
      return {
        id: String(a._id),
        code: a.code,
        name: a.name,
        district: a.district,
        calls: g.calls,
        credit_inr: credit.get(String(a._id)) ?? 0,
        avg_trust: g.ratings ? g.ratingSum / g.ratings : null,
        ratings: g.ratings,
        red_flags: g.flags,
        load: `${a.calls_this_week}/${a.max_calls_per_week}`,
      };
    })
    .sort((x, y) => y.calls - x.calls || y.red_flags - x.red_flags);

  // Cost per extra seat = ambassador credits spent on treatment families ÷ seats above the control rate
  const callLead = new Map(calls.map((c) => [String(c._id), String(c.lead_id)]));
  let creditsT = 0;
  let callsT = 0;
  for (const l of ledger) {
    const leadId = callLead.get(String(l.call_id));
    if (leadId && leadArm.get(leadId) === "treatment") {
      creditsT += l.amount_inr ?? 0;
      callsT++;
    }
  }
  const extra = T.seat14.total - C.conversion * T.n;

  return {
    view,
    arms,
    lift,
    acceptance,
    verdict,
    stats,
    byDistrict: finish(dist),
    byLanguage: finish(lang),
    ambassadors: ambRows,
    cost: { credits_treatment: creditsT, extra_seats: extra, per_extra_seat: extra > 0.5 ? creditsT / extra : null, calls: callsT },
    simulation: sim ? JSON.parse(JSON.stringify(sim)) : null,
    has_simulated: !!hasSim,
    real_event_count: realCount,
  };
}
