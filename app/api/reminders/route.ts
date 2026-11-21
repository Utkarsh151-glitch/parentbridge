import { Types } from "mongoose";
import { baseUrlFrom, sendReminder } from "@/lib/flow";
import { handle, readJson } from "@/lib/api";

export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    const { bookingId } = await readJson<{ bookingId?: string }>(req);
    if (!bookingId || !Types.ObjectId.isValid(bookingId)) return Response.json({ error: "Invalid booking id" }, { status: 400 });
    return Response.json({ message: await sendReminder(bookingId, baseUrlFrom(req)) });
  });
}
