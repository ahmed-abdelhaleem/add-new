"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ENERGY_LABELS = ["Empty", "Low", "OK", "Good", "Charged"];

export default function MorningPage() {
  const router = useRouter();
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [commitment, setCommitment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/morning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energy, commitment }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Morning</h1>
        <p className="text-sm text-ink-300">Three minutes max.</p>
      </header>

      <section className="card space-y-4">
        <div>
          <label className="text-sm text-ink-200">Energy</label>
          <input
            type="range"
            min={1}
            max={5}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
            className="mt-3 w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-400">
            {ENERGY_LABELS.map((l, i) => (
              <span key={l} className={i + 1 === energy ? "text-ink-100" : ""}>
                {l}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-ink-200">Today I will…</label>
          <textarea
            value={commitment}
            onChange={(e) => setCommitment(e.target.value.slice(0, 120))}
            placeholder="One sentence. Max 15 words."
            rows={2}
            className="mt-2 w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
          />
          <p className="mt-1 text-xs text-ink-400">{commitment.length}/120</p>
        </div>

        <button
          className="btn-primary w-full disabled:opacity-50"
          disabled={submitting || commitment.trim().length === 0}
          onClick={submit}
        >
          {submitting ? "Saving…" : "Set the day"}
        </button>
        {error && <p className="text-xs text-flame">{error}</p>}
      </section>

      <p className="text-xs text-ink-400">
        ACE will pick your three priority actions based on today&apos;s energy and the
        domains you&apos;ve been quiet on.
      </p>
    </div>
  );
}
