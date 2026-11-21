"use client";

import { useState } from "react";
import { Ban, HelpCircle, Quote, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { langName } from "@/lib/constants";

type BriefBody = {
  family_summary: string;
  doubts: Array<{ doubt: string; quote: string }>;
  questions_to_ask: string[];
  do_not_say: string[];
};
export type Brief = { language: string; native: BriefBody; english: BriefBody };

/** The parent ambassador's call brief, in their language with an English toggle. */
export function BriefView({ brief, compact = false }: { brief: Brief; compact?: boolean }) {
  const [english, setEnglish] = useState(brief.language === "en");
  const b = english ? brief.english : brief.native;
  const id = `brief-en-${compact ? "c" : "f"}`;
  return (
    <div className="space-y-4">
      {brief.language !== "en" && (
        <div className="flex items-center gap-2">
          <Switch id={id} checked={english} onCheckedChange={(v: boolean) => setEnglish(v)} />
          <Label htmlFor={id} className="text-sm text-muted-foreground">
            English translation {english ? "" : `(showing ${langName(brief.language)})`}
          </Label>
        </div>
      )}
      <div lang={english ? "en" : brief.language} className="space-y-4 text-[15px] leading-relaxed">
        <section>
          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5" aria-hidden /> The family
          </h4>
          <p>{b.family_summary}</p>
        </section>
        <section>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Quote className="size-3.5" aria-hidden /> Their real doubts
          </h4>
          <ul className="space-y-2">
            {b.doubts.map((d, i) => (
              <li key={i} className="rounded-lg border bg-card p-3">
                <p className="font-medium">{d.doubt}</p>
                <p className="mt-1 text-sm text-muted-foreground">“{d.quote}”</p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <HelpCircle className="size-3.5" aria-hidden /> 3 questions to ask
          </h4>
          <ol className="list-decimal space-y-1 pl-5">
            {b.questions_to_ask.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </section>
        <section className="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
          <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-800">
            <Ban className="size-3.5" aria-hidden /> Do not say
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-rose-950">
            {b.do_not_say.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
