import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getBookingView } from "@/lib/data";
import { proposeSlots } from "@/lib/flow";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "Book your call", robots: { index: false } };

export default function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-2xl" />}>
        <Booking params={params} />
      </Suspense>
    </div>
  );
}

async function Booking({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const view = await getBookingView(token);
  if (!view) notFound();
  const slots = proposeSlots().map((d) => d.toISOString());
  return <BookingForm view={view} slots={slots} />;
}
