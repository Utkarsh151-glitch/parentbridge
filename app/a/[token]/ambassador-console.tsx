"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, CheckCircle2, IndianRupee, Loader2, ShieldAlert, Smile, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BriefView, type Brief } from "@/components/brief-view";
import { Pill, inr } from "@/components/pb";
import { langName } from "@/lib/constants";
import { formatSlot } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Summary = {
  doubts_resolved: string[];
  doubts_remaining: string[];
  family_sentiment: string;
  sentiment_reason: string;
  next_best_action: string;
  red_flags: string[];
  red_flags_detected: Array<{ rule: string; excerpt: string }>;
};
export type AmbView = {
  booking: { _id: string; status: string; slot_start: string | null; meet_link: string; family_language: string };
  lead: { student_name: string; parent_name: string; language: string; district: string; state: string; preferred_university: string };
  amb: { name: string; district: string; child_name: string; child_year: number; university: string; languages: string[] };
  match: { brief: Brief | null; score: number } | null;
  call: { _id: string; ambassador_notes: string; ai_summary: Summary | null; summary_status: string; trust_rating: number | null; duration_min: number } | null;
  credits: { total: number; calls: number };
};

const SAMPLES = {
  good: `Spoke 22 min with the father and mother. Explained my child attends regular, full-time classes on campus — not distance mode; showed a photo of the university ID card. On fees I said we also got two receipts (university + the programme provider) and asked them to get the exact split from the counsellor. Mother asked about hostel food, I shared our experience. Father still worried about placements — I told him honestly that no programme cohort has graduated yet, but showed my child's projects. Father said "mee maatalu vinnaka konchem nammakam vachindi" — they will visit the campus on Saturday.`,
  risky: `Talked for 15 min. Told the father not to worry — placement is 100% guaranteed after 4 years and the package will be minimum 6 LPA. Also said the fees can be reduced if they pay this week. Father seemed happy and said he will pay soon.`,
};

function greet(lang: string | undefined, name: string) {
  const g: Record<string, string> = {
    te: `Namaskaram, ${name} garu`,
    hi: `Namaste, ${name} ji`,
    ta: `Vanakkam, ${name}`,
    kn: `Namaskara, ${name} avare`,
    ml: `Namaskaram, ${name}`,
  };
  return g[lang ?? ""] ?? `Hello, ${name}`;
}

const SENTIMENT_TONE: Record<string, "good" | "info" | "muted" | "warn" | "bad"> = {
  positive: "good",
  leaning_positive: "good",
  neutral: "muted",
  leaning_negative: "warn",
  negative: "bad",
};

