import { listBehaviorsAll, listMood } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { buildActivityHeatmap, buildMoodHeatmap, intensityClass, moodIntensity } from "@/lib/heatmap";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const userId = await getUserId();
  const history = listBehaviorsAll(userId);
  const cells = buildActivityHeatmap(history);
  const mood = buildMoodHeatmap(listMood(userId));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-ink-300">Last 12 weeks.</p>
      </header>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Activity</h2>
        <p className="text-xs text-ink-400">One square per day. Darker = more behaviors logged.</p>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {cells.map((c) => (
            <div
              key={c.date}
              className={`aspect-square rounded ${intensityClass(c.count)}`}
              title={`${c.date} — ${c.count} events, ${c.points} pts`}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Mood</h2>
        <p className="text-xs text-ink-400">Empty squares are days you didn&apos;t log mood.</p>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {mood.map((c) => (
            <div
              key={c.date}
              className={`aspect-square rounded ${moodIntensity(c.mood)}`}
              title={`${c.date} — mood ${c.mood || "—"}/5`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
