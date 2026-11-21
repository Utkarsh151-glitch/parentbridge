import { baseUrlFrom, confirmBooking } from "@/lib/flow";
import { handle, readJson } from "@/lib/api";

export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    const { token } = await ctx.params;
    const { slot, consent, language } = await readJson<{ slot?: string; consent?: boolean; language?: string }>(req);
    if (!slot) return Response.json({ error: "Pick a time" }, { status: 400 });
    const r = await confirmBooking({ token, slot, consent: !!consent, language, baseUrl: baseUrlFrom(req) });
    return Response.json(r);
  });
}
