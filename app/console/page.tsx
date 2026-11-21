import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Bot, Plus, Star } from "lucide-react";
import { getConsoleLeads } from "@/lib/data";
import { LANGUAGES, LEAD_STATUSES, STATUS_LABELS, langName } from "@/lib/constants";
import { LangChip, PageTitle, Pill, StatusChip, daysSince } from "@/components/pb";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Counsellor console" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function ConsolePage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageTitle
        title="Counsellor console"
        sub="Treatment-arm families who finished counselling but haven’t paid for 7+ days. Run the agent to match each one with a parent ambassador from their district. ★ = a saved run opens instantly."
      >
        <Link href="/console/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-95">
          <Plus className="size-4" aria-hidden /> Add a lead
        </Link>
      </PageTitle>
      <Suspense fallback={<TableSkeleton />}>
        <LeadTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="mt-6 space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

async function LeadTable({ searchParams }: { searchParams: SP }) {
  await connection();
  const sp = await searchParams;
  const filters = {
    district: one(sp.district),
    language: one(sp.language),
    status: one(sp.status),
    q: one(sp.q),
    saved: one(sp.saved),
    page: Number(one(sp.page) ?? 1) || 1,
  };
  const data = await getConsoleLeads(filters);
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v && k !== "page") u.set(k, String(v));
    u.set("page", String(p));
    return `/console?${u}`;
  };
  const selectCls = "h-9 rounded-lg border bg-background px-2.5 text-sm";

  return (
    <>
      {one(sp.hint) === "run-first" && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Run the agent on a family first — then the parent view (WhatsApp + booking) has a message to show.
        </p>
      )}
      <form method="get" action="/console" className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Search
          <input name="q" defaultValue={filters.q} placeholder="Name or PIN" className={`${selectCls} w-40`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          District
          <select name="district" defaultValue={filters.district ?? ""} className={selectCls}>
            <option value="">All districts</option>
            {data.districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Language
          <select name="language" defaultValue={filters.language ?? ""} className={selectCls}>
            <option value="">All languages</option>
            {data.languages.map((l) => (
              <option key={l} value={l}>
                {LANGUAGES[l as keyof typeof LANGUAGES]?.name ?? l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className={selectCls}>
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="saved" value="1" defaultChecked={filters.saved === "1"} className="size-4 accent-primary" />
          Saved runs only
        </label>
        <div className="flex gap-2">
          <button className="h-9 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground">Filter</button>
          <Link href="/console" className="h-9 rounded-lg border px-3.5 text-sm leading-9 hover:bg-muted">
            Reset
          </Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        {data.total} {data.total === 1 ? "family" : "families"} · page {data.page} of {data.pages}
      </p>

      {/* Mobile: cards */}
      <ul className="mt-3 space-y-2 md:hidden">
        {data.rows.map((l) => (
          <li key={l._id} className="rounded-xl border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/console/lead/${l._id}`} className="font-medium hover:underline">
                  {l.last_match_run_id && <Star className="mr-1 inline size-3.5 fill-amber-400 text-amber-400" aria-label="saved run" />}
                  {l.student_name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {l.parent_name} · {l.district || `PIN ${l.pincode}`} · {daysSince(l.counselling_date)}d stalled
                </p>
              </div>
              <StatusChip status={l.status} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1.5">
                <LangChip code={l.language} />
                {l.source === "manual" && <Pill tone="info">Your lead</Pill>}
                {l.featured && <Pill tone="warn">Showcase</Pill>}
              </div>
              <RunLink id={l._id} saved={!!l.last_match_run_id} />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="mt-3 hidden overflow-hidden rounded-xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Family</th>
              <th className="px-4 py-2.5 font-medium">District</th>
              <th className="px-4 py-2.5 font-medium">Language</th>
              <th className="px-4 py-2.5 font-medium">Preferred university</th>
              <th className="px-4 py-2.5 font-medium">Stalled</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.rows.map((l) => (
              <tr key={l._id} className="hover:bg-muted/40">
                <td className="px-4 py-2.5">
                  <Link href={`/console/lead/${l._id}`} className="font-medium hover:underline">
                    {l.last_match_run_id && <Star className="mr-1 inline size-3.5 fill-amber-400 text-amber-400" aria-label="saved run" />}
                    {l.student_name}
                  </Link>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {l.parent_name}
                    {l.source === "manual" && <Pill tone="info">Your lead</Pill>}
                    {l.featured && <Pill tone="warn">Showcase</Pill>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {l.district || <span className="text-muted-foreground">PIN {l.pincode}</span>}
                  <div className="text-xs text-muted-foreground">{l.state}</div>
                </td>
                <td className="px-4 py-2.5">{langName(l.language)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{l.preferred_university || "—"}</td>
                <td className="px-4 py-2.5 tabular-nums">{daysSince(l.counselling_date)} days</td>
                <td className="px-4 py-2.5">
                  <StatusChip status={l.status} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <RunLink id={l._id} saved={!!l.last_match_run_id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.rows.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">No families match these filters.</p>}

      {data.pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
          {data.page > 1 && (
            <Link href={qs(data.page - 1)} className="rounded-lg border px-3 py-1.5 hover:bg-muted">
              ← Previous
            </Link>
          )}
          <span className="text-muted-foreground">
            {data.page} / {data.pages}
          </span>
          {data.page < data.pages && (
            <Link href={qs(data.page + 1)} className="rounded-lg border px-3 py-1.5 hover:bg-muted">
              Next →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

function RunLink({ id, saved }: { id: string; saved: boolean }) {
  return (
    <Link
      href={`/console/lead/${id}${saved ? "" : "?run=1"}`}
      className={
        saved
          ? "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          : "inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95"
      }
    >
      <Bot className="size-3.5" aria-hidden />
      {saved ? "View run" : "Run agent"}
    </Link>
  );
}
