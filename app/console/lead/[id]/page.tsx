import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLeadView } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentRunView, type LeadView } from "@/components/agent-run-view";

export const metadata: Metadata = { title: "Agent run" };
export const maxDuration = 60;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function LeadPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/console" className="text-sm text-muted-foreground hover:underline">
        ← Console
      </Link>
      <Suspense
        fallback={
          <div className="mt-4 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <LeadContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LeadContent({ params, searchParams }: Props) {
  await connection();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const view = await getLeadView(id);
  if (!view) notFound();
  return <AgentRunView data={view as unknown as LeadView} autoRun={sp.run === "1"} />;
}
