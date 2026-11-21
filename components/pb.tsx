import { cn } from "@/lib/utils";
import { STATUS_LABELS, langName, type LeadStatus } from "@/lib/constants";

const STATUS_STYLE: Record<string, string> = {
  counselled: "bg-slate-100 text-slate-700 ring-slate-200",
  offered: "bg-sky-50 text-sky-800 ring-sky-200",
  call_booked: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  call_done: "bg-violet-50 text-violet-800 ring-violet-200",
  seat_reserved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  withdrawn: "bg-rose-50 text-rose-800 ring-rose-200",
  no_response: "bg-amber-50 text-amber-900 ring-amber-200",
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", STATUS_STYLE[status] ?? STATUS_STYLE.counselled, className)}>
      {STATUS_LABELS[status as LeadStatus] ?? status}
    </span>
  );
}

export function LangChip({ code, className }: { code: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground", className)}>
      {langName(code)}
    </span>
  );
}

export function Pill({ children, tone = "muted", className }: { children: React.ReactNode; tone?: "muted" | "good" | "bad" | "info" | "warn"; className?: string }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    good: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
    bad: "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200",
    info: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200",
    warn: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function PageTitle({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function daysSince(d: string | Date) {
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

export function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
