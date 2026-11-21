import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Lead } from "@/lib/db/models";
import { LANG_CODES, UNIVERSITIES } from "@/lib/constants";
import { hitLimit, ipHashFrom, istDay } from "@/lib/guardrails";
import { handle, readJson } from "@/lib/api";

const NewLead = z.object({
  student_name: z.string().trim().min(2).max(80),
  parent_name: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
  language: z.enum(LANG_CODES as [string, ...string[]]),
  preferred_university: z.union([z.enum(UNIVERSITIES.map((u) => u.name) as [string, ...string[]]), z.literal("")]),
  fee_band: z.enum(["low", "mid", "high"]),
  counselling_notes: z.string().trim().min(20, "Add at least a sentence or two of notes").max(1500),
  consent_whatsapp: z.boolean(),
});

/** "Add a lead" — a reviewer's own case. Not randomised, so it is excluded from the experiment. */
export async function POST(req: Request) {
  return handle(async () => {
    const parsed = NewLead.safeParse(await readJson(req));
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
    }
    await connectDB();
    const lim = await hitLimit(`lead:create:${ipHashFrom(req)}:${istDay()}`, 20);
    if (!lim.allowed) return Response.json({ error: "Daily limit for new demo leads reached." }, { status: 429 });
    const lead = await Lead.create({
      ...parsed.data,
      parent_phone: `+91 00000 9${String(Math.floor(Math.random() * 10_000)).padStart(4, "0")}`,
      counselling_date: new Date(Date.now() - 7 * 86_400_000),
      arm: "treatment",
      source: "manual",
      in_experiment: false,
      status: "counselled",
    });
    return Response.json({ id: String(lead._id) }, { status: 201 });
  });
}
