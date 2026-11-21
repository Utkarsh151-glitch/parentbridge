"use client";

import { useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, Lock, MessageCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneMock } from "@/components/phone-mock";
import { LANGUAGES, LANG_CODES, type LangCode } from "@/lib/constants";
import { bookingStrings, fill, formatSlot } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type View = {
  booking: { token: string; status: string; slot_start: string | null; meet_link: string; family_language: string };
  lead: { student_name: string; parent_name: string; language: string; district: string };
  amb: { first_name: string; child_year: number; university: string; campus_city: string; district: string };
  call: { trust_rating: number | null } | null;
  offer: { body: string; language: string } | null;
};
type SentMsg = { audience: string; channel: string; status: string; fallback_reason: string | null };

export function BookingForm({ view, slots }: { view: View; slots: string[] }) {
  const [lang, setLang] = useState<LangCode>((view.booking.family_language || view.lead.language) as LangCode);
  const t = bookingStrings(lang);
  const [slot, setSlot] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ slot: string; meet: string; msgs: SentMsg[]; ambToken?: string } | null>(
    view.booking.status === "confirmed" || view.booking.status === "completed"
      ? { slot: view.booking.slot_start!, meet: view.booking.meet_link, msgs: [] }
      : null
  );
  const [rating, setRating] = useState<number | null>(view.call?.trust_rating ?? null);
  const [rateBusy, setRateBusy] = useState(false);
  const done = view.booking.status === "completed";

  async function confirm() {
    if (!slot) return;
    if (!consent) {
      setErr(t.needConsent);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/bookings/${view.booking.token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, consent, language: lang }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not book");
      setBooked({ slot: j.booking.slot_start, meet: j.booking.meet_link, msgs: j.messages ?? [], ambToken: j.booking.ambassador_token });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function rate(n: number) {
    setRateBusy(true);
    try {
      const res = await fetch(`/api/bookings/${view.booking.token}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: n }) });
      if (res.ok) setRating(n);
    } finally {
      setRateBusy(false);
    }
  }

  return (
    <div lang={lang} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-primary">ParentBridge</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t.language}
          <select value={lang} onChange={(e) => setLang(e.target.value as LangCode)} className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground">
            {LANG_CODES.map((c) => (
              <option key={c} value={c}>
                {LANGUAGES[c].native}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view.offer && !booked && (
        <details className="rounded-2xl border bg-card p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <MessageCircle className="size-4 text-[#128c7e]" aria-hidden /> WhatsApp
          </summary>
          <PhoneMock className="mt-3" messages={[{ body: view.offer.body }]} />
        </details>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-semibold leading-snug">{t.title}</h1>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary/5 p-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground" aria-hidden>
            {view.amb.first_name[0]}
          </div>
          <div>
            <p className="font-semibold">
              {view.amb.first_name} <span className="font-normal text-muted-foreground">· {view.amb.district}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Year {view.amb.child_year} · {view.amb.university}, {view.amb.campus_city}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed">
          {fill(t.intro, { amb: view.amb.first_name, year: view.amb.child_year, uni: view.amb.university, campus: view.amb.campus_city })}
        </p>
        <p className="mt-2 text-sm font-medium text-[#006300]">{t.free20}</p>

        {done ? (
          <div className="mt-5 space-y-3">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-5 text-[#0ca30c]" aria-hidden /> {t.callDone}
            </p>
            <div className="rounded-xl border p-4">
              <p className="font-medium">{t.rateTitle}</p>
              <p className="text-xs text-muted-foreground">{t.rateHint}</p>
              <div className="mt-3 flex gap-2" role="radiogroup" aria-label={t.rateTitle}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={rating === n}
                    disabled={rateBusy}
                    onClick={() => rate(n)}
                    className={cn("size-11 rounded-full border text-base font-semibold transition", rating === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {rating && <p className="mt-2 text-sm text-[#006300]">{t.thanks}</p>}
            </div>
          </div>
        ) : booked ? (
          <div className="mt-5 space-y-3">
            <p className="flex items-center gap-2 text-lg font-semibold text-[#006300]">
              <CalendarCheck className="size-5" aria-hidden /> {t.confirmed}
            </p>
            <p className="text-[15px]">{formatSlot(booked.slot, lang)} (IST)</p>
            <a href={booked.meet} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              <Video className="size-4" aria-hidden /> {t.join}
            </a>
            <p className="text-sm text-muted-foreground">{t.whatsappNote}</p>
            {booked.msgs.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-muted/60 p-3 text-xs">
                {booked.msgs.map((m, i) => (
                  <li key={i}>
                    WhatsApp → {m.audience === "ambassador" ? "parent ambassador" : "family"}:{" "}
                    {m.channel === "whatsapp" ? <strong className="text-[#006300]">sent live ({m.status})</strong> : <span>preview — {m.fallback_reason}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <h2 className="text-sm font-semibold">{t.pickSlot}</h2>
            <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.pickSlot}>
              {slots.map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={slot === s}
                  onClick={() => setSlot(s)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-sm transition",
                    slot === s ? "border-primary bg-primary/10 font-semibold ring-2 ring-primary/30" : "hover:bg-muted"
                  )}
                >
                  {formatSlot(s, lang)}
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 accent-primary" />
              <span>{t.consent}</span>
            </label>
            {err && <p className="mt-2 text-sm text-rose-700">{err}</p>}
            <Button size="lg" className="mt-4 h-12 w-full text-base" disabled={!slot || busy} onClick={confirm}>
              {busy && <Loader2 className="animate-spin" />} {t.confirm}
            </Button>
          </div>
        )}
        <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {t.noPhone}
        </p>
      </section>

      {booked?.ambToken && (
        <a href={`/a/${booked.ambToken}`} className="block rounded-xl border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted">
          <strong className="text-foreground">Demo shortcut →</strong> open the parent ambassador’s page (brief + call notes). Real families never see this link.
        </a>
      )}
    </div>
  );
}
