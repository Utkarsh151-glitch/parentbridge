"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Circle,
  Database,
  ExternalLink,
  FileText,
  Handshake,
  ListOrdered,
  Loader2,
  MapPin,
  MessageCircle,
  Quote,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Star,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BriefView, type Brief } from "@/components/brief-view";
import { QRCodeSVG } from "qrcode.react";
import { PhoneMock } from "@/components/phone-mock";
import { LangChip, Pill, StatusChip, daysSince } from "@/components/pb";
import { DOUBT_LABELS, FEE_BANDS, LANGUAGES, LANG_CODES, langName, type DoubtCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─── Types (plain JSON from the server) ───────────────────────────────────────
type ToolItem = {
  kind: "tool";
  i: number;
  turn: number;
  tool: string;
  args: Record<string, unknown>;
  result?: unknown;
  ok?: boolean;
  ms?: number;
  summary?: string;
  source?: string;
  pending?: boolean;
};
type TurnItem = {
  kind: "llm";
  turn: number;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  ms: number;
  tool_calls: string[];
  text?: string;
  fallback?: string;
};
type Item = ToolItem | TurnItem;
type Totals = { provider: string; model: string; input_tokens: number; output_tokens: number; llm_calls: number; duration_ms: number };
type Doubt = { category: string; evidence_quote: string; severity: number; quote_verified: boolean };
type Final = {
  match: {
    match_id: string;
    ambassador_id: string;
    ambassador_name: string;
    score: number;
    reasons: string[];
    facts: Record<string, unknown>;
    other_candidates: Array<{ ambassador_id: string; name: string; score: number; reasons: string[] }>;
  };
  brief: Brief;
  family_message: { language: string; body: string };
  doubts: Doubt[];
};
type Run = {
  _id: string;
  status: "running" | "done" | "error";
  steps: Item[];
  final_output: Final | null;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  llm_calls: number;
  duration_ms: number;
  error: string | null;
  createdAt: string;
};
type Msg = {
  _id: string;
  direction: string;
  audience: string;
  kind: string;
  channel: string;
  language: string;
  body: string;
  status: string;
  fallback_reason: string | null;
  wa_link: string;
  to_masked: string;
  createdAt: string;
};
export type LeadView = {
  lead: {
    _id: string;
    student_name: string;
    parent_name: string;
    pincode: string;
    district: string;
    state: string;
    language: string;
    preferred_university: string;
    fee_band: keyof typeof FEE_BANDS;
    counselling_date: string;
    counselling_notes: string;
    status: string;
    arm: string;
    consent_whatsapp: boolean;
    source: string;
    in_experiment: boolean;
  };
  run: Run | null;
  lastGood: Run | null;
  match: { _id: string; brief: Brief | null; family_message: { language: string; body: string } | null; family_message_variants?: Record<string, unknown> } | null;
  ambassador: {
    name: string;
    district: string;
    state: string;
    child_name: string;
    child_year: number;
    university: string;
    campus_city: string;
    languages: string[];
    bio: string;
  } | null;
  others: Array<{ code: string; name: string; district: string; child_year: number; university: string; languages: string[] }>;
  messages: Msg[];
  booking: { _id: string; token: string; ambassador_token: string; status: string; slot_start: string | null; meet_link: string } | null;
  call: { _id: string; ai_summary: Record<string, unknown> | null; trust_rating: number | null } | null;
  doubts: unknown[];
};

const TOOL_ICON: Record<string, typeof Bot> = {
  get_lead: Database,
  extract_doubts: Quote,
  resolve_district: MapPin,
  search_ambassadors: Search,
  score_candidates: ListOrdered,
  create_match: Handshake,
  write_ambassador_brief: FileText,
  draft_family_message: MessageCircle,
};

function argSummary(tool: string, a: Record<string, unknown>): string {
  const s = (v: unknown) => String(v ?? "");
  switch (tool) {
    case "get_lead":
      return `…${s(a.lead_id).slice(-6)}`;
    case "resolve_district":
      return s(a.pincode);
    case "extract_doubts":
      return `${(a.doubts as unknown[] | undefined)?.length ?? 0} doubts`;
    case "search_ambassadors":
      return [a.district, a.language, a.university].filter(Boolean).map(s).join(", ");
    case "score_candidates":
      return `${(a.scores as unknown[] | undefined)?.length ?? 0} candidates`;
    case "create_match":
      return `${s(a.ambassador_id)}, score ${s(a.score)}`;
    case "write_ambassador_brief":
      return `${s(a.ambassador_id)}, ${langName(s(a.language))}`;
    case "draft_family_message":
      return langName(s(a.language));
    default:
      return "";
  }
}

function sourceTone(src?: string): "good" | "warn" | "info" | "muted" {
  if (!src) return "muted";
  if (/india post/i.test(src)) return "good";
  if (/cache/i.test(src)) return "warn";
  if (/mongo/i.test(src)) return "info";
  return "muted";
}

const fmtMs = (ms?: number) => (ms == null ? "" : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

function itemsFromRun(run: Run | null): Item[] {
  return (run?.steps ?? []).map((s) => ({ ...s, kind: (s as { kind?: string }).kind === "llm" ? "llm" : "tool" }) as Item);
}

function totalsFromRun(run: Run | null): Totals | null {
  if (!run || run.status !== "done") return null;
  return {
    provider: run.provider,
    model: run.model,
    input_tokens: run.input_tokens,
    output_tokens: run.output_tokens,
    llm_calls: run.llm_calls,
    duration_ms: run.duration_ms,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AgentRunView({ data, autoRun }: { data: LeadView; autoRun: boolean }) {
  const router = useRouter();
  const { lead } = data;
  const isControl = lead.arm !== "treatment";
  const shown = data.run?.status === "error" && data.lastGood ? data.lastGood : data.run;

  const [items, setItems] = useState<Item[]>(() => itemsFromRun(shown));
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(() =>
    !data.run ? "idle" : data.run.status === "done" ? "done" : data.run.status === "error" ? "error" : "idle"
  );
  const [final, setFinal] = useState<Final | null>(() => data.lastGood?.final_output ?? null);
  const [totals, setTotals] = useState<Totals | null>(() => totalsFromRun(data.lastGood));
  const [error, setError] = useState<{ message: string; limited?: boolean } | null>(() =>
    data.run?.status === "error" ? { message: data.run.error ?? "The last run failed." } : null
  );
  const [cached, setCached] = useState<boolean>(!!data.run && data.run.status === "done");
  const started = useRef(false);

  const runAgent = useCallback(async () => {
    setPhase("running");
    setItems([]);
    setError(null);
    setCached(false);
    let finished = false;
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead._id }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        setError({ message: j.error ?? `Request failed (${res.status})`, limited: res.status === 429 });
        setPhase("error");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          if (!chunk.startsWith("data: ")) continue;
          const e = JSON.parse(chunk.slice(6));
          if (e.type === "llm") setItems((xs) => [...xs, { kind: "llm", ...e.turn }]);
          else if (e.type === "step_started")
            setItems((xs) => [...xs, { kind: "tool", i: e.i, turn: e.turn, tool: e.tool, args: e.args, pending: true }]);
          else if (e.type === "step")
            setItems((xs) => xs.map((x) => (x.kind === "tool" && x.i === e.step.i ? { kind: "tool", ...e.step } : x)));
          else if (e.type === "done") {
            finished = true;
            setFinal(e.final_output);
            setTotals(e.totals);
            setPhase("done");
            router.refresh();
          } else if (e.type === "error") {
            finished = true;
            setError({ message: e.message, limited: e.rate_limited });
            setPhase("error");
          }
        }
      }
      if (!finished) {
        setError({ message: "Connection closed before the agent finished. The run may still complete — refresh in a minute." });
        setPhase("error");
      }
    } catch (e) {
      setError({ message: (e as Error).message });
      setPhase("error");
    }
  }, [lead._id, router]);

  useEffect(() => {
    if (autoRun && !started.current) {
      started.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      if (!data.run && !isControl) setTimeout(() => void runAgent(), 0);
    }
  }, [autoRun, data.run, isControl, runAgent]);

  const running = phase === "running";

  return (
    <div className="mt-3 space-y-5">
      <FamilyCard data={data} />

      {isControl ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Control arm.</strong> This family gets business-as-usual counsellor follow-up only — no ParentBridge outreach — so the
          experiment stays clean.
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {running ? (
              <span className="flex items-center gap-2 font-medium text-primary">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Agent running — streaming each tool call…
              </span>
            ) : totals ? (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                {cached && (
                  <Pill tone="info">
                    <Star className="size-3 fill-current" aria-hidden /> Saved run — no AI quota used
                  </Pill>
                )}
                <span>
                  Answered by <strong className="text-foreground">{totals.provider}</strong> · <code className="text-xs">{totals.model}</code>
                </span>
                <span>{totals.llm_calls} model calls</span>
                <span>
                  {totals.input_tokens.toLocaleString()} in / {totals.output_tokens.toLocaleString()} out tokens
                </span>
                <span>{fmtMs(totals.duration_ms)}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">The agent hasn’t run for this family yet.</span>
            )}
          </div>
          <Button onClick={runAgent} disabled={running} size="lg" className="shrink-0">
            {running ? <Loader2 className="animate-spin" /> : final ? <RefreshCw /> : <Bot />}
            {final ? "Run again" : "Run agent"}
          </Button>
        </div>
      )}

      {error && phase !== "running" && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {error.message}
              {error.limited && (
                <>
                  {" "}
                  <Link href="/console?saved=1" className="font-medium underline">
                    Browse saved runs
                  </Link>
                </>
              )}
            </span>
          </p>
          {!error.limited && (
            <Button variant="outline" onClick={runAgent} className="shrink-0">
              <RefreshCw /> Retry
            </Button>
          )}
        </div>
      )}

      {(items.length > 0 || final) && (
        <div className="grid gap-5 lg:grid-cols-12">
          <section className="lg:col-span-7 rounded-2xl border bg-card p-4 sm:p-5" aria-labelledby="trace-h">
            <h2 id="trace-h" className="flex items-center gap-2 text-base font-semibold">
              <Bot className="size-4.5 text-primary" aria-hidden /> Agent trace
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Every model turn and tool call, with arguments, result and timing.</p>
            <Trace items={items} running={running} />
          </section>
          <div className="lg:col-span-5 space-y-5">
            {final && <DoubtsCard doubts={final.doubts} />}
            {final && <MatchCard final={final} data={data} />}
            {!final && running && <ResultSkeleton />}
          </div>
        </div>
      )}

      {final && !isControl && (
        <div className="grid gap-5 lg:grid-cols-12">
          <section className="lg:col-span-7 rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold">Brief for {final.match.ambassador_name.split(" ")[0]}</h2>
            <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
              Written in {langName(final.brief.language)} — the parent ambassador’s language — with an English translation for the counsellor.
            </p>
            <BriefView brief={(data.match?.brief as Brief) ?? final.brief} />
          </section>
          <section className="lg:col-span-5">
            <OfferPanel key={`${final.match.match_id}-${data.match?._id ?? ""}`} data={data} final={final} />
          </section>
        </div>
      )}

      {!isControl && (data.booking || data.messages.length > 0) && <ActivityPanel data={data} />}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────
