import type { EngagementSignature, LoggedBehavior } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayKey(d: Date | string) {
  return (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
}

/**
 * Computes the user's engagement signature.
 *
 * PRD §5 Feature 2 — escalation tiers:
 *   day 3 low: nudge
 *   day 5 low: in-app reflection prompt
 *   day 7 low: rescue week
 *   day 10 low: human accountability
 *
 * "Low" = events-per-day across last 7 days is >30% below the 28-day
 * personal baseline.
 */
export function computeEngagement(
  history: LoggedBehavior[],
  reference: Date = new Date()
): EngagementSignature {
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);

  const eventsOnDay = (offset: number) => {
    const target = new Date(ref);
    target.setDate(target.getDate() - offset);
    const k = dayKey(target);
    return history.filter((h) => h.loggedAt.slice(0, 10) === k).length;
  };

  // 28-day baseline (excluding today).
  let baselineCount = 0;
  for (let i = 1; i <= 28; i++) baselineCount += eventsOnDay(i);
  const baseline = baselineCount / 28;

  // Last 7 days (excluding today, to avoid penalizing mid-day).
  let last7 = 0;
  for (let i = 1; i <= 7; i++) last7 += eventsOnDay(i);
  const recent = last7 / 7;

  const deltaPct = baseline === 0 ? 0 : ((recent - baseline) / baseline) * 100;

  let consecutiveLow = 0;
  if (baseline > 0) {
    const threshold = baseline * 0.7; // >30% below baseline
    for (let i = 1; i <= 14; i++) {
      if (eventsOnDay(i) < threshold) consecutiveLow += 1;
      else break;
    }
  }

  const tier: EngagementSignature["decayTier"] =
    consecutiveLow >= 10 ? 10 : consecutiveLow >= 7 ? 7 : consecutiveLow >= 5 ? 5 : consecutiveLow >= 3 ? 3 : 0;

  return {
    baselineEventsPerDay: baseline,
    last7DaysEventsPerDay: recent,
    deltaPct,
    consecutiveLowDays: consecutiveLow,
    decayTier: tier,
  };
}

export function decayMessage(tier: EngagementSignature["decayTier"]): string | null {
  switch (tier) {
    case 0:
      return null;
    case 3:
      return "Brief dip detected — sending a low-pressure bonus challenge.";
    case 5:
      return "Five quiet days. Reflection prompt: what shifted? No judgment.";
    case 7:
      return "Rescue Week activated: 3-action mode, all actions earn 1.5×.";
    case 10:
      return "Reaching out to your accountability partner — if you have one.";
  }
}
