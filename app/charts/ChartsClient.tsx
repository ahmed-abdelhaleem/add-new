"use client";

import { useEffect, useState } from "react";

type Period = "day" | "week" | "month";

interface Bucket {
  period: string;
  total: number;
  byDomain: Record<string, number>;
  events: number;
}

const DOMAIN_COLOR: Record<string, string> = {
  physical: "bg-gold",
  mental: "bg-amber",
  social: "bg-mint",
  regulation: "bg-flame",
  foundation: "bg-ink-300",
  nourish: "bg-amber-dim",
  other: "bg-ink-500",
};

export default function ChartsClient() {
  const [period, setPeriod] = useState<Period>("week");
  const [series, setSeries] = useState<Bucket[]>([]);
  const [total, setTotal] = useState(0);
  const [events, setEvents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/charts?period=${period}&limit=12`)
      .then((r) => r.json())
      .then((d) => {
        setSeries(d.series);
        setTotal(d.total);
        setEvents(d.events);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const max = Math.max(1, ...series.map((s) => s.total));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Charts</h1>
        <p className="text-sm text-ink-300">Day / week / month totals from the activity log.</p>
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-700 p-1">
        {(["day", "week", "month"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg py-2 text-xs font-medium ${period === p ? "bg-gold text-ink-900" : "text-ink-300"}`}
          >
            {p}
          </button>
        ))}
      </div>

      <section className="card grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-xs text-ink-400">Lifetime points</p>
          <p className="text-2xl font-display font-semibold text-gold">{total.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Lifetime events</p>
          <p className="text-2xl font-display font-semibold">{events.toLocaleString()}</p>
        </div>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Last 12 {period}s</h2>
        {loading ? (
          <p className="mt-2 text-xs text-ink-400">Loading…</p>
        ) : series.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">No data for this period yet.</p>
        ) : (
          <div className="mt-3 flex items-end gap-1 h-40">
            {series.map((b) => (
              <div key={b.period} className="flex flex-1 flex-col items-center">
                <div
                  className="w-full bg-gold rounded-t"
                  style={{ height: `${(b.total / max) * 100}%` }}
                  title={`${b.period}: ${b.total} pts`}
                />
                <span className="mt-1 text-[10px] text-ink-400 truncate w-full text-center">
                  {b.period.slice(period === "day" ? 5 : 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Breakdown by domain</h2>
        <ul className="mt-3 space-y-3">
          {series.map((b) => {
            const sum = Object.values(b.byDomain).reduce((s, v) => s + v, 0) || 1;
            return (
              <li key={b.period}>
                <div className="flex items-baseline justify-between text-xs">
                  <span>{b.period}</span>
                  <span className="text-ink-400">{b.total.toLocaleString()} pts · {b.events} events</span>
                </div>
                <div className="mt-1 flex h-2 rounded-full overflow-hidden bg-ink-700">
                  {Object.entries(b.byDomain).map(([d, v]) => (
                    <div
                      key={d}
                      className={DOMAIN_COLOR[d] ?? "bg-ink-500"}
                      style={{ width: `${(v / sum) * 100}%` }}
                      title={`${d}: ${v} pts`}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Legend</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {Object.entries(DOMAIN_COLOR).map(([d, color]) => (
            <li key={d} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${color}`} />
              <span className="text-ink-300">{d}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
