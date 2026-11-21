import { connection } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { providerChain } from "@/lib/llm";
import { demoRecipient, twilioConfigured } from "@/lib/whatsapp/twilio";

/** Integration status for smoke tests — no secrets. */
export async function GET() {
  await connection();
  let db = "down";
  try {
    await connectDB();
    db = mongoose.connection.readyState === 1 ? "ok" : "connecting";
  } catch (e) {
    db = `error: ${(e as Error).message.slice(0, 80)}`;
  }
  return Response.json({
    db,
    llm: { chain: providerChain().map((e) => `${e.provider}:${e.model}`) },
    whatsapp: { twilio: twilioConfigured(), demo_recipient: !!demoRecipient() },
    india_post: "https://api.postalpincode.in",
  });
}
