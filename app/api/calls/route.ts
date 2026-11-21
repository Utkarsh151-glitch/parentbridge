import { baseUrlFrom, completeCall } from "@/lib/flow";
import { consumeAgentQuota, ipHashFrom } from "@/lib/guardrails";
import { handle, readJson } from "@/lib/api";

export const maxDuration = 120;

/** parent ambassador marks the call done → credit + AI summary + family rating request. */
export async function POST(req: Request) {
  return handle(async () => {
    const { token, notes, durationMin } = await readJson<{ token?: string; notes?: string; durationMin?: number }>(req);
    if (!token || !notes) return Response.json({ error: "Missing token or notes" }, { status: 400 });
    const ipHash = ipHashFrom(req);
    const q = await consumeAgentQuota(ipHash);
    if (!q.ok) return Response.json({ error: q.message, limited: true }, { status: 429 });
    const r = await completeCall({ ambassadorToken: token, notes, durationMin, baseUrl: baseUrlFrom(req), ipHash });
    return Response.json(r);
  });
}
