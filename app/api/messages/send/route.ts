import { Types } from "mongoose";
import { baseUrlFrom, sendOffer } from "@/lib/flow";
import { handle, readJson } from "@/lib/api";

export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    const { leadId } = await readJson<{ leadId?: string }>(req);
    if (!leadId || !Types.ObjectId.isValid(leadId)) return Response.json({ error: "Invalid lead id" }, { status: 400 });
    return Response.json(await sendOffer(leadId, baseUrlFrom(req)));
  });
}
