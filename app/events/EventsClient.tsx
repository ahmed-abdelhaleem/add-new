"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EVENT_KIND_LABELS, describeEvent } from "@/lib/events";
import type { BonusEvent } from "@/lib/types";

export default function EventsClient({
  active,
  history,
}: {
  active: BonusEvent[];
  history: BonusEvent[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fire = async (kind: "double_hour" | "challenge_drop" | "rescue_week" | "seasonal") => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed");
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const completeChallenge = async (e: BonusEvent) => {
    const bonus = e.payload.kind === "challenge_drop" ? e.payload.bonusPoints : 0;
    await fetch("/api/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: e.id, bonusPoints: bonus }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Bonus events</h1>
        <p className="text-sm text-ink-300">Double hours, challenge drops, rescue weeks, seasonals.</p>
      </header>

      <section className="card space-y-2">
        <h2 className="text-sm font-semibold text-ink-200">Trigger manually</h2>
        <p className="text-xs text-ink-400">
          In production these fire automatically when the engagement
          signature predicts a low-engagement window.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost text-xs" disabled={pending} onClick={() => fire("double_hour")}>
            Double Points Hour
          </button>
          <button className="btn-ghost text-xs" disabled={pending} onClick={() => fire("challenge_drop")}>
            Challenge Drop
          </button>
          <button className="btn-ghost text-xs" disabled={pending} onClick={() => fire("rescue_week")}>
            Rescue Week
          </button>
          <button className="btn-ghost text-xs" disabled={pending} onClick={() => fire("seasonal")}>
            Seasonal Event
          </button>
        </div>
        {error && <p className="text-xs text-flame">{error}</p>}
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Active ({active.length})</h2>
        {active.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">Nothing live.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {active.map((e) => (
              <li key={e.id} className="rounded-xl bg-mint/5 border border-mint/30 p-3">
                <p className="text-xs text-mint">{EVENT_KIND_LABELS[e.kind]}</p>
                <p className="mt-1 text-sm">{describeEvent(e)}</p>
                {e.payload.kind === "challenge_drop" && (
                  <button className="btn-primary mt-3 w-full text-xs" onClick={() => completeChallenge(e)}>
                    Mark complete (+{e.payload.bonusPoints} pts)
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">History</h2>
        <ul className="mt-2 space-y-1 text-xs text-ink-300">
          {history.length === 0 && <li className="text-ink-400">No past events.</li>}
          {history.map((e) => (
            <li key={e.id} className="flex items-center justify-between">
              <span>{EVENT_KIND_LABELS[e.kind]} · {new Date(e.startsAt).toLocaleDateString()}</span>
              <span>
                {e.completedAt ? "✓" : "—"}
                {e.awardedPoints != null && ` +${e.awardedPoints}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
