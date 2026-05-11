import type { LevelInfo } from "./types";

// PRD §5 Feature 8 — levels 1–50 based on total lifetime points.
// A geometric curve: each level requires ~10% more points than the previous.
// Level 1 → 0, Level 2 → 25,000, … Level 50 ≈ 2.5M lifetime points.

const BASE_POINTS = 25_000;
const GROWTH = 1.10;

export function lifetimeThreshold(level: number): number {
  if (level <= 1) return 0;
  // Sum of geometric series.
  return Math.round(BASE_POINTS * (Math.pow(GROWTH, level - 1) - 1) / (GROWTH - 1));
}

export function levelFromLifetimePoints(points: number): number {
  for (let lvl = 50; lvl >= 1; lvl--) {
    if (points >= lifetimeThreshold(lvl)) return lvl;
  }
  return 1;
}

// PRD: each level unlocks new categories / tiers / tracks.
const UNLOCKS: Record<number, string[]> = {
  1: ["Starter tier", "Brain dump", "Daily architecture"],
  5: ["Standard tier", "Travel category in Vault"],
  10: ["Committed tier", "Rotating challenge tracks"],
  15: ["Accountability calls"],
  20: ["Community challenges"],
  25: ["All-in tier", "Curiosity Hour"],
  30: ["Seasonal event leaderboard"],
  40: ["Lifetime trip drop"],
  50: ["Founder badge"],
};

export function lifetimeLevel(points: number): LevelInfo {
  const level = levelFromLifetimePoints(points);
  const nextLevelAt = level >= 50 ? lifetimeThreshold(50) : lifetimeThreshold(level + 1);
  const prevAt = lifetimeThreshold(level);
  const pctToNext = level >= 50 ? 100 : Math.min(100, ((points - prevAt) / (nextLevelAt - prevAt)) * 100);

  const unlocked = new Set<string>();
  for (const [lvl, items] of Object.entries(UNLOCKS)) {
    if (Number(lvl) <= level) items.forEach((i) => unlocked.add(i));
  }
  return { level, lifetimePoints: points, nextLevelAt, pctToNext, unlockedAt: [...unlocked] };
}

export function nextUnlock(level: number): { level: number; items: string[] } | null {
  for (let l = level + 1; l <= 50; l++) {
    if (UNLOCKS[l]) return { level: l, items: UNLOCKS[l] };
  }
  return null;
}
