import { connectDB } from "@/lib/db/connect";
import { Message } from "@/lib/db/models";
import { explainTwilioError, validTwilioSignature } from "@/lib/whatsapp/twilio";

/** Twilio delivery-status callbacks: queued → sent → delivered / read, or failed (e.g. 63016). */
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));
  const url = new URL(req.url);
  const sig = req.headers.get("x-twilio-signature");
  const ok = [req.url, `https://${req.headers.get("x-forwarded-host") ?? url.host}${url.pathname}`].some((u) =>
    validTwilioSignature(u, params, sig)
  );
  if (!ok) return new Response("Invalid Twilio signature", { status: 403 });

  await connectDB();
  const status = params.MessageStatus;
  const failed = status === "failed" || status === "undelivered";
  await Message.updateOne(
    { twilio_sid: params.MessageSid },
    {
      $set: {
        status,
        ...(failed
          ? { channel: "preview", fallback_reason: `${explainTwilioError(params.ErrorCode, params.ErrorMessage)} — showing a preview instead` }
          : {}),
      },
    }
  );
  return new Response(null, { status: 204 });
}
