import { Types } from "mongoose";
import { retrySummary } from "@/lib/flow";
import { consumeAgentQuota, ipHashFrom } from "@/lib/guardrails";
import { handle } from "@/lib/api";

export const maxDuration = 120;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) return Response.json({ error: "Invalid call id" }, { status: 400 });
    const ipHash = ipHashFrom(req);
    const q = await consumeAgentQuota(ipHash);
    if (!q.ok) return Response.json({ error: q.message, limited: true }, { status: 429 });
    return Response.json(await retrySummary(id, ipHash));
  });
}
