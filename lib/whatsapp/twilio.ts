import { createHmac, timingSafeEqual } from "node:crypto";

// Twilio REST API (WhatsApp sandbox) via fetch — no SDK needed on serverless.
const API = "https://api.twilio.com/2010-04-01";

export function twilioConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

/** DEMO_WHATSAPP_TO → "whatsapp:+<E.164>". A bare 10-digit number is treated as Indian (+91). */
export function demoRecipient(): string | null {
  const raw = process.env.DEMO_WHATSAPP_TO?.trim().replace(/^whatsapp:/i, "");
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (!raw.startsWith("+")) {
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
  }
  return digits.length >= 10 ? `whatsapp:+${digits}` : null;
}

export function maskNumber(n: string): string {
  const digits = n.replace(/^whatsapp:/, "");
  return digits.length > 6 ? `${digits.slice(0, 3)}•••••${digits.slice(-3)}` : "•••";
}

const KNOWN: Record<string, string> = {
  "63015": "this number hasn't joined the Twilio sandbox (send the join code first)",
  "63016": "outside WhatsApp's 24-hour window — send any message to the sandbox to reopen it",
  "63018": "sandbox rate limit (1 message every 3 seconds)",
  "21654": "this sender only accepts pre-approved templates right now (trial number, or the 24-hour window is closed)",
  "572002": "the demo phone hasn't joined this Twilio account's sandbox (send the join code, then “hi”)",
  "21608": "trial account can only message verified numbers",
  "21211": "invalid 'To' number",
  "20003": "Twilio authentication failed — check the SID/token",
};

export function explainTwilioError(code?: string | number | null, message?: string): string {
  const c = code ? String(code) : "";
  return `Twilio ${c ? `${c}: ` : ""}${KNOWN[c] ?? message ?? "send failed"}`;
}

type SendResult = { ok: true; sid: string; status: string } | { ok: false; code?: string; reason: string };

export async function sendWhatsApp(opts: { to: string; body: string; statusCallback?: string }): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const form = new URLSearchParams({ From: process.env.TWILIO_WHATSAPP_FROM!, To: opts.to, Body: opts.body });
  if (opts.statusCallback) form.set("StatusCallback", opts.statusCallback);
  try {
    const res = await fetch(`${API}/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, code: j.code ? String(j.code) : undefined, reason: explainTwilioError(j.code, j.message) };
    return { ok: true, sid: j.sid, status: j.status };
  } catch (e) {
    return { ok: false, reason: `Twilio unreachable: ${(e as Error).message}` };
  }
}

export async function fetchMessageStatus(messageSid: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  try {
    const res = await fetch(`${API}/Accounts/${sid}/Messages/${messageSid}.json`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(6000),
    });
    const j = await res.json();
    return { status: j.status as string, errorCode: j.error_code as number | null, errorMessage: j.error_message as string | null };
  } catch {
    return null;
  }
}

/** Validate X-Twilio-Signature (HMAC-SHA1 over URL + sorted POST params). */
export function validTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", token).update(Buffer.from(data, "utf8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function twiml(message?: string): Response {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}
