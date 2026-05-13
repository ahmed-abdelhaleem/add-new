"use client";

import { useMemo, useState, useTransition } from "react";

import type { IntegrationCatalogEntry, IntegrationKey } from "@/lib/integrations";

type Props = {
  initialFlags: Record<IntegrationKey, boolean>;
  catalog: IntegrationCatalogEntry[];
};

export default function AdminDashboard({ initialFlags, catalog }: Props) {
  const [flags, setFlags] = useState(initialFlags);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ordered = useMemo(() => catalog.map((c) => ({ ...c, enabled: flags[c.key] ?? true })), [catalog, flags]);

  function setFlag(key: IntegrationKey, enabled: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/integration-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: unknown };
        setError(typeof j.error === "string" ? j.error : "Save failed");
        return;
      }
      setFlags((prev) => ({ ...prev, [key]: enabled }));
    });
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Admin · Integrations</h1>
        <p className="mt-2 text-sm text-ink-300">
          Toggle third-party and prototype integrations. When an integration is off, the app uses safe fallbacks
          or returns HTTP 503 for the affected API actions.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-flame/40 bg-flame/5 px-4 py-3 text-sm text-flame">{error}</div>
      )}

      <ul className="space-y-6">
        {ordered.map((entry) => (
          <li key={entry.key} className="card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink-100">{entry.title}</h2>
                <p className="mt-1 text-sm text-ink-400">{entry.summary}</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-200">
                <span>{entry.enabled ? "On" : "Off"}</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-gold"
                  checked={entry.enabled}
                  disabled={pending}
                  onChange={(e) => setFlag(entry.key, e.target.checked)}
                />
              </label>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">Environment</h3>
              <p className="mt-1 font-mono text-xs text-ink-300">{entry.envVars.join(" · ") || "—"}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">Tokens & access</h3>
              <p className="mt-1 text-sm text-ink-300">{entry.accessNotes}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">Setup steps</h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-ink-300">
                {entry.setupSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