function FamilyCard({ data }: { data: LeadView }) {
  const l = data.lead;
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{l.student_name}’s family</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {l.parent_name} · {l.district ? `${l.district}, ${l.state}` : "district not resolved yet"} · PIN {l.pincode}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip status={l.status} />
          <LangChip code={l.language} />
          <Pill tone={l.arm === "treatment" ? "info" : "warn"}>{l.arm === "treatment" ? "Treatment arm" : "Control arm"}</Pill>
          {!l.in_experiment && <Pill>Not in experiment</Pill>}
          {!l.consent_whatsapp && <Pill tone="bad">No WhatsApp consent</Pill>}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Preferred university</dt>
          <dd>{l.preferred_university || "Not decided"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Fee</dt>
          <dd>₹{FEE_BANDS[l.fee_band]} lakh / year</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Counselled</dt>
          <dd>{daysSince(l.counselling_date)} days ago</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Language</dt>
          <dd>
            {langName(l.language)} · {LANGUAGES[l.language as keyof typeof LANGUAGES]?.native}
          </dd>
        </div>
      </dl>
      <blockquote className="mt-3 rounded-lg border-l-4 border-primary/40 bg-muted/50 px-3 py-2 text-[15px] leading-relaxed">
        <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Counselling notes</span>
        {l.counselling_notes}
      </blockquote>
    </section>
  );
}

