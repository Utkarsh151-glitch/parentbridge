import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck,
  ClipboardList,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

const FLOW = [
  { icon: UserRound, title: "Family inquiry", sub: "Questions need follow-up" },
  { icon: Bot, title: "AI agent", sub: "8 tools · Gemini → Groq" },
  { icon: MessageCircle, title: "WhatsApp offer", sub: "Family's language" },
  { icon: CalendarCheck, title: "Booking", sub: "6 slots in 48 h" },
  { icon: PhoneCall, title: "20-min call", sub: "Parent ambassador" },
  { icon: ClipboardList, title: "AI summary", sub: "Questions · red flags" },
  { icon: BarChart3, title: "Dashboard", sub: "Funnel · experiment" },
];

const TOOLS = [
  ["get_lead", "Reads the family's record and counselling notes from MongoDB."],
  ["extract_doubts", "Saves the family's questions; every quote is checked against the notes."],
  ["resolve_district", "Uses a public postal PIN lookup, then falls back to a local cache."],
  ["search_ambassadors", "Finds available, consented parents by district, university, and language."],
  ["score_candidates", "Ranks parent ambassadors; the server attaches verified facts."],
  ["create_match", "Saves the selected match and its reasons."],
  ["write_ambassador_brief", "Writes a localized call brief and an English version with safety guidance."],
  ["draft_family_message", "Writes a short localized offer and validates its script, link, and opt-out."],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="pt-10 pb-8 sm:pt-16">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" aria-hidden /> Agentic AI · multilingual education support
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
          &quot;We&apos;ll think about it.&quot; <span className="text-primary">Help families get answers from people who understand.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-base text-muted-foreground sm:text-lg leading-relaxed">
          ParentBridge is a portfolio prototype for multilingual education support. An AI agent extracts a family&apos;s questions from
          case notes, checks a district, searches and ranks eligible parent ambassadors, prepares a localized offer and call brief,
          then summarizes the outcome. A counsellor can review the agent&apos;s trace and results. The experiment dashboard uses
          synthetic data so the workflow can be explored without presenting simulated outcomes as real results.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            href="/go/agent"
            prefetch={false}
            className="group flex items-center justify-between gap-3 rounded-xl bg-primary px-5 py-4 text-primary-foreground shadow-sm transition hover:opacity-95"
          >
            <span>
              <span className="block text-base font-semibold">Run the agent on a sample family</span>
              <span className="block text-sm opacity-80">Watch the live tool-call trace</span>
            </span>
            <Bot className="size-6 shrink-0 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link href="/dashboard" className="group flex items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm transition hover:bg-muted">
            <span>
              <span className="block text-base font-semibold">Explore the dashboard</span>
              <span className="block text-sm text-muted-foreground">Funnel, lift, and experiment results</span>
            </span>
            <BarChart3 className="size-6 shrink-0 text-primary" aria-hidden />
          </Link>
          <Link
            href="/go/parent"
            prefetch={false}
            className="group flex items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm transition hover:bg-muted"
          >
            <span>
              <span className="block text-base font-semibold">View the family experience</span>
              <span className="block text-sm text-muted-foreground">WhatsApp preview and booking page</span>
            </span>
            <MessageCircle className="size-6 shrink-0 text-[#128c7e]" aria-hidden />
          </Link>
        </div>
      </section>

      <section aria-labelledby="flow" className="py-8">
        <h2 id="flow" className="text-lg font-semibold">How it flows</h2>
        <ol className="mt-4 grid gap-2 md:grid-cols-7 md:gap-0">
          {FLOW.map((step, i) => (
            <li key={step.title} className="flex flex-col items-center md:flex-row">
              <div className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 md:flex-col md:text-center md:min-h-34 md:justify-center">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="block text-xs text-muted-foreground">{step.sub}</span>
                </span>
              </div>
              {i < FLOW.length - 1 && (
                <>
                  <ArrowDown className="my-0.5 size-4 text-muted-foreground md:hidden" aria-hidden />
                  <ArrowRight className="mx-0.5 hidden size-4 shrink-0 text-muted-foreground md:block" aria-hidden />
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-6 py-8 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">The agent&apos;s 8 tools</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A bounded function-calling loop. Independent tools can run in parallel; every call is validated, logged, and replayable.
          </p>
          <ul className="mt-4 space-y-2.5">
            {TOOLS.map(([name, description]) => (
              <li key={name} className="text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">{name}</code>
                <span className="text-muted-foreground"> — {description}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Synthetic experiment</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>400 sample family inquiries across Andhra Pradesh and Telangana, split into treatment and control groups.</li>
              <li>Explore conversion, call uptake, and a simulated win or kill verdict.</li>
              <li>Parent ambassadors receive a &#8377;1,500 demo credit per completed call, never per sale.</li>
              <li>Simulation events are labelled and kept separate from real demo activity.</li>
            </ul>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="size-5 text-[#0ca30c]" aria-hidden /> Consent and safety
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>Contact is made only after consent; each message includes an opt-out instruction.</li>
              <li>Phone numbers stay server-side and are never sent to the model.</li>
              <li>Quoted concerns are checked against source notes; overpromising is flagged.</li>
              <li>Rate limits and a safe WhatsApp preview protect the public demo.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
