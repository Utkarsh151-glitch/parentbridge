import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/pb";
import { AddLeadForm } from "./form";

export const metadata: Metadata = { title: "Add a lead" };

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/console" className="text-sm text-muted-foreground hover:underline">
        ← Console
      </Link>
      <PageTitle
        title="Add your own stalled family"
        sub="Type a case the way a counsellor would write it — mixed Telugu-English is fine. The agent will resolve the PIN code live, find a parent ambassador and draft the offer. Leads you add are not randomised, so they are kept out of the experiment numbers."
      />
      <AddLeadForm />
    </div>
  );
}
