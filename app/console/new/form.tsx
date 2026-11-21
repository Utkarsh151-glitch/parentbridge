"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LANGUAGES, LANG_CODES, UNIVERSITIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const EXAMPLE = {
  student_name: "Keerthi Vemula",
  parent_name: "Prasad Vemula",
  pincode: "506002",
  language: "te",
  preferred_university: "Chaitanya (Deemed to be University)",
  fee_band: "mid",
  counselling_notes:
    "Father asked 'ee course college aa leka coaching aa?'. Worried who receives the ₹3L — university or the programme provider. Mother worried about girls' hostel safety in Hyderabad. Said 'alochinchi chepthamu'.",
  consent_whatsapp: true,
};

const field = "h-10 w-full rounded-lg border bg-background px-3 text-sm";

export function AddLeadForm() {
  const router = useRouter();
  const [f, setF] = useState({ ...EXAMPLE, student_name: "", parent_name: "", pincode: "", counselling_notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not save the lead");
      router.push(`/console/lead/${j.id}?run=1`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex justify-end">
        <button type="button" onClick={() => setF(EXAMPLE)} className="text-sm text-primary hover:underline">
          Fill with an example
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Student name
          <input required minLength={2} value={f.student_name} onChange={set("student_name")} className={field} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Parent name
          <input required minLength={2} value={f.parent_name} onChange={set("parent_name")} className={field} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          PIN code
          <input
            required
            inputMode="numeric"
            pattern="[1-9][0-9]{5}"
            maxLength={6}
            value={f.pincode}
            onChange={set("pincode")}
            placeholder="e.g. 522002"
            className={field}
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Family’s language
          <select value={f.language} onChange={set("language")} className={field}>
            {LANG_CODES.map((c) => (
              <option key={c} value={c}>
                {LANGUAGES[c].name} — {LANGUAGES[c].native}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Preferred university
          <select value={f.preferred_university} onChange={set("preferred_university")} className={field}>
            <option value="">Not decided</option>
            {UNIVERSITIES.map((u) => (
              <option key={u.name} value={u.name}>
                {u.name}, {u.city}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Fee band
          <select value={f.fee_band} onChange={set("fee_band")} className={field}>
            <option value="low">₹2 lakh / year</option>
            <option value="mid">₹3 lakh / year</option>
            <option value="high">₹4.5 lakh / year</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm font-medium">
        Counselling notes
        <textarea
          required
          minLength={20}
          maxLength={1500}
          rows={5}
          value={f.counselling_notes}
          onChange={set("counselling_notes")}
          placeholder="What did the parents actually say? Quote them."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={f.consent_whatsapp} onChange={set("consent_whatsapp")} className="mt-0.5 size-4 accent-primary" />
        <span>Family consented to WhatsApp messages (without consent the agent still runs, but nothing is sent).</span>
      </label>
      {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{err}</p>}
      <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
        {busy && <Loader2 className="animate-spin" />} Save and run the agent
      </Button>
    </form>
  );
}
