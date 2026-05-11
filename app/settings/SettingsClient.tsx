"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { tierForStake } from "@/lib/onboarding";
import type { StakeTier } from "@/lib/types";

export default function SettingsClient({
  initial,
}: {
  initial: { name: string; stakeSEK: number; charity: string; tier: StakeTier };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [stake, setStake] = useState(initial.stakeSEK);
  const [charity, setCharity] = useState(initial.charity);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, stakeSEK: stake, charity }),
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-ink-300">Tier, charity, profile.</p>
      </header>

      <section className="card space-y-4">
        <div>
          <label className="text-sm text-ink-200">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
          />
        </div>

        <div>
          <label className="text-sm text-ink-200">Monthly stake</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[500, 1000, 2000, 5000].map((s) => (
              <button
                key={s}
                onClick={() => setStake(s)}
                className={`btn text-xs ${stake === s ? "bg-flame text-ink-900" : "bg-ink-700"}`}
              >
                {s} SEK
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-400">Tier: {tierForStake(stake)}</p>
        </div>

        <div>
          <label className="text-sm text-ink-200">Charity (where unclaimed stake goes)</label>
          <input
            value={charity}
            onChange={(e) => setCharity(e.target.value)}
            className="mt-2 w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
          />
        </div>

        <button className="btn-primary w-full disabled:opacity-50" disabled={saving} onClick={save}>
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </section>
    </div>
  );
}
