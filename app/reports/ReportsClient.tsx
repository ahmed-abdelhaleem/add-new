"use client";

import { useState } from "react";

import type { MonthlyReport } from "@/lib/types";

export default function ReportsClient({ initialReports }: { initialReports: MonthlyReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      const exists = reports.some((r) => r.monthKey === data.report.monthKey);
      setReports(
        exists
          ? reports.map((r) => (r.monthKey === data.report.monthKey ? data.report : r))
          : [data.report, ...reports]
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pattern reports</h1>
        <p className="text-sm text-ink-300">Behavioral summary, plain language. Not clinical.</p>
      </header>

      <button className="btn-primary w-full disabled:opacity-50" disabled={generating} onClick={generate}>
        {generating ? "Generating…" : "Generate this month"}
      </button>
      {error && <p className="text-xs text-flame">{error}</p>}

      {reports.length === 0 && <p className="text-sm text-ink-400">No reports yet.</p>}

      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.monthKey} className="card">
            <h3 className="text-sm font-semibold">{r.monthKey}</h3>
            <p className="text-xs text-ink-400">Generated {new Date(r.generatedAt).toLocaleString()}</p>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-ink-100">{r.content}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
