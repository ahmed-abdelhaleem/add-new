import type { LoggedBehavior, MoodLog } from "./types";

export interface HeatmapCell {
  date: string;
  count: number;
  points: number;
}

/**
 * Build the last `days` days as heatmap cells, newest last.
 */
export function buildActivityHeatmap(history: LoggedBehavior[], days = 84, today: Date = new Date()): HeatmapCell[] {
  const out: HeatmapCell[] = [];
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entries = history.filter((h) => h.loggedAt.startsWith(key));
    out.push({
      date: key,
      count: entries.length,
      points: entries.reduce((s, e) => s + e.awardedPoints, 0),
    });
  }
  return out;
}

export function intensityClass(count: number): string {
  if (count === 0) return "bg-ink-700";
  if (count <= 2) return "bg-flame/30";
  if (count <= 4) return "bg-flame/60";
  if (count <= 6) return "bg-flame/80";
  return "bg-flame";
}

export function buildMoodHeatmap(mood: MoodLog[], days = 84, today: Date = new Date()) {
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  const index: Record<string, MoodLog> = {};
  for (const m of mood) index[m.date] = m;
  const out: Array<{ date: string; mood: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, mood: index[key]?.mood ?? 0 });
  }
  return out;
}

export function moodIntensity(mood: number): string {
  if (mood === 0) return "bg-ink-700";
  if (mood <= 1) return "bg-flame/70";
  if (mood <= 2) return "bg-gold/40";
  if (mood <= 3) return "bg-gold/70";
  if (mood <= 4) return "bg-mint/60";
  return "bg-mint";
}
