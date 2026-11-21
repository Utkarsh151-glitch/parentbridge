import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CheckCircle2, CircleDashed, CircleHelp, ShieldAlert, TrendingUp, XCircle } from "lucide-react";
import { computeDashboard, type Breakdown, type Dashboard, type StageCount, type View } from "@/lib/experiment";
import { SimulateButtons } from "@/components/dashboard-controls";
import { PageTitle, inr } from "@/components/pb";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Experiment dashboard" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function DashboardPage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageTitle
        title="Experiment dashboard"
        sub="400 stalled leads, randomly split 200 treatment (ParentBridge call offer) / 200 control (business as usual). Conversion = seat reserved within 14 days."
      />
      <Suspense fallback={<DashSkeleton />}>
        <DashboardBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function DashSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

const pct = (x: number | null | undefined, d = 1) => (x == null ? "—" : `${(x * 100).toFixed(d)}%`);

async function DashboardBody({ searchParams }: { searchParams: SP }) {
  await connection();
  const sp = await searchParams;
  const v = (Array.isArray(sp.view) ? sp.view[0] : sp.view) as View | undefined;
  const view: View = v === "real" || v === "simulated" ? v : "all";
  const d = await computeDashboard(view);
  const T = d.arms.treatment;
  const C = d.arms.control;

  return (
    <div className="mt-6 space-y-6">
      {/* Filters + actions — one row above the charts */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="inline-flex rounded-lg border p-0.5 text-sm" aria-label="Data shown">
          {(
            [
              ["all", "Real + simulated"],
              ["real", "Real only"],
              ["simulated", "Simulated only"],
            ] as const
          ).map(([k, label]) => (
            <Link
              key={k}
              href={k === "all" ? "/dashboard" : `/dashboard?view=${k}`}
              aria-current={view === k ? "page" : undefined}
              className={cn("rounded-md px-3 py-1.5", view === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {label}
            </Link>
          ))}
        </nav>
        <SimulateButtons hasSimulated={d.has_simulated} />
      </div>

      {d.has_simulated && view !== "real" && (
        <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <span className="hatch mr-2 inline-block h-3 w-6 rounded-sm bg-series-t align-middle" aria-hidden />
          Hatched bars and “sim” counts are <strong>simulated</strong> events (simulated = true), generated with plausible probabilities — not real
          outcomes. {d.real_event_count} real events from the live demo flow are included.
        </p>
      )}

      <VerdictCard d={d} />

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Treatment conversion" value={pct(T.conversion)} sub={`${T.seat14.total} of ${T.n} in 14 days`} swatch="bg-series-t" />
        <Stat label="Control conversion" value={pct(C.conversion)} sub={`${C.seat14.total} of ${C.n} in 14 days`} swatch="bg-series-c" />
        <Stat label="Lift (T ÷ C)" value={d.lift == null ? "—" : `${d.lift.toFixed(2)}×`} sub="win ≥ 1.5× · kill < 1.2×" />
        <Stat label="Call acceptance" value={pct(d.acceptance)} sub={`${T.accepted.total} of ${T.offered.total} offered`} />
        <Stat
          label="Cost per extra seat"
          value={d.cost.per_extra_seat == null ? "—" : inr(d.cost.per_extra_seat)}
          sub={`${inr(d.cost.credits_treatment)} credits ÷ ${d.cost.extra_seats.toFixed(1)} extra seats`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border bg-card p-5" aria-labelledby="conv-h">
          <h2 id="conv-h" className="text-base font-semibold">Conversion by arm (seat reserved ≤ 14 days)</h2>
          <Legend />
          <div className="mt-4 space-y-3">
            <HBar label="Treatment" value={T.conversion} max={Math.max(T.conversion, C.conversion, 0.2)} color="bg-series-t" text={`${pct(T.conversion)} · ${T.seat14.total}/${T.n}`} sim={T.seat14} />
            <HBar label="Control" value={C.conversion} max={Math.max(T.conversion, C.conversion, 0.2)} color="bg-series-c" text={`${pct(C.conversion)} · ${C.seat14.total}/${C.n}`} sim={C.seat14} />
            <ThresholdNote max={Math.max(T.conversion, C.conversion, 0.2)} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Difference {pct(d.stats.diff)} (95% CI {pct(d.stats.ci_low)} to {pct(d.stats.ci_high)}), two-proportion z-test p ={" "}
            {d.stats.p_value == null ? "—" : d.stats.p_value < 0.001 ? "< 0.001" : d.stats.p_value.toFixed(3)}. With 200 per arm the test is
            noisy — the decision uses the pre-registered thresholds, the p-value is reported for honesty.
          </p>
        </section>

        <section className="min-w-0 rounded-2xl border bg-card p-5" aria-labelledby="funnel-h">
          <h2 id="funnel-h" className="text-base font-semibold">Funnel per arm</h2>
          <Legend />
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Treatment · n = {T.n}</p>
            {(
              [
                ["Offered", T.offered],
                ["Accepted call", T.accepted],
                ["Call done", T.call_done],
                ["Seat reserved ≤ 14 d", T.seat14],
              ] as Array<[string, StageCount]>
            ).map(([label, s]) => (
              <HBar key={label} label={label} value={s.total / Math.max(T.n, 1)} max={1} color="bg-series-t" text={`${s.total} · ${pct(s.total / Math.max(T.n, 1), 0)}`} sim={s} />
            ))}
            <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Control · n = {C.n}</p>
            <p className="text-xs text-muted-foreground">No offer, no call — business-as-usual follow-up.</p>
            <HBar label="Seat reserved ≤ 14 d" value={C.seat14.total / Math.max(C.n, 1)} max={1} color="bg-series-c" text={`${C.seat14.total} · ${pct(C.conversion, 0)}`} sim={C.seat14} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownTable title="By district" rows={d.byDistrict} />
        <BreakdownTable title="By language" rows={d.byLanguage} />
      </div>

      <section className="min-w-0 rounded-2xl border bg-card p-5" aria-labelledby="amb-h">
        <h2 id="amb-h" className="text-base font-semibold">parent ambassadors (ambassadors)</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">₹1,500 fee credit per completed call — never per sale. Red flags come from the AI call summary plus a rule-based overpromise scan.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Parent</th>
                <th className="py-2 pr-3 font-medium">District</th>
                <th className="py-2 pr-3 text-right font-medium">Calls</th>
                <th className="py-2 pr-3 text-right font-medium">Credit earned</th>
                <th className="py-2 pr-3 text-right font-medium">Avg trust (1–5)</th>
                <th className="py-2 pr-3 text-right font-medium">Red flags</th>
                <th className="py-2 text-right font-medium">This week</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {d.ambassadors.map((a) => (
                <tr key={a.id} className={cn(a.red_flags > 0 && "bg-rose-50")}>
                  <td className="py-2 pr-3 font-medium">{a.name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{a.district}</td>
                  <td className="py-2 pr-3 text-right">{a.calls}</td>
                  <td className="py-2 pr-3 text-right">{inr(a.credit_inr)}</td>
                  <td className="py-2 pr-3 text-right">{a.avg_trust == null ? "—" : `${a.avg_trust.toFixed(1)} (${a.ratings})`}</td>
                  <td className="py-2 pr-3 text-right">
                    {a.red_flags > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-critical">
                        <ShieldAlert className="size-3.5" aria-hidden /> {a.red_flags}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-muted-foreground">{a.load}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {d.simulation && (
        <details className="rounded-2xl border bg-card p-5 text-sm">
          <summary className="cursor-pointer font-semibold">Simulation assumptions (seed {d.simulation.seed})</summary>
          <p className="mt-2 text-muted-foreground">
            Ran {new Date(d.simulation.ran_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST over a 21-day window. Families with real
            demo events ({d.simulation.counts.skipped_real}) keep their real data and are not simulated.
          </p>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-muted-foreground sm:grid-cols-2">
            {Object.entries(d.simulation.params).map(([k, val]) => (
              <li key={k} className="flex justify-between gap-3 border-b border-dashed py-1">
                <code className="text-xs">{k}</code>
                <span className="tabular-nums">{pct(val as number, 1)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function VerdictCard({ d }: { d: Dashboard }) {
  const v = d.verdict;
  const styles = {
    win: { icon: CheckCircle2, ring: "border-good/50 bg-emerald-50", ink: "text-[#006300]", label: "WIN" },
    kill: { icon: XCircle, ring: "border-critical/50 bg-rose-50", ink: "text-critical", label: "KILL" },
    inconclusive: { icon: CircleHelp, ring: "border-warning/60 bg-amber-50", ink: "text-amber-900", label: "INCONCLUSIVE" },
    insufficient: { icon: CircleDashed, ring: "border-dashed bg-card", ink: "text-muted-foreground", label: "NO DATA YET" },
  }[v.status];
  const Icon = styles.icon;
  return (
    <section className={cn("rounded-2xl border-2 p-5", styles.ring)} aria-labelledby="verdict-h">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Icon className={cn("mt-0.5 size-7 shrink-0", styles.ink)} aria-hidden />
          <div>
            <p className={cn("text-xs font-bold tracking-widest", styles.ink)}>{styles.label}</p>
            <h2 id="verdict-h" className="text-xl font-semibold">
              {v.headline}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{v.detail}</p>
          </div>
        </div>
        <ul className="grid gap-1.5 text-sm lg:min-w-[26rem]">
          {v.gates.map((g) => (
            <li key={g.label} className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-1.5">
              <span className="flex items-center gap-2">
                {g.pass == null ? (
                  <CircleDashed className="size-4 text-muted-foreground" aria-label="no data" />
                ) : g.pass ? (
                  <CheckCircle2 className="size-4 text-good" aria-label="pass" />
                ) : (
                  <XCircle className="size-4 text-critical" aria-label="fail" />
                )}
                {g.label}
              </span>
              <span className="shrink-0 tabular-nums font-medium">{g.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, swatch }: { label: string; value: string; sub: string; swatch?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {swatch && <span className={cn("inline-block size-2.5 rounded-sm", swatch)} aria-hidden />}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-4 rounded-sm bg-series-t" aria-hidden /> Treatment
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-4 rounded-sm bg-series-c" aria-hidden /> Control
      </span>
      <span className="flex items-center gap-1.5">
        <span className="hatch inline-block h-2.5 w-4 rounded-sm bg-[#898781]" aria-hidden /> Simulated share
      </span>
    </div>
  );
}

/** Horizontal bar anchored at the baseline; the simulated share is the hatched segment (texture, not colour alone). */
function HBar({ label, value, max, color, text, sim }: { label: string; value: number; max: number; color: string; text: string; sim?: StageCount }) {
  const w = max > 0 ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
  const simShare = sim && sim.total ? sim.simulated / sim.total : 0;
  const realW = w * (1 - simShare);
  const simW = w * simShare;
  return (
    <div className="group relative grid grid-cols-[7.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr]" tabIndex={0}>
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <div className="relative h-4 flex-1 rounded-r-[4px] bg-[linear-gradient(to_right,var(--viz-axis)_1px,transparent_1px)]">
          <div className="flex h-full gap-[2px]" style={{ width: `${w}%` }}>
            {realW > 0 && <div className={cn("h-full", color, simW > 0 ? "" : "rounded-r-[4px]")} style={{ width: `${(realW / w) * 100}%` }} />}
            {simW > 0 && <div className={cn("hatch h-full rounded-r-[4px]", color)} style={{ width: `${(simW / w) * 100}%` }} />}
          </div>
        </div>
        <span className="w-28 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{text}</span>
      </div>
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden max-w-full rounded-md bg-neutral-900 px-2 py-1 text-xs text-white shadow group-hover:block group-focus:block"
      >
        {label}: {text}
        {sim && sim.total > 0 && ` · ${sim.total - sim.simulated} real, ${sim.simulated} simulated`}
      </div>
    </div>
  );
}

function ThresholdNote({ max }: { max: number }) {
  return (
    <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
      <TrendingUp className="size-3.5" aria-hidden /> Win needs treatment ≥ 15% (bar scale 0–{Math.round(max * 100)}%).
    </p>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: Breakdown[] }) {
  const max = Math.max(0.01, ...rows.flatMap((r) => [r.convT, r.convC]));
  return (
    <section className="min-w-0 rounded-2xl border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <Legend />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-medium">{title.replace("By ", "")}</th>
              <th className="py-2 pr-3 text-right font-medium">n (T / C)</th>
              <th className="py-2 pr-3 font-medium">Conversion</th>
              <th className="py-2 text-right font-medium">Lift</th>
            </tr>
          </thead>
          <tbody className="divide-y tabular-nums">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="py-2 pr-3">{r.label}</td>
                <td className="py-2 pr-3 text-right text-muted-foreground">
                  {r.nT} / {r.nC}
                </td>
                <td className="py-2 pr-3">
                  <div className="space-y-[2px]" title={`Treatment ${pct(r.convT)} (${r.seatsT}/${r.nT}) · Control ${pct(r.convC)} (${r.seatsC}/${r.nC})`}>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 rounded-r-[4px] bg-series-t" style={{ width: `${(r.convT / max) * 70}%`, minWidth: r.convT ? 2 : 0 }} />
                      <span className="text-[11px] text-muted-foreground">{pct(r.convT, 0)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 rounded-r-[4px] bg-series-c" style={{ width: `${(r.convC / max) * 70}%`, minWidth: r.convC ? 2 : 0 }} />
                      <span className="text-[11px] text-muted-foreground">{pct(r.convC, 0)}</span>
                    </div>
                  </div>
                </td>
                <td className="py-2 text-right">{r.lift == null ? "—" : `${r.lift.toFixed(1)}×`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Small cells are noisy — read these as directional, not significant.</p>
    </section>
  );
}
