"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Choice = "yes" | "partly" | "no";

export default function EveningPage() {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const submit = async () => {
    if (!choice) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/evening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ didOneThing: choice, reflection }),
      });
      const data = await res.json();
      setDone(data.awarded ?? 200);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Evening</h1>
        <p className="text-sm text-ink-300">Two minutes. No judgment either way.</p>
      </header>

      <section className="card space-y-4">
        <p className="text-sm text-ink-200">Did you do your one thing today?</p>
        <div className="grid grid-cols-3 gap-2">
          {(["yes", "partly", "no"] as Choice[]).map((c) => (
            <button
              key={c}
              onClick={() => setChoice(c)}
              className={`btn ${choice === c ? "bg-flame text-ink-900" : "bg-ink-700 text-ink-100"}`}
            >
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        <div>
          <label className="text-sm text-ink-200">One sentence — what happened.</label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value.slice(0, 280))}
            rows={3}
            className="mt-2 w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
          />
        </div>

        <button
          className="btn-primary w-full disabled:opacity-50"
          disabled={!choice || reflection.trim().length === 0 || submitting}
          onClick={submit}
        >
          {submitting ? "Saving…" : "Close the day"}
        </button>

        {done !== null && (
          <p className="text-sm text-mint">
            +{done} pts for showing up. That counts.
          </p>
        )}
      </section>
    </div>
  );
}
