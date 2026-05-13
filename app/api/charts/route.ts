import { NextResponse } from "next/server";

import { BEHAVIOR_INDEX } from "@/lib/economy";
import { listBehaviorsAll } from "@/lib/db";
import { getUserId } from "@/lib/session";

type Period = "day" | "week" | "month";

function periodKeyFor(d: Date, period: Period): string {
  if (period === "day") return d.toISOString().slice(0, 10);
  if (period === "month") return d.toISOString().slice(0, 7);
  // ISO week
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const userId = await getUserId();
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") as Period) ?? "week";
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit") ?? 12)));

  const history = listBehaviorsAll(userId);

  // Build per-period totals.
  const byPeriod: Record<string, { total: number; byDomain: Record<string, number>; events: number }> = {};
  for (const b of history) {
    const key = periodKeyFor(new Date(b.loggedAt), period);
    if (!byPeriod[key]) byPeriod[key] = { total: 0, byDomain: {}, events: 0 };
    byPeriod[key].total += b.awardedPoints;
    byPeriod[key].events += 1;
    let domain: string = BEHAVIOR_INDEX[b.behavior]?.domain ?? "";
    if (!domain && b.behavior?.toString().startsWith("custom:")) domain = "regulation";
    if (!domain) domain = "other";
    byPeriod[key].byDomain[domain] = (byPeriod[key].byDomain[domain] || 0) + b.awardedPoints;
  }

  const sorted = Object.entries(byPeriod)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, limit)
    .reverse();

  // Trends across whole window.
  const total = history.reduce((s, b) => s + b.awardedPoints, 0);
  const events = history.length;

  return NextResponse.json({
    period,
    series: sorted.map(([key, v]) => ({ period: key, ...v })),
    total,
    events,
  });
}
