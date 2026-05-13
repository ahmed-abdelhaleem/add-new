import { listMedication, listMood } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { buildMoodHeatmap, moodIntensity } from "@/lib/heatmap";

import MoodClient from "./MoodClient";

export const dynamic = "force-dynamic";

export default async function MoodPage() {
  const userId = await getUserId();
  const mood = listMood(userId);
  const medication = listMedication(userId);
  const heatmap = buildMoodHeatmap(mood);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mood + medication</h1>
        <p className="text-sm text-ink-300">Private. Used only to surface patterns to you.</p>
      </header>
      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Last 12 weeks</h2>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {heatmap.map((c) => (
            <div
              key={c.date}
              className={`aspect-square rounded ${moodIntensity(c.mood)}`}
              title={`${c.date} — ${c.mood || "—"}/5`}
            />
          ))}
        </div>
      </section>
      <MoodClient initialMood={mood} initialMedication={medication} />
    </div>
  );
}
