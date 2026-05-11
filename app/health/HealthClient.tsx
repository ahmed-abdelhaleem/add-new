"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { HealthSample } from "@/lib/types";

const PROVIDERS = [
  { key: "apple_health", label: "Apple Health" },
  { key: "google_fit", label: "Google Health Connect" },
  { key: "garmin", label: "Garmin" },
  { key: "fitbit", label: "Fitbit" },
] as const;

export default function HealthClient({
  provider,
  samples,
}: {
  provider: string | null;
  samples: { steps: HealthSample[]; sleep: HealthSample[]; hr: HealthSample[]; workout: HealthSample[] };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const connect = async (p: string) => {
    setPending(true);
    await fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", provider: p }),
    });
    setPending(false);
    router.refresh();
  };

  const disconnect = async () => {
    await fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    router.refresh();
  };

  const addSample = async (kind: HealthSample["kind"], value: number) => {
    await fetch("/api/health", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, value }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
        <p className="text-sm text-ink-300">Steps, sleep, heart rate, workouts.</p>
      </header>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Provider</h2>
        {provider ? (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-mint">Connected — {provider.replace("_", " ")}.</p>
            <button className="btn-ghost text-xs" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.key}
                disabled={pending}
                onClick={() => connect(p.key)}
                className="btn-ghost text-xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-ink-400">
          Stubbed for web — production wires Apple HealthKit / Google Health
          Connect in the mobile shell. Until then, log manual entries below.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-ink-200">Manual log</h2>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost text-xs" onClick={() => addSample("steps", 7500)}>
            + 7,500 steps
          </button>
          <button className="btn-ghost text-xs" onClick={() => addSample("steps", 10000)}>
            + 10,000 steps
          </button>
          <button className="btn-ghost text-xs" onClick={() => addSample("sleep", 7.5)}>
            + 7.5h sleep
          </button>
          <button className="btn-ghost text-xs" onClick={() => addSample("workout", 45)}>
            + 45 min workout
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Recent</h2>
        <ul className="mt-2 space-y-1 text-xs text-ink-300">
          {(["steps", "sleep", "hr", "workout"] as const).map((k) => (
            <li key={k}>
              {k}: {samples[k].length} sample{samples[k].length === 1 ? "" : "s"}
              {samples[k][0] && (
                <span className="text-ink-400">
                  {" · latest "}
                  {samples[k][0].value} {samples[k][0].unit}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
