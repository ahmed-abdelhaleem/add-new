"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { BehaviorDefinition, BehaviorOverride, CustomBehavior } from "@/lib/types";

type DomainKey = BehaviorDefinition["domain"];

const DOMAIN_LABELS: Record<DomainKey, string> = {
  physical: "Physical",
  mental: "Mental & Learning",
  social: "Social & Engagement",
  regulation: "Self-Regulation",
  foundation: "Foundation Mode",
  nourish: "NourishPlan",
};

interface LastAward {
  behavior: string;
  awarded: number;
  multiplier: number;
  reasons: string[];
}

type DisplayBehavior = {
  key: string; // built-in BehaviorKey OR `custom:<slug>`
  label: string;
  notes?: string;
  domain: DomainKey;
  points: number;
};

export default function LogClient({
  behaviors,
  overrides = [],
  custom = [],
  confirmBeforeLog = true,
}: {
  behaviors: BehaviorDefinition[];
  overrides?: BehaviorOverride[];
  custom?: CustomBehavior[];
  confirmBeforeLog?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [last, setLast] = useState<LastAward | null>(null);
  const [confirm, setConfirm] = useState<DisplayBehavior | null>(null);

  const overrideMap = Object.fromEntries(overrides.map((o) => [o.behaviorKey, o]));

  // Merge built-ins (with overrides) + custom.
  const merged: DisplayBehavior[] = [];
  for (const b of behaviors) {
    const o = overrideMap[b.key];
    if (o?.enabled === false) continue;
    merged.push({
      key: b.key,
      label: b.label,
      notes: b.notes,
      domain: b.domain,
      points: o?.points ?? b.points,
    });
  }
  for (const c of custom) {
    if (!c.enabled) continue;
    merged.push({
      key: `custom:${c.slug}`,
      label: c.label,
      notes: c.notes,
      domain: c.domain,
      points: c.points,
    });
  }

  const log = async (b: DisplayBehavior) => {
    setPending(b.key);
    setConfirm(null);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ behavior: b.key, confirmed: true }),
      });
      const data = await res.json();
      setLast({
        behavior: b.label,
        awarded: data.result.awardedPoints,
        multiplier: data.result.multiplier,
        reasons: data.result.reasons,
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  };

  const onTap = (b: DisplayBehavior) => {
    if (confirmBeforeLog) setConfirm(b);
    else log(b);
  };

  const grouped = merged.reduce<Record<DomainKey, DisplayBehavior[]>>((acc, b) => {
    if (!acc[b.domain]) acc[b.domain] = [];
    acc[b.domain].push(b);
    return acc;
  }, { physical: [], mental: [], social: [], regulation: [], foundation: [], nourish: [] });

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Log a behavior</h1>
          <p className="text-sm text-ink-300">One tap. Confirm. Points settle.</p>
        </div>
        <a href="/behaviors" className="text-xs text-gold underline">
          manage
        </a>
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

      {(Object.keys(grouped) as DomainKey[]).map((domain) =>
        grouped[domain].length > 0 ? (
          <section key={domain} className="card space-y-3">
            <h2 className="text-sm font-semibold text-ink-200">{DOMAIN_LABELS[domain]}</h2>
            <div className="grid grid-cols-1 gap-2">
              {grouped[domain].map((b) => (
                <button
                  key={b.key}
                  onClick={() => onTap(b)}
                  disabled={pending !== null}
                  className="flex items-center justify-between rounded-xl bg-ink-700 px-3 py-3 text-left hover:bg-ink-600 disabled:opacity-50"
                >
                  <span>
                    <span className="block text-sm">{b.label}</span>
                    {b.notes && <span className="block text-xs text-ink-400">{b.notes}</span>}
                  </span>
                  <span className="text-sm text-gold">+{b.points}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null
      )}

      {confirm && (
        <ConfirmModal
          behavior={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => log(confirm)}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  behavior,
  onCancel,
  onConfirm,
}: {
  behavior: DisplayBehavior;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-ink-800 border border-ink-700 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold">Log {behavior.label}?</h3>
        <p className="mt-1 text-sm text-ink-300">+{behavior.points} pts will be added.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-ghost flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
