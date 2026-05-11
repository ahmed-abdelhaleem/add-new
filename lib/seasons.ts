import type { BonusEventPayload } from "./types";

// PRD §5 Feature 8 — quarterly seasonal events.
// Returns the season currently in effect for the given date, or null.

export function currentSeason(now: Date = new Date()): {
  key: string;
  label: string;
  payload: Extract<BonusEventPayload, { kind: "seasonal" }>;
} | null {
  const m = now.getMonth(); // 0-indexed
  if (m >= 5 && m <= 7) {
    return {
      key: "summer_streak",
      label: "Summer Streak",
      payload: {
        kind: "seasonal",
        seasonKey: "summer_streak",
        description: "Travel rewards boosted, outdoor 2×.",
        behaviorMultiplier: 2,
      },
    };
  }
  if (m === 10) {
    return {
      key: "dark_month",
      label: "Dark Month Challenge",
      payload: {
        kind: "seasonal",
        seasonKey: "dark_month",
        description: "Swedish winter focus — social + gym emphasis.",
        behaviorMultiplier: 1.5,
      },
    };
  }
  if (m === 0) {
    return {
      key: "new_year",
      label: "New Year Momentum",
      payload: {
        kind: "seasonal",
        seasonKey: "new_year",
        description: "Highest-bonus month of the year.",
        behaviorMultiplier: 2,
      },
    };
  }
  return null;
}

export function seasonalEndDate(now: Date = new Date()): Date {
  const season = currentSeason(now);
  if (!season) return now;
  const m = now.getMonth();
  const year = now.getFullYear();
  if (season.key === "summer_streak") return new Date(year, 8, 1); // Sep 1
  if (season.key === "dark_month") return new Date(year, 11, 1); // Dec 1
  if (season.key === "new_year") return new Date(year, 1, 1); // Feb 1
  return new Date(year, m + 1, 1);
}
