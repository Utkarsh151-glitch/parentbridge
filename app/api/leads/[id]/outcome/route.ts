import { Types } from "mongoose";
import { setOutcome } from "@/lib/flow";
import { handle, readJson } from "@/lib/api";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) return Response.json({ error: "Invalid lead id" }, { status: 400 });
    const { outcome } = await readJson<{ outcome?: string }>(req);
    if (outcome !== "seat_reserved" && outcome !== "withdrawn") return Response.json({ error: "Unknown outcome" }, { status: 400 });
    return Response.json(await setOutcome(id, outcome));
  });
}