function Trace({ items, running }: { items: Item[]; running: boolean }) {
  return (
    <ol className="mt-4 space-y-2.5">
      {items.map((it, idx) =>
        it.kind === "llm" ? (
          <li key={`t${it.turn}-${idx}`} className="pb-in flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              <Bot className="size-3" aria-hidden /> Model turn {it.turn}
            </span>
            <code className="text-[11px]">{it.model}</code>
            <span>
              {it.input_tokens.toLocaleString()} → {it.output_tokens.toLocaleString()} tokens · {fmtMs(it.ms)}
            </span>
            {it.fallback && <Pill tone="warn">fallback: {it.fallback}</Pill>}
            <span className="w-full sm:w-auto">
              {it.tool_calls.length ? (
                <>
                  calls <strong className="font-medium text-foreground">{it.tool_calls.join(" + ")}</strong>
                  {it.tool_calls.length > 1 && " in parallel"}
                </>
              ) : (
                <em>“{it.text}”</em>
              )}
            </span>
          </li>
        ) : (
          <ToolCard key={`s${it.i}`} it={it} />
        )
      )}
      {running && (
        <li className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> thinking…
        </li>
      )}
    </ol>
  );
}

function ToolCard({ it }: { it: ToolItem }) {
  const Icon = TOOL_ICON[it.tool] ?? Circle;
  const result = it.result as { error?: string } | undefined;
  return (
    <li className={cn("pb-in rounded-xl border p-3", it.pending ? "border-dashed bg-muted/30" : it.ok === false ? "border-rose-200 bg-rose-50/50" : "bg-background")}>
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", it.ok === false ? "bg-rose-100 text-rose-700" : "bg-primary/10 text-primary")}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <code className="break-all font-mono text-[13px] font-semibold">
              {it.tool}
              <span className="font-normal text-muted-foreground">({argSummary(it.tool, it.args)})</span>
            </code>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {it.pending ? <Loader2 className="size-3.5 animate-spin" aria-label="running" /> : fmtMs(it.ms)}
            </span>
          </div>
          {!it.pending && (
            <p className="mt-0.5 flex items-start gap-1.5 text-sm">
              {it.ok === false ? (
                <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-600" aria-label="rejected" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#0ca30c]" aria-label="ok" />
              )}
              <span className={it.ok === false ? "text-rose-900" : ""}>
                → {it.summary ?? result?.error ?? "done"}
                {it.ok === false && result?.error && it.summary !== result.error && <span className="block text-xs">{result.error}</span>}
              </span>
            </p>
          )}
          {!it.pending && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {it.source && <Pill tone={sourceTone(it.source)}>{it.source}</Pill>}
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none hover:text-foreground">args &amp; result</summary>
                <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-2 text-[11px] leading-snug text-foreground">
                  {JSON.stringify({ args: it.args, result: it.result }, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-16 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

function DoubtsCard({ doubts }: { doubts: Doubt[] }) {
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-base font-semibold">What’s really holding them back</h2>
      <ul className="mt-3 space-y-2.5">
        {doubts.map((d, i) => (
          <li key={i} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{DOUBT_LABELS[d.category as DoubtCategory] ?? d.category}</span>
              <span className="flex items-center gap-1" aria-label={`severity ${d.severity} of 3`} title={`severity ${d.severity}/3`}>
                {[1, 2, 3].map((n) => (
                  <span key={n} className={cn("size-2 rounded-full", n <= d.severity ? "bg-serious" : "bg-muted")} />
                ))}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">“{d.evidence_quote}”</p>
            <p className="mt-1 text-xs">
              {d.quote_verified ? (
                <span className="text-[#006300]">✓ quote found in the notes</span>
              ) : (
                <span className="text-amber-800">? quote not found verbatim — flagged</span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MatchCard({ final, data }: { final: Final; data: LeadView }) {
  const m = final.match;
  const f = m.facts as { same_district?: boolean; speaks_family_language?: boolean; same_university?: boolean; child_year?: number; district?: string; university?: string; campus_city?: string; tier?: string };
  const amb = data.ambassador && data.ambassador.name === m.ambassador_name ? data.ambassador : null;
  const fact = (ok: boolean | undefined, label: string) => (
    <Pill tone={ok ? "good" : "muted"}>
      {ok ? "✓" : "–"} {label}
    </Pill>
  );
  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Best parent-ambassador match</p>
          <h2 className="mt-0.5 text-lg font-semibold">{m.ambassador_name}</h2>
          <p className="text-sm text-muted-foreground">
            {f.district ?? amb?.district} · child in Year {f.child_year ?? amb?.child_year} at {f.university ?? amb?.university}
            {f.campus_city ? `, ${f.campus_city}` : ""}
          </p>
        </div>
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground" aria-label={`score ${m.score} of 100`}>
          {m.score}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {fact(f.same_district, "Same district")}
        {fact(f.speaks_family_language, `Speaks ${langName(data.lead.language)}`)}
        {fact(f.same_university, "Same university")}
        {amb && <Pill>{amb.languages.map(langName).join(" · ")}</Pill>}
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {m.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      {amb?.bio && <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm italic text-muted-foreground">“{amb.bio}”</p>}
      {m.other_candidates.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            Other candidates ({m.other_candidates.length})
          </summary>
          <ul className="mt-2 divide-y rounded-lg border text-sm">
            {m.other_candidates.map((c) => {
              const o = data.others.find((x) => x.code === c.ambassador_id);
              return (
                <li key={c.ambassador_id} className="flex items-start justify-between gap-3 p-2.5">
                  <div className="min-w-0">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o ? `${o.district} · Year ${o.child_year} at ${o.university} · ` : ""}
                      {c.reasons[0]}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{c.score}</span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}

function OfferPanel({ data, final }: { data: LeadView; final: Final }) {
  const router = useRouter();
  const [msg, setMsg] = useState(data.match?.family_message ?? final.family_message);
  const [lang, setLang] = useState(msg.language);
  const [regen, setRegen] = useState<{ busy: boolean; note?: string; err?: string }>({ busy: false });
  const [send, setSend] = useState<{ busy: boolean; result?: { message: Msg; links: { family: string; ambassador: string } }; err?: string }>({ busy: false });

  async function regenerate(force = false) {
    setRegen({ busy: true });
    try {
      const res = await fetch("/api/agent/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: data.lead._id, language: lang, force }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not regenerate");
      setMsg({ language: j.language, body: j.body });
      setRegen({ busy: false, note: j.cached ? "Saved translation — no AI call" : `Written by ${j.provider} · ${j.model}` });
      setSend({ busy: false });
    } catch (e) {
      setRegen({ busy: false, err: (e as Error).message });
    }
  }

  async function sendNow() {
    setSend({ busy: true });
    try {
      const res = await fetch("/api/messages/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: data.lead._id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Send failed");
      setSend({ busy: false, result: j });
      router.refresh();
    } catch (e) {
      setSend({ busy: false, err: (e as Error).message });
    }
  }

  const r = send.result?.message;
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-base font-semibold">WhatsApp offer to the family</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {langName(msg.language)} · under 60 words · booking link and opt-out line enforced by the tool’s validator.
      </p>
      <PhoneMock className="mt-4" messages={[{ body: msg.body }]} />
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Language
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="h-9 rounded-lg border bg-background px-2.5 text-sm text-foreground">
            {LANG_CODES.map((c) => (
              <option key={c} value={c}>
                {LANGUAGES[c].name} — {LANGUAGES[c].native}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" size="lg" onClick={() => regenerate(false)} disabled={regen.busy || lang === msg.language}>
          {regen.busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Regenerate in {langName(lang)}
        </Button>
      </div>
      {regen.note && <p className="mt-2 text-xs text-muted-foreground">{regen.note}</p>}
      {regen.err && <p className="mt-2 text-sm text-rose-700">{regen.err}</p>}

      <div className="mt-4 border-t pt-4">
        {!data.lead.consent_whatsapp && (
          <p className="mb-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-950">No WhatsApp consent on file — sending will only produce a preview.</p>
        )}
        <Button size="lg" className="w-full bg-[#128c7e] hover:bg-[#0e7a6d]" onClick={sendNow} disabled={send.busy}>
          {send.busy ? <Loader2 className="animate-spin" /> : <Send />} Send WhatsApp
        </Button>
        {send.err && <p className="mt-2 text-sm text-rose-700">{send.err}</p>}
        {r && (
          <div className="mt-3 space-y-2 text-sm">
            {r.channel === "whatsapp" ? (
              <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-900">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Sent live via Twilio to the demo phone <strong>{r.to_masked}</strong> (it stands in for this synthetic family) · status <em>{r.status}</em>
                </span>
              </p>
            ) : (
              <div className="rounded-lg bg-amber-50 p-3 text-amber-950">
                <p className="font-medium">WhatsApp preview</p>
                <p className="text-xs">{r.fallback_reason}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm" aria-label="QR code that opens this message in WhatsApp on a phone">
                    <QRCodeSVG value={`${typeof window === "undefined" ? "" : window.location.origin}/w/${r._id}`} size={112} marginSize={0} level="M" />
                  </div>
                  <div className="text-xs">
                    <p>Scan with your phone — WhatsApp opens with this exact message, booking link included.</p>
                    <a href={r.wa_link} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-medium text-[#128c7e] underline">
                      Open this message in WhatsApp <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {(send.result?.links || data.booking) && (
          <div className="mt-3 grid gap-2 text-sm">
            <Link
              href={send.result?.links.family ?? `/b/${data.booking!.token}`}
              target="_blank"
              className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted"
            >
              <span>
                <span className="block font-medium">Family’s booking page</span>
                <span className="block text-xs text-muted-foreground">What the parent opens from WhatsApp</span>
              </span>
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
            </Link>
            <Link
              href={send.result?.links.ambassador ?? `/a/${data.booking!.ambassador_token}`}
              target="_blank"
              className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted"
            >
              <span>
                <span className="block font-medium">parent ambassador’s page</span>
                <span className="block text-xs text-muted-foreground">Brief, booking and call notes</span>
              </span>
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityPanel({ data }: { data: LeadView }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const b = data.booking;
  const summary = data.call?.ai_summary as { red_flags?: string[]; red_flags_detected?: Array<{ rule: string }>; next_best_action?: string } | null;
  const flags = [...(summary?.red_flags ?? []), ...(summary?.red_flags_detected ?? []).map((f) => f.rule)];

  async function post(url: string, body: unknown, label: string) {
    setBusy(label);
    setNote(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      if (j.message?.channel) setNote(j.message.channel === "whatsapp" ? "Reminder sent on WhatsApp." : `Reminder preview: ${j.message.fallback_reason}`);
      router.refresh();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-base font-semibold">Activity</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 text-sm">
          {b && (
            <div className="rounded-lg border p-3">
              <p className="font-medium">
                Booking: <span className="capitalize">{b.status}</span>
              </p>
              {b.slot_start && (
                <p className="text-muted-foreground">
                  {new Date(b.slot_start).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST
                </p>
              )}
              {b.status === "confirmed" && (
                <Button variant="outline" size="sm" className="mt-2" disabled={!!busy} onClick={() => post("/api/reminders", { bookingId: b._id }, "remind")}>
                  {busy === "remind" && <Loader2 className="animate-spin" />} Send reminder
                </Button>
              )}
            </div>
          )}
          {data.call && (
            <div className={cn("rounded-lg border p-3", flags.length && "border-rose-300 bg-rose-50")}>
              <p className="font-medium">Call done · trust rating {data.call.trust_rating ? `${data.call.trust_rating}/5` : "pending"}</p>
              {summary?.next_best_action && <p className="mt-1 text-muted-foreground">Next: {summary.next_best_action}</p>}
              {flags.length > 0 && (
                <p className="mt-1 flex items-start gap-1.5 font-medium text-rose-800">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Red flag: {flags.join("; ")}
                </p>
              )}
              {b && (
                <Link href={`/a/${b.ambassador_token}`} className="mt-1 inline-block text-xs text-primary underline">
                  Full summary
                </Link>
              )}
            </div>
          )}
          <div className="rounded-lg border p-3">
            <p className="font-medium">Outcome (counsellor)</p>
            <p className="text-xs text-muted-foreground">Recorded as experiment events.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!!busy || data.lead.status === "seat_reserved"} onClick={() => post(`/api/leads/${data.lead._id}/outcome`, { outcome: "seat_reserved" }, "seat")}>
                {busy === "seat" && <Loader2 className="animate-spin" />} Mark seat reserved
              </Button>
              <Button size="sm" variant="outline" disabled={!!busy || data.lead.status === "withdrawn"} onClick={() => post(`/api/leads/${data.lead._id}/outcome`, { outcome: "withdrawn" }, "wd")}>
                {busy === "wd" && <Loader2 className="animate-spin" />} Mark withdrawn
              </Button>
            </div>
          </div>
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Messages</p>
          <ul className="space-y-2">
            {data.messages.map((m) => (
              <li key={m._id} className="rounded-lg border p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={m.direction === "inbound" ? "info" : m.channel === "whatsapp" ? "good" : "warn"}>
                    {m.direction === "inbound" ? "↙ inbound" : m.channel === "whatsapp" ? "WhatsApp" : "preview"}
                  </Pill>
                  <span className="font-medium">
                    {m.kind.replace(/_/g, " ")} → {m.audience === "ambassador" ? "parent ambassador" : "family"}
                  </span>
                  <span className="text-muted-foreground">
                    {langName(m.language)} · {m.status} · {new Date(m.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{m.body}</p>
                {m.fallback_reason && <p className="mt-0.5 text-amber-800">{m.fallback_reason}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
