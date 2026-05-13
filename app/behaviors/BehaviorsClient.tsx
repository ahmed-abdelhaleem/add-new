"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { BehaviorDefinition, BehaviorOverride, CustomBehavior, RoutineSlot } from "@/lib/types";

const DOMAINS = ["physical", "mental", "social", "regulation", "foundation", "nourish"] as const;
const ROUTINES = ["morning", "midday", "evening"] as const;

type Tab = "built-in" | "custom" | "new";

export default function BehaviorsClient({
  builtIn,
  custom,
  overrides,
}: {
  builtIn: BehaviorDefinition[];
  custom: CustomBehavior[];
  overrides: BehaviorOverride[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("built-in");
  const [feedback, setFeedback] = useState<string | null>(null);

  const overrideMap: Record<string, BehaviorOverride> = Object.fromEntries(overrides.map((o) => [o.behaviorKey, o]));

  const saveOverride = async (key: string, patch: Partial<BehaviorOverride>) => {
    const existing = overrideMap[key];
    const merged: BehaviorOverride = {
      behaviorKey: key,
      points: existing?.points ?? null,
      dailyCap: existing?.dailyCap ?? null,
      dailyCapActive: existing?.dailyCapActive ?? true,
      enabled: existing?.enabled ?? true,
      ...patch,
    };
    await fetch("/api/behaviors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        behaviorKey: key,
        overridePoints: merged.points,
        overrideDailyCap: merged.dailyCap,
        dailyCapActive: merged.dailyCapActive,
        overrideEnabled: merged.enabled,
      }),
    });
    setFeedback(`Saved override for ${key}.`);
    router.refresh();
    setTimeout(() => setFeedback(null), 1500);
  };

  const clearOverride = async (key: string) => {
    await fetch("/api/behaviors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ behaviorKey: key, clearOverride: true }),
    });
    setFeedback(`Cleared override.`);
    router.refresh();
    setTimeout(() => setFeedback(null), 1500);
  };

  const saveCustom = async (id: string, patch: Partial<CustomBehavior>) => {
    await fetch("/api/behaviors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    router.refresh();
  };

  const deleteCustom = async (id: string) => {
    await fetch("/api/behaviors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Behaviors</h1>
        <p className="text-sm text-ink-300">Adjust point values, add your own, toggle caps on/off.</p>
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-700 p-1">
        {(["built-in", "custom", "new"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-2 text-xs font-medium ${tab === t ? "bg-gold text-ink-900" : "text-ink-300"}`}
          >
            {t === "built-in" ? "Built-in" : t === "custom" ? `Custom (${custom.length})` : "+ New"}
          </button>
        ))}
      </div>

      {feedback && <div className="card border-mint/40 bg-mint/5 text-sm text-mint">{feedback}</div>}

      {tab === "built-in" && (
        <ul className="space-y-3">
          {builtIn.map((b) => {
            const o = overrideMap[b.key];
            return (
              <li key={b.key} className="card">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">{b.label}</h3>
                  <span className="text-xs text-ink-400">{b.domain}</span>
                </div>
                <p className="text-xs text-ink-400">{b.notes}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs items-center">
                  <label className="text-ink-300">Points</label>
                  <input
                    type="number"
                    defaultValue={o?.points ?? b.points}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== (o?.points ?? b.points))
                        saveOverride(b.key, { points: v === b.points ? null : v });
                    }}
                    className="col-span-1 rounded-lg bg-ink-700 px-2 py-1 text-right"
                  />
                  <span className="text-ink-400">default {b.points}</span>

                  <label className="text-ink-300">Daily cap</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="—"
                    defaultValue={o?.dailyCap ?? b.dailyCap ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      saveOverride(b.key, { dailyCap: v });
                    }}
                    className="col-span-1 rounded-lg bg-ink-700 px-2 py-1 text-right"
                  />
                  <span className="text-ink-400">{b.dailyCap ? `default ${b.dailyCap}/d` : "uncapped"}</span>

                  <label className="text-ink-300">Cap active</label>
                  <button
                    onClick={() => saveOverride(b.key, { dailyCapActive: !(o?.dailyCapActive ?? true) })}
                    className={`col-span-1 rounded-lg px-2 py-1 text-xs ${
                      (o?.dailyCapActive ?? true) ? "bg-gold text-ink-900" : "bg-ink-700"
                    }`}
                  >
                    {(o?.dailyCapActive ?? true) ? "on" : "off"}
                  </button>
                  <span className="text-ink-400">limits per day</span>

                  <label className="text-ink-300">Enabled</label>
                  <button
                    onClick={() => saveOverride(b.key, { enabled: !(o?.enabled ?? true) })}
                    className={`col-span-1 rounded-lg px-2 py-1 text-xs ${
                      (o?.enabled ?? true) ? "bg-gold text-ink-900" : "bg-ink-700"
                    }`}
                  >
                    {(o?.enabled ?? true) ? "yes" : "hidden"}
                  </button>
                  <span className="text-ink-400">show on log</span>
                </div>
                {o && (
                  <button onClick={() => clearOverride(b.key)} className="mt-3 text-xs text-flame underline">
                    Reset to default
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {tab === "custom" && (
        <ul className="space-y-3">
          {custom.length === 0 && <p className="text-sm text-ink-400">Nothing yet. Tap + New.</p>}
          {custom.map((c) => (
            <li key={c.id} className="card">
              <div className="flex items-baseline justify-between">
                <input
                  defaultValue={c.label}
                  onBlur={(e) => {
                    if (e.target.value !== c.label) saveCustom(c.id, { label: e.target.value });
                  }}
                  className="bg-transparent text-sm font-semibold focus:outline-none"
                />
                <span className="text-xs text-ink-400">{c.domain}</span>
              </div>
              <p className="text-xs text-ink-400">{c.notes ?? ""}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs items-center">
                <label className="text-ink-300">Points</label>
                <input
                  type="number"
                  defaultValue={c.points}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== c.points) saveCustom(c.id, { points: v });
                  }}
                  className="rounded-lg bg-ink-700 px-2 py-1 text-right"
                />
                <span className="text-ink-400">/log</span>

                <label className="text-ink-300">Daily cap</label>
                <input
                  type="number"
                  min={1}
                  placeholder="—"
                  defaultValue={c.dailyCap ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    saveCustom(c.id, { dailyCap: v });
                  }}
                  className="rounded-lg bg-ink-700 px-2 py-1 text-right"
                />
                <span className="text-ink-400">{c.dailyCap ? `${c.dailyCap}/d` : "uncapped"}</span>

                <label className="text-ink-300">Routine</label>
                <select
                  defaultValue={c.routine ?? ""}
                  onChange={(e) =>
                    saveCustom(c.id, { routine: (e.target.value || null) as RoutineSlot })
                  }
                  className="rounded-lg bg-ink-700 px-2 py-1"
                >
                  <option value="">none</option>
                  {ROUTINES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <span className="text-ink-400">dashboard slot</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => saveCustom(c.id, { enabled: !c.enabled })}
                  className="btn-ghost text-xs"
                >
                  {c.enabled ? "Disable" : "Enable"}
                </button>
                <button onClick={() => deleteCustom(c.id)} className="text-xs text-flame underline">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "new" && <NewBehaviorForm onCreated={() => { router.refresh(); setTab("custom"); }} />}
    </div>
  );
}

function NewBehaviorForm({ onCreated }: { onCreated: () => void }) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>("regulation");
  const [points, setPoints] = useState(500);
  const [dailyCap, setDailyCap] = useState<number | "">(1);
  const [routine, setRoutine] = useState<RoutineSlot>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!slug.trim() || !label.trim()) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/behaviors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: slug.replace(/[^a-z0-9_]/g, "_"),
        label,
        notes: notes || undefined,
        domain,
        points,
        dailyCap: dailyCap === "" ? undefined : dailyCap,
        routine,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const d = await res.json();
      setError(typeof d.error === "string" ? d.error : "Failed to create.");
      return;
    }
    onCreated();
  };

  return (
    <section className="card space-y-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label, e.g. 'Stretch 10 min'"
        className="w-full rounded-xl bg-ink-700 p-3 text-sm focus:outline-none focus:border-gold"
      />
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
        placeholder="slug (lowercase, e.g. 'stretch_10')"
        className="w-full rounded-xl bg-ink-700 p-3 text-sm focus:outline-none focus:border-gold"
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note shown on the log surface"
        className="w-full rounded-xl bg-ink-700 p-3 text-sm focus:outline-none focus:border-gold"
      />
      <div className="grid grid-cols-2 gap-2 text-sm">
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value as (typeof DOMAINS)[number])}
          className="rounded-xl bg-ink-700 p-3"
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          placeholder="points"
          className="rounded-xl bg-ink-700 p-3 text-right"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <input
          type="number"
          min={1}
          value={dailyCap}
          onChange={(e) => setDailyCap(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="daily cap (blank = none)"
          className="rounded-xl bg-ink-700 p-3 text-right"
        />
        <select
          value={routine ?? ""}
          onChange={(e) => setRoutine((e.target.value || null) as RoutineSlot)}
          className="rounded-xl bg-ink-700 p-3"
        >
          <option value="">no routine slot</option>
          {ROUTINES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <button className="btn-primary w-full disabled:opacity-50" disabled={pending} onClick={submit}>
        {pending ? "Creating…" : "Create behavior"}
      </button>
      {error && <p className="text-xs text-flame">{error}</p>}
    </section>
  );
}
