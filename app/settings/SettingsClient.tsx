"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { tierForStake } from "@/lib/onboarding";
import type { StakeTier, UserSettings } from "@/lib/types";

export default function SettingsClient({
  initial,
  settings,
}: {
  initial: { name: string; stakeSEK: number; charity: string; tier: StakeTier };
  settings: UserSettings;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [stake, setStake] = useState(initial.stakeSEK);
  const [charity, setCharity] = useState(initial.charity);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [s, setS] = useState(settings);

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

  const updateToggle = async (patch: Partial<UserSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    await fetch("/api/user-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-ink-300">Tier, charity, profile, preferences.</p>
      </header>

      <section className="card space-y-4">
        <div>
          <label className="text-sm text-ink-200">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="text-sm text-ink-200">Monthly stake</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[500, 1000, 2000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setStake(v)}
                className={`btn text-xs ${stake === v ? "bg-gold text-ink-900" : "bg-ink-700"}`}
              >
                {v} SEK
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
            className="mt-2 w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-gold"
          />
        </div>

        <button className="btn-primary w-full disabled:opacity-50" disabled={saving} onClick={save}>
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-ink-200">Preferences</h2>

        <Toggle
          label="Confirm before logging"
          hint="Show a popup before each behavior is logged."
          on={s.confirmBeforeLog}
          onChange={(v) => updateToggle({ confirmBeforeLog: v })}
        />
        <Toggle
          label="Subtract points on spiral log"
          hint="Deduct points proportional to spiral duration. Default off."
          on={s.bingeSubtractPoints}
          onChange={(v) => updateToggle({ bingeSubtractPoints: v })}
        />

        <div>
          <label className="text-sm text-ink-200">Default chart period</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => updateToggle({ defaultChartPeriod: p })}
                className={`btn text-xs ${s.defaultChartPeriod === p ? "bg-gold text-ink-900" : "bg-ink-700"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-ink-700"
    >
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-ink-400">{hint}</p>
      </div>
      <div className={`h-6 w-11 rounded-full p-1 ${on ? "bg-gold" : "bg-ink-600"}`}>
        <div className={`h-4 w-4 rounded-full bg-ink-100 transition-transform ${on ? "translate-x-5" : ""}`} />
      </div>
    </button>
  );
}
