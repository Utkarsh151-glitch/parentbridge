import { rateCall } from "@/lib/flow";
import { handle, readJson } from "@/lib/api";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    const { token } = await ctx.params;
    const { rating } = await readJson<{ rating?: number }>(req);
    return Response.json(await rateCall(token, Number(rating)));
  });
}
