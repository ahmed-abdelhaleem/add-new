"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { BingeKind, BingeLog, UserSettings } from "@/lib/types";

const KINDS: { key: BingeKind; label: string }[] = [
  { key: "search", label: "Search spiral (product / politics / lookups)" },
  { key: "scrolling", label: "Doom-scrolling" },
  { key: "shopping", label: "Binge shopping" },
  { key: "political", label: "Political rabbit hole" },
  { key: "food", label: "Binge eating" },
  { key: "gambling", label: "Gambling urge" },
  { key: "porn", label: "Porn / NSFW" },
  { key: "other", label: "Other" },
];

export default function BingeClient({
  initialLogs,
  initialSettings,
}: {
  initialLogs: BingeLog[];
  initialSettings: UserSettings;
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [subtractPoints, setSubtractPoints] = useState(initialSettings.bingeSubtractPoints);
  const [kind, setKind] = useState<BingeKind>("search");
  const [duration, setDuration] = useState<number>(10);
  const [triggerNote, setTriggerNote] = useState("");
  const [reflection, setReflection] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggleSubtract = async () => {
    const next = !subtractPoints;
    setSubtractPoints(next);
    await fetch("/api/user-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bingeSubtractPoints: next }),
    });
  };

  const submit = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/binge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          durationMinutes: duration,
          triggerNote: triggerNote || undefined,
          reflection: reflection || undefined,
        }),
      });
      const data = await res.json();
      if (data.log) {
        setLogs([data.log, ...logs]);
        setFeedback(data.deducted > 0 ? `Logged. -${data.deducted} pts.` : "Logged. No points deducted.");
        setTriggerNote("");
        setReflection("");
        router.refresh();
      }
    } finally {
      setPending(false);
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const del = async (id: string) => {
    await fetch("/api/binge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLogs(logs.filter((l) => l.id !== id));
    router.refresh();
  };

  const analyze = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/binge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setAnalysis(data.analysis ?? data.note);
    } finally {
      setPending(false);
    }
  };

  // Aggregate quick stats
  const last7 = logs.filter((l) => Date.now() - new Date(l.startedAt).getTime() < 7 * 24 * 60 * 60 * 1000);
  const byKind = last7.reduce<Record<string, number>>((acc, l) => {
    acc[l.kind] = (acc[l.kind] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Spirals & binges</h1>
        <p className="text-sm text-ink-300">
          Capture them — search rabbit holes, doom-scrolling, shopping spirals.
          The point is data, not punishment.
        </p>
      </header>

      <section className="card flex items-center justify-between">
        <div>
          <p className="text-sm">Subtract points when I log a spiral</p>
          <p className="text-xs text-ink-400">Default off. Turn on when you want the friction back.</p>
        </div>
        <button
          onClick={toggleSubtract}
          className={`h-6 w-11 rounded-full p-1 ${subtractPoints ? "bg-gold" : "bg-ink-600"}`}
          aria-label="Toggle point subtraction"
        >
          <div
            className={`h-4 w-4 rounded-full bg-ink-100 transition-transform ${subtractPoints ? "translate-x-5" : ""}`}
          />
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-ink-200">Log a spiral</h2>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as BingeKind)}
          className="w-full rounded-xl bg-ink-700 p-3 text-sm focus:outline-none focus:border-gold"
        >
          {KINDS.map((k) => (
            <option key={k.key} value={k.key}>{k.label}</option>
          ))}
        </select>

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-sm">
          <span className="text-ink-400">Duration</span>
          <input
            type="range"
            min={1}
            max={120}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-gold">{duration} min</span>
        </div>

        <textarea
          value={triggerNote}
          onChange={(e) => setTriggerNote(e.target.value)}
          rows={2}
          placeholder="What triggered it? (optional)"
          className="w-full rounded-xl bg-ink-700 p-3 text-sm focus:outline-none focus:border-gold"
        />
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={2}
          placeholder="Anything else worth capturing? (optional)"
          className="w-full rounded-xl bg-ink-700 p-3 text-sm focus:outline-none focus:border-gold"
        />
        <button className="btn-primary w-full disabled:opacity-50" disabled={pending} onClick={submit}>
          {pending ? "…" : "Log it"}
        </button>
        {feedback && <p className="text-xs text-mint">{feedback}</p>}
      </section>

      <section className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink-200">Last 7 days</h2>
          <span className="text-xs text-ink-400">{last7.length} spirals</span>
        </div>
        <ul className="mt-2 space-y-1 text-xs">
          {Object.entries(byKind).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-ink-300">
              <span>{KINDS.find((kk) => kk.key === k)?.label ?? k}</span>
              <span>×{v}</span>
            </li>
          ))}
          {Object.keys(byKind).length === 0 && <li className="text-ink-400">Nothing logged.</li>}
        </ul>
      </section>

      <section className="card space-y-2">
        <h2 className="text-sm font-semibold text-ink-200">Ask ACE for a pattern</h2>
        <p className="text-xs text-ink-400">Sends your last 30 logs to ACE for one observation + one experiment.</p>
        <button className="btn-ghost text-xs" disabled={pending} onClick={analyze}>
          {pending ? "Thinking…" : "Analyze patterns"}
        </button>
        {analysis && (
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-700 p-3 text-sm text-ink-100">{analysis}</pre>
        )}
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">History</h2>
        <ul className="mt-2 space-y-2">
          {logs.length === 0 && <p className="text-xs text-ink-400">Empty.</p>}
          {logs.map((l) => (
            <li key={l.id} className="rounded-lg bg-ink-700 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase text-gold">{l.kind}</span>
                <span className="text-xs text-ink-400">{new Date(l.startedAt).toLocaleString()}</span>
              </div>
              {l.durationMinutes != null && (
                <p className="text-xs text-ink-300">{l.durationMinutes} min</p>
              )}
              {l.triggerNote && <p className="text-sm">{l.triggerNote}</p>}
              {l.reflection && <p className="text-xs text-ink-300 italic">&ldquo;{l.reflection}&rdquo;</p>}
              <div className="mt-2 flex items-center justify-between text-xs">
                <span>{l.pointsDeducted > 0 ? `−${l.pointsDeducted} pts` : "no deduction"}</span>
                <button onClick={() => del(l.id)} className="text-flame underline">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