export function AmbassadorConsole({ view, token }: { view: AmbView; token: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState(view.call?.ambassador_notes ?? "");
  const [duration, setDuration] = useState(view.call?.duration_min ?? 20);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; limited?: boolean } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(view.call?.ai_summary ?? null);
  const [credits, setCredits] = useState(view.credits);
  const [ratingMsg, setRatingMsg] = useState<{ channel: string; fallback_reason: string | null } | null>(null);
  const [callId, setCallId] = useState(view.call?._id ?? null);
  const firstName = view.amb.name.split(" ")[0];
  const canComplete = ["confirmed", "completed"].includes(view.booking.status);

  async function markDone() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, notes, durationMin: duration }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setCallId(j.call?._id ?? null);
      if (j.summary?.ok) setSummary(j.summary.summary);
      else setErr({ message: `Call saved and credited, but the AI summary failed: ${j.summary?.error ?? "unknown error"}` });
      if (j.rating_message) setRatingMsg(j.rating_message);
      if (!view.call) setCredits((c) => ({ total: c.total + (j.credit_inr ?? 1500), calls: c.calls + 1 }));
      router.refresh();
    } catch (e) {
      setErr({ message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function retrySummary() {
    if (!callId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/calls/${callId}/summarise`, { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Summary failed");
      setSummary(j.summary);
    } catch (e) {
      setErr({ message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const flags = summary ? [...summary.red_flags, ...summary.red_flags_detected.map((f) => `Rule check · ${f.rule}: “${f.excerpt}”`)] : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greet(view.amb.languages[0], firstName)} 🙏</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your call with {view.lead.student_name}’s family
          </h1>
          <p className="text-sm text-muted-foreground">
            {view.lead.parent_name} · {view.lead.district}, {view.lead.state} · speaks {langName(view.booking.family_language || view.lead.language)}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
          <IndianRupee className="size-4 text-[#006300]" aria-hidden />
          <span>
            <strong>{inr(credits.total)}</strong> fee credit · {credits.calls} completed {credits.calls === 1 ? "call" : "calls"}
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm">
          <CalendarClock className="size-4 text-primary" aria-hidden />
          {view.booking.slot_start ? (
            <span>
              <strong>{formatSlot(view.booking.slot_start, view.amb.languages[0] ?? "en")}</strong> IST · status <span className="capitalize">{view.booking.status}</span>
            </span>
          ) : (
            <span>Waiting for the family to pick a slot.</span>
          )}
        </p>
        {view.booking.meet_link && (
          <a href={view.booking.meet_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground">
            <Video className="size-4" aria-hidden /> Join call
          </a>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="mb-3 text-base font-semibold">Your brief</h2>
          {view.match?.brief ? <BriefView brief={view.match.brief} /> : <p className="text-sm text-muted-foreground">No brief yet.</p>}
          <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            You earn a ₹1,500 fee credit for every completed call — never per admission. Please be honest: share your experience, not promises.
          </p>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold">After the call</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Type notes or paste a voice-note transcript — any language. The AI summarises it in English for the counsellor.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button type="button" onClick={() => setNotes(SAMPLES.good)} className="rounded-full border px-2.5 py-1 hover:bg-muted">
                Paste sample notes
              </button>
              <button type="button" onClick={() => setNotes(SAMPLES.risky)} className="rounded-full border border-rose-200 px-2.5 py-1 text-rose-800 hover:bg-rose-50">
                Paste notes that overpromise (red-flag demo)
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              placeholder="What did the family ask? What did you share? How did they feel at the end?"
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              aria-label="Call notes"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                Duration
                <input type="number" min={5} max={90} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-9 w-20 rounded-lg border bg-background px-2 text-sm" />
                min
              </label>
              <Button size="lg" onClick={markDone} disabled={busy || !canComplete || notes.trim().length < 20} className="ml-auto">
                {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {view.call ? "Update & re-summarise" : "Mark call done"}
              </Button>
            </div>
            {!canComplete && <p className="mt-2 text-xs text-amber-800">The family hasn’t booked a slot yet.</p>}
            {err && (
              <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
                <span className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {err.message}
                </span>
                {callId && !summary && (
                  <Button size="sm" variant="outline" onClick={retrySummary} disabled={busy}>
                    Retry
                  </Button>
                )}
              </div>
            )}
          </div>

          {summary && (
            <div className={cn("pb-in rounded-2xl border bg-card p-4 sm:p-5", flags.length && "border-rose-300")}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">AI summary for the counsellor</h2>
                <Pill tone={SENTIMENT_TONE[summary.family_sentiment] ?? "muted"}>
                  <Smile className="size-3" aria-hidden /> {summary.family_sentiment.replace("_", " ")}
                </Pill>
              </div>
              {flags.length > 0 && (
                <div role="alert" className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="size-4" aria-hidden /> Red flags — overpromising
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {flags.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#006300]">Resolved</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{summary.doubts_resolved.length ? summary.doubts_resolved.map((d, i) => <li key={i}>{d}</li>) : <li className="text-muted-foreground">None</li>}</ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Still open</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{summary.doubts_remaining.length ? summary.doubts_remaining.map((d, i) => <li key={i}>{d}</li>) : <li className="text-muted-foreground">None</li>}</ul>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{summary.sentiment_reason}</p>
              <p className="mt-3 rounded-lg bg-primary/5 p-3 text-sm">
                <strong>Next best action:</strong> {summary.next_best_action}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-[#006300]">
                <IndianRupee className="size-4" aria-hidden /> ₹1,500 fee credit logged to your ledger.
              </p>
              {ratingMsg && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Trust-rating request to the family: {ratingMsg.channel === "whatsapp" ? "sent on WhatsApp (reply 1–5)" : `preview — ${ratingMsg.fallback_reason}`}
                </p>
              )}
              <Link href="/dashboard" className="mt-3 inline-block text-sm font-medium text-primary underline">
                See the experiment dashboard →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
