"use client";

import { useState } from "react";

import type { MedicationLog, MoodLog } from "@/lib/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function MoodClient({
  initialMood,
  initialMedication,
}: {
  initialMood: MoodLog[];
  initialMedication: MedicationLog[];
}) {
  const todaysMood = initialMood.find((m) => m.date === today())?.mood ?? 3;
  const todaysMed = initialMedication.find((m) => m.date === today())?.taken ?? null;

  const [mood, setMood] = useState<number>(todaysMood);
  const [note, setNote] = useState("");
  const [medTaken, setMedTaken] = useState<boolean | null>(todaysMed);
  const [saved, setSaved] = useState(false);

  const saveMood = async () => {
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, note: note || undefined }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const saveMed = async (taken: boolean) => {
    setMedTaken(taken);
    await fetch("/api/medication", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taken }),
    });
  };

  return (
    <>
      <section className="card space-y-4">
        <div>
          <label className="text-sm text-ink-200">Today&apos;s mood</label>
          <input
            type="range"
            min={1}
            max={5}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-400">
            <span>Empty</span>
            <span>Low</span>
            <span>OK</span>
            <span>Good</span>
            <span>Bright</span>
          </div>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          rows={2}
          placeholder="Optional note"
          className="w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
        />
        <button className="btn-primary w-full" onClick={saveMood}>
          {saved ? "Saved" : "Save mood"}
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-ink-200">ADHD medication (optional)</h2>
        <p className="text-xs text-ink-400">Private. Never shared. Used to correlate patterns in your monthly report.</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`btn ${medTaken === true ? "bg-flame text-ink-900" : "bg-ink-700"}`}
            onClick={() => saveMed(true)}
          >
            Taken today
          </button>
          <button
            className={`btn ${medTaken === false ? "bg-flame text-ink-900" : "bg-ink-700"}`}
            onClick={() => saveMed(false)}
          >
            Not today
          </button>
        </div>
      </section>
    </>
  );
}
