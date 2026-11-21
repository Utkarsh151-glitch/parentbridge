import { CheckCheck, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** WhatsApp-style phone preview. `{{BOOKING_LINK}}` renders as a link chip. */
export function PhoneMock({
  title = "ParentBridge",
  subtitle = "Business account",
  messages,
  className,
}: {
  title?: string;
  subtitle?: string;
  messages: Array<{ body: string; time?: string; inbound?: boolean }>;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[340px] rounded-[2rem] border-[6px] border-neutral-900 bg-neutral-900 shadow-xl", className)}>
      <div className="overflow-hidden rounded-[1.6rem]">
        <div className="flex items-center gap-2 bg-wa-header px-3 py-2.5 text-white">
          <ChevronLeft className="size-5 opacity-80" aria-hidden />
          <div className="grid size-8 place-items-center rounded-full bg-white/20 text-xs font-semibold" aria-hidden>
            PB
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{title}</p>
            <p className="text-[11px] opacity-80 leading-tight">{subtitle}</p>
          </div>
        </div>
        <div className="flex min-h-56 flex-col gap-2 bg-wa-bg px-3 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[88%] rounded-lg px-2.5 pb-1.5 pt-2 text-[13.5px] leading-snug shadow-sm",
                m.inbound ? "self-start bg-white" : "self-end bg-wa-bubble"
              )}
            >
              <MessageText body={m.body} />
              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                <span>{m.time ?? "now"}</span>
                {!m.inbound && <CheckCheck className="size-3.5 text-sky-500" aria-label="delivered" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageText({ body }: { body: string }) {
  const parts = body.split(/(\{\{BOOKING_LINK\}\}|https?:\/\/\S+)/g);
  return (
    <p className="whitespace-pre-wrap break-words text-neutral-900">
      {parts.map((p, i) =>
        p === "{{BOOKING_LINK}}" ? (
          <span key={i} className="rounded bg-sky-100 px-1 font-medium text-sky-700">
            booking link
          </span>
        ) : /^https?:\/\//.test(p) ? (
          <span key={i} className="break-all text-sky-700 underline">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
}
