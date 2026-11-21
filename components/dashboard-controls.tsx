"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SimulateButtons({ hasSimulated }: { hasSimulated: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sim" | "clear" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(kind: "sim" | "clear") {
    setBusy(kind);
    setErr(null);
    try {
      const res = await fetch("/api/simulate", { method: kind === "sim" ? "POST" : "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="lg" onClick={() => act("sim")} disabled={!!busy}>
        {busy === "sim" ? <Loader2 className="animate-spin" /> : <Shuffle />} {hasSimulated ? "Re-simulate 21 days" : "Simulate 21 days"}
      </Button>
      {hasSimulated && (
        <Button size="lg" variant="outline" onClick={() => act("clear")} disabled={!!busy}>
          {busy === "clear" ? <Loader2 className="animate-spin" /> : <Trash2 />} Clear simulated
        </Button>
      )}
      {err && <span className="text-sm text-rose-700">{err}</span>}
    </div>
  );
}
