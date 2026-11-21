import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getAmbassadorView } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { AmbassadorConsole, type AmbView } from "./ambassador-console";

export const metadata: Metadata = { title: "parent ambassador", robots: { index: false } };
export const maxDuration = 120;

export default function AmbassadorPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[36rem] w-full rounded-2xl" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const view = await getAmbassadorView(token);
  if (!view) notFound();
  return <AmbassadorConsole view={view as unknown as AmbView} token={token} />;
}
