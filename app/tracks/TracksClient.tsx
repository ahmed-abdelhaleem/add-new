"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ChallengeTrack, TrackEnrollment } from "@/lib/types";

type TrackInfo = ChallengeTrack & { behaviorLabels: string[] };

export default function TracksClient({
  tracks,
  active,
  history,
}: {
  tracks: TrackInfo[];
  active: TrackEnrollment[];
  history: TrackEnrollment[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const enrolledKeys = new Set(active.map((a) => a.trackKey));

  const enroll = async (key: string) => {
    setPending(key);
    await fetch("/api/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackKey: key }),
    });
    setPending(null);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Challenge tracks</h1>
        <p className="text-sm text-ink-300">3-week themed programs. They expire. The core habits don&apos;t.</p>
      </header>

      <ul className="grid grid-cols-1 gap-3">
        {tracks.map((t) => {
          const enrolled = enrolledKeys.has(t.key);
          return (
            <li key={t.key} className="card">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold">{t.title}</h3>
                <span className="text-xs text-gold">{t.trackMultiplier}× on track behaviors</span>
              </div>
              <p className="mt-1 text-sm text-ink-300">{t.description}</p>
              <ul className="mt-2 text-xs text-ink-400">
                {t.behaviorLabels.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
              <button
                className={`mt-3 ${enrolled ? "btn-ghost" : "btn-primary"} w-full disabled:opacity-50`}
                disabled={enrolled || pending !== null}
                onClick={() => enroll(t.key)}
              >
                {enrolled ? "Enrolled" : pending === t.key ? "…" : "Enroll for 3 weeks"}
              </button>
            </li>
          );
        })}
      </ul>

      {history.filter((h) => h.completedAt).length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">Past</h2>
          <ul className="mt-2 space-y-1 text-xs text-ink-300">
            {history
              .filter((h) => h.completedAt)
              .map((h) => (
                <li key={h.id}>{h.trackKey} — {new Date(h.completedAt!).toLocaleDateString()}</li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
