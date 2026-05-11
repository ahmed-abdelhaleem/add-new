import { BEHAVIORS } from "./economy";
import type { BehaviorKey, LoggedBehavior } from "./types";

/**
 * Selects today's three priority actions for the dashboard.
 *
 * PRD §5 Feature 1: max 3, AI-selected, tuned by morning energy check-in
 * and recent gaps in the user's pattern. This implementation is the
 * deterministic baseline — ACE may override in conversation, but the
 * dashboard never shows more than three.
 */
export function pickPriorities(opts: {
  energy: 1 | 2 | 3 | 4 | 5;
  monthHistory: LoggedBehavior[];
}): BehaviorKey[] {
  const { energy, monthHistory } = opts;

  const counts: Record<string, number> = {};
  for (const h of monthHistory) {
    counts[h.behavior] = (counts[h.behavior] || 0) + 1;
  }

  // High-energy days: bias toward physical + social anchors.
  // Low-energy days: small wins keep the streak alive.
  const highEnergyPool: BehaviorKey[] = [
    "gym_session",
    "left_apartment_social",
    "swedish_study",
    "steps_10k",
    "office_workday",
    "sport_session",
  ];
  const midEnergyPool: BehaviorKey[] = [
    "swedish_study",
    "steps_7k",
    "home_cooked_meal",
    "reading_20",
    "personal_connect",
    "daily_plan_completed",
  ];
  const lowEnergyPool: BehaviorKey[] = [
    "brain_dump",
    "sleep_7_9",
    "screen_free_hour",
    "home_cooked_meal",
    "reading_20",
    "daily_plan_completed",
  ];

  const pool = energy >= 4 ? highEnergyPool : energy === 3 ? midEnergyPool : lowEnergyPool;

  // Prefer behaviors the user has done LESS this month — fight one-domain dominance.
  const ranked = [...pool].sort((a, b) => (counts[a] || 0) - (counts[b] || 0));

  // De-dup and clamp to 3.
  const seen = new Set<string>();
  const out: BehaviorKey[] = [];
  for (const key of ranked) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length === 3) break;
  }

  // If somehow short, top up from the full behavior list.
  if (out.length < 3) {
    for (const def of BEHAVIORS) {
      if (seen.has(def.key)) continue;
      out.push(def.key);
      if (out.length === 3) break;
    }
  }

  return out;
}
