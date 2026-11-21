import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Match } from "@/lib/db/models";
import { LANG_CODES, type LangCode } from "@/lib/constants";
import { consumeAgentQuota, ipHashFrom } from "@/lib/guardrails";
import { regenerateFamilyMessage } from "@/lib/agent/regenerate";
import { handle, readJson } from "@/lib/api";

export const maxDuration = 120;

export async function POST(req: Request) {
  return handle(async () => {
    const { leadId, language, force } = await readJson<{ leadId?: string; language?: string; force?: boolean }>(req);
    if (!leadId || !Types.ObjectId.isValid(leadId)) return Response.json({ error: "Invalid lead id" }, { status: 400 });
    if (!language || !LANG_CODES.includes(language as LangCode)) return Response.json({ error: "Unsupported language" }, { status: 400 });
    await connectDB();
    const ipHash = ipHashFrom(req);
    // Cached language variants are free; only new generations count against the AI quota.
    const m = await Match.findOne({ lead_id: leadId, family_message: { $ne: null } }).sort({ createdAt: -1 }).select("family_message_variants").lean();
    const cached = !!(m?.family_message_variants as Record<string, unknown> | undefined)?.[language];
    if (!cached || force) {
      const q = await consumeAgentQuota(ipHash);
      if (!q.ok) return Response.json({ error: q.message, limited: true }, { status: 429 });
    }
    const r = await regenerateFamilyMessage({ leadId, language: language as LangCode, force: !!force, ipHash });
    if (!r.ok) return Response.json({ error: r.error, rate_limited: r.rate_limited }, { status: r.rate_limited ? 429 : 502 });
    return Response.json(r);
  });
}
