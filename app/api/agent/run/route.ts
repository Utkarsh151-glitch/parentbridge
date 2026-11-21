import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AgentRun, Lead } from "@/lib/db/models";
import { consumeAgentQuota, ipHashFrom } from "@/lib/guardrails";
import { llmConfigured } from "@/lib/llm";
import { runMatchAgent } from "@/lib/agent/matchAgent";
import { handle, readJson } from "@/lib/api";

export const maxDuration = 300;

/** Runs the matching agent and streams every model turn and tool call as Server-Sent Events. */
export async function POST(req: Request) {
  return handle(async () => {
    const { leadId } = await readJson<{ leadId?: string }>(req);
    if (!leadId || !Types.ObjectId.isValid(leadId)) return Response.json({ error: "Invalid lead id" }, { status: 400 });
    await connectDB();
    const lead = await Lead.findById(leadId).select("arm").lean();
    if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });
    if (lead.arm !== "treatment") return Response.json({ error: "Control-arm families are not contacted (experiment integrity)." }, { status: 409 });
    if (!llmConfigured()) return Response.json({ error: "No AI provider is configured on the server." }, { status: 503 });

    const busy = await AgentRun.exists({ lead_id: leadId, kind: "match", status: "running", createdAt: { $gt: new Date(Date.now() - 4 * 60_000) } });
    if (busy) return Response.json({ error: "The agent is already running for this family — refresh in a moment." }, { status: 409 });

    const ipHash = ipHashFrom(req);
    const quota = await consumeAgentQuota(ipHash);
    if (!quota.ok) return Response.json({ error: quota.message, limited: true }, { status: 429 });

    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let open = true;
        const send = (e: unknown) => {
          if (!open) return;
          try {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
          } catch {
            open = false; // client went away — the run still finishes and is saved
          }
        };
        const ping = setInterval(() => send({ type: "ping" }), 10_000);
        try {
          await runMatchAgent({ leadId, ipHash, onEvent: send });
        } catch (e) {
          send({ type: "error", message: (e as Error).message, retryable: true });
        } finally {
          clearInterval(ping);
          if (open) controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
