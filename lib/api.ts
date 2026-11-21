import { DbNotConfiguredError } from "@/lib/db/connect";
import { FlowError } from "@/lib/flow";

/** Consistent JSON errors for route handlers. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof FlowError) return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof DbNotConfiguredError) return Response.json({ error: e.message }, { status: 503 });
    if (e instanceof SyntaxError) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    console.error(e);
    return Response.json({ error: (e as Error).message || "Something went wrong" }, { status: 500 });
  }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  return (await req.json()) as T;
}
