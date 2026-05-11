"use client";

import { useState } from "react";

import type { BrainDumpCategorization } from "@/lib/types";

interface DumpResult {
  categorized: BrainDumpCategorization;
  awarded: number;
}

export default function DumpPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<DumpResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResult({ categorized: data.dump.categorized, awarded: data.award?.awardedPoints ?? 0 });
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Brain dump</h1>
        <p className="text-sm text-ink-300">What&apos;s in your head right now?</p>
      </header>

      <section className="card">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Dump everything. No structure required."
          className="w-full resize-none rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
        />
        <button
          className="btn-primary mt-3 w-full disabled:opacity-50"
          disabled={submitting || !text.trim()}
          onClick={submit}
        >
          {submitting ? "Sorting…" : "Capture"}
        </button>
      </section>

      {result && (
        <section className="card space-y-3">
          <p className="text-sm text-ink-200">{result.categorized.summary}</p>
          {result.awarded > 0 && (
            <p className="text-xs text-mint">+{result.awarded} pts for the dump.</p>
          )}
          <Bucket title="Action items" items={result.categorized.actionItems} accent="text-flame" />
          <Bucket title="Curiosity queue" items={result.categorized.curiosityQueue} accent="text-gold" />
          <Bucket title="Wishlist (24-h cooling)" items={result.categorized.wishlist} accent="text-mint" />
          <Bucket title="Acknowledged" items={result.categorized.anxious} accent="text-ink-300" />
        </section>
      )}
    </div>
  );
}

function Bucket({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className={`text-xs font-semibold ${accent}`}>{title}</h3>
      <ul className="mt-1 space-y-1 text-sm text-ink-100">
        {items.map((it, i) => (
          <li key={i}>· {it}</li>
        ))}
      </ul>
    </div>
  );
}
