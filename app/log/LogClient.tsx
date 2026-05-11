"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { BehaviorDefinition } from "@/lib/types";

type DomainKey = BehaviorDefinition["domain"];

const DOMAIN_LABELS: Record<DomainKey, string> = {
  physical: "Physical",
  mental: "Mental & Learning",
  social: "Social & Engagement",
  regulation: "Self-Regulation",
};

interface LastAward {
  behavior: string;
  awarded: number;
  multiplier: number;
  reasons: string[];
}

export default function LogClient({ behaviors }: { behaviors: BehaviorDefinition[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [last, setLast] = useState<LastAward | null>(null);

  const log = async (key: string, label: string) => {
    setPending(key);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ behavior: key }),
      });
      const data = await res.json();
      setLast({
        behavior: label,
        awarded: data.result.awardedPoints,
        multiplier: data.result.multiplier,
        reasons: data.result.reasons,
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  };

  const grouped = behaviors.reduce<Record<DomainKey, BehaviorDefinition[]>>((acc, b) => {
    (acc[b.domain] ??= []).push(b);
    return acc;
  }, { physical: [], mental: [], social: [], regulation: [] });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Log a behavior</h1>
        <p className="text-sm text-ink-300">One tap. Points settle instantly.</p>
      </header>

      {last && (
        <div className="card border-mint/40 bg-mint/5">
          <p className="text-sm text-mint">
            +{last.awarded} pts · {last.behavior}
            {last.multiplier > 1 && ` · ${last.multiplier}× multiplier`}
          </p>
          {last.reasons.length > 0 && (
            <ul className="mt-1 text-xs text-ink-300">
              {last.reasons.map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(Object.keys(grouped) as DomainKey[]).map((domain) => (
        <section key={domain} className="card space-y-3">
          <h2 className="text-sm font-semibold text-ink-200">{DOMAIN_LABELS[domain]}</h2>
          <div className="grid grid-cols-1 gap-2">
            {grouped[domain].map((b) => (
              <button
                key={b.key}
                onClick={() => log(b.key, b.label)}
                disabled={pending !== null}
                className="flex items-center justify-between rounded-xl bg-ink-700 px-3 py-3 text-left hover:bg-ink-600 disabled:opacity-50"
              >
                <span>
                  <span className="block text-sm">{b.label}</span>
                  <span className="block text-xs text-ink-400">{b.notes}</span>
                </span>
                <span className="text-sm text-gold">+{b.points}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
