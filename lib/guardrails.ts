import { createHash } from "node:crypto";
import { connectDB } from "@/lib/db/connect";
import { RateLimit } from "@/lib/db/models";

const DAY = 86_400_000;

/** Hashed client IP (we never store raw IPs — DPDP data minimisation). */
export function ipHashFrom(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || req.headers.get("x-real-ip") || "local";
  return createHash("sha256")
    .update(`${ip}|${process.env.IP_HASH_SALT ?? "parentbridge-demo"}`)
    .digest("hex")
    .slice(0, 16);
}

export function istDay(d = new Date()): string {
  return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

/** Atomic counter with a TTL — returns whether this hit is within the limit. */
export async function hitLimit(key: string, limit: number, windowMs = DAY) {
  await connectDB(); // routes may call this before anything else touches the DB (cold serverless instance)
  const now = new Date();
  const doc = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $set: { last_at: now }, $setOnInsert: { expires_at: new Date(now.getTime() + windowMs) } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  return { allowed: (doc?.count ?? 1) <= limit, count: doc?.count ?? 1, limit };
}

export async function peekLimit(key: string) {
  await connectDB();
  const doc = await RateLimit.findOne({ key }).lean();
  return doc?.count ?? 0;
}

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);

/** Agent runs on the public demo: N per IP per day + a global daily cap (protects the free AI quota). */
export async function consumeAgentQuota(ipHash: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const perIp = num(process.env.AGENT_RUNS_PER_IP_PER_DAY, 15);
  const global = num(process.env.AGENT_RUNS_GLOBAL_PER_DAY, 150);
  const day = istDay();
  const ip = await hitLimit(`agent:ip:${ipHash}:${day}`, perIp);
  if (!ip.allowed) {
    return {
      ok: false,
      message: `You've used today's ${perIp} free AI runs for this demo. Saved runs (★) still open instantly — please browse those, or come back tomorrow.`,
    };
  }
  const g = await hitLimit(`agent:global:${day}`, global);
  if (!g.allowed) {
    return {
      ok: false,
      message: "The demo's shared daily AI budget is used up. Saved runs (★) still open instantly.",
    };
  }
  return { ok: true };
}
