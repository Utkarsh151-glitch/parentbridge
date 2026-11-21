import type { Types } from "mongoose";
import { Message, RateLimit } from "@/lib/db/models";
import { hitLimit, istDay } from "@/lib/guardrails";
import { OPT_OUT_LINE } from "@/lib/constants";
import { demoRecipient, fetchMessageStatus, explainTwilioError, maskNumber, sendWhatsApp, twilioConfigured } from "./twilio";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sandbox allows at most one message every 3 seconds — wait our turn (bounded). */
async function spaceSends() {
  const doc = await RateLimit.findOne({ key: "wa:last" }).lean();
  const since = doc?.last_at ? Date.now() - new Date(doc.last_at).getTime() : Infinity;
  if (since < 3200) await sleep(3200 - since);
  await RateLimit.updateOne(
    { key: "wa:last" },
    { $set: { last_at: new Date(), expires_at: new Date(Date.now() + 86_400_000) } },
    { upsert: true }
  );
}

export function withOptOut(body: string) {
  return /reply\s+stop\s+to\s+opt\s*out\.?\s*$/i.test(body.trim()) ? body.trim() : `${body.trim()}\n\n${OPT_OUT_LINE}`;
}

export function waPreviewLink(body: string) {
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

/**
 * Deliver one WhatsApp message. Live only to DEMO_WHATSAPP_TO (the demo phone stands in for the
 * synthetic family / parent ambassador); otherwise — or on any Twilio error — fall back to a preview.
 */
export async function deliver(opts: {
  leadId: Types.ObjectId | string;
  ambassadorId?: Types.ObjectId | string | null;
  bookingId?: Types.ObjectId | string | null;
  audience: "family" | "ambassador";
  kind: "offer" | "booking_confirmation" | "reminder" | "rating_request";
  language: string;
  body: string;
  consent: boolean;
  baseUrl?: string;
}) {
  const body = withOptOut(opts.body);
  let channel: "whatsapp" | "preview" = "preview";
  let status = "preview";
  let reason: string | null = null;
  let sid: string | null = null;
  let toMasked = "";
  const to = demoRecipient();

  if (!opts.consent) reason = "No WhatsApp consent on file — not sent (preview only)";
  else if (process.env.WHATSAPP_MODE === "preview")
    reason =
      "Preview mode — this Twilio trial number only sends pre-approved templates, so the exact message is shown here. Scan the QR or tap the link to open it in WhatsApp.";
  else if (!twilioConfigured()) reason = "Twilio is not configured — showing a preview instead";
  else if (!to) reason = "DEMO_WHATSAPP_TO is not set — live sends only go to the demo phone";
  else {
    const cap = Number(process.env.LIVE_WHATSAPP_PER_DAY ?? 25);
    const lim = await hitLimit(`wa:live:${istDay()}`, cap);
    if (!lim.allowed) reason = `Daily live WhatsApp cap (${cap}) reached — preview only`;
    else {
      await spaceSends();
      const header = opts.audience === "family" ? "🧪 ParentBridge demo → family" : "🧪 ParentBridge demo → parent ambassador";
      const publicBase = opts.baseUrl && /^https:\/\//.test(opts.baseUrl) ? opts.baseUrl : null;
      const r = await sendWhatsApp({
        to,
        body: `${header}\n\n${body}`,
        statusCallback: publicBase ? `${publicBase}/api/webhooks/twilio/status` : undefined,
      });
      if (!r.ok) reason = `${r.reason} — showing a preview instead`;
      else {
        sid = r.sid;
        status = r.status;
        channel = "whatsapp";
        toMasked = maskNumber(to);
        // Sandbox failures (63015/63016) arrive asynchronously; check once so the UI can tell the truth.
        await sleep(2500);
        const s = await fetchMessageStatus(r.sid);
        if (s) {
          status = s.status;
          if (s.status === "failed" || s.status === "undelivered") {
            channel = "preview";
            reason = `${explainTwilioError(s.errorCode, s.errorMessage ?? undefined)} — showing a preview instead`;
          }
        }
      }
    }
  }

  return Message.create({
    lead_id: opts.leadId,
    ambassador_id: opts.ambassadorId ?? null,
    booking_id: opts.bookingId ?? null,
    direction: "outbound",
    audience: opts.audience,
    kind: opts.kind,
    channel,
    language: opts.language,
    body,
    to_masked: toMasked,
    wa_link: waPreviewLink(body),
    twilio_sid: sid,
    status,
    fallback_reason: reason,
  });
}
