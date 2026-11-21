import { connectDB } from "@/lib/db/connect";
import { hitLimit, ipHashFrom, istDay } from "@/lib/guardrails";
import { clearSimulation, simulate21Days } from "@/lib/simulate";
import { handle } from "@/lib/api";

export const maxDuration = 60;

/** Writes clearly flagged simulated=true events for a 21-day pilot. */
export async function POST(req: Request) {
  return handle(async () => {
    await connectDB();
    const lim = await hitLimit(`simulate:${ipHashFrom(req)}:${istDay()}`, 30);
    if (!lim.allowed) return Response.json({ error: "Simulation limit reached for today." }, { status: 429 });
    return Response.json(await simulate21Days());
  });
}

export async function DELETE() {
  return handle(async () => {
    await clearSimulation();
    return Response.json({ ok: true });
  });
}
