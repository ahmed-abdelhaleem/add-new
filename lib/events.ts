import type { BonusEvent, BonusEventKind } from "./types";

/**
 * Pure helpers — no DB imports, safe for client components.
 * Generators that insert events live in `lib/event-actions.ts`.
 */

/**
 * Active event multiplier — used by the points engine when logging a behavior.
 * Combines all overlapping events. Track multipliers compound with double_hour
 * but rescue_week and seasonal only apply on top.
 */
export function activeEventMultiplier(events: BonusEvent[], behavior?: string): number {
  let m = 1;
  for (const e of events) {
    switch (e.payload.kind) {
      case "double_hour":
        m *= e.payload.multiplier;
        break;
      case "rescue_week":
        m *= e.payload.multiplier;
        break;
      case "seasonal":
        m *= e.payload.behaviorMultiplier;
        break;
      case "track_bonus":
        m *= e.payload.multiplier;
        break;
      case "challenge_drop":
        if (e.payload.behavior && e.payload.behavior === behavior) {
          // No extra multiplier — the flat bonus is paid out when challenge is completed.
        }
        break;
    }
  }
  return m;
}

export function describeEvent(e: BonusEvent): string {
  const ends = new Date(e.endsAt);
  const timeLeft = Math.max(0, Math.floor((ends.getTime() - Date.now()) / 60000));
  switch (e.payload.kind) {
    case "double_hour":
      return `Double Points Hour — ${timeLeft} min left.`;
    case "challenge_drop":
      return `${e.payload.description} (+${e.payload.bonusPoints})`;
    case "seasonal":
      return `${e.payload.description}`;
    case "rescue_week":
      return `Rescue Week active — ${e.payload.multiplier}× on three actions.`;
    case "track_bonus":
      return `Track bonus active — ${e.payload.multiplier}× on track behaviors.`;
  }
}

export const EVENT_KIND_LABELS: Record<BonusEventKind, string> = {
  double_hour: "Double Points Hour",
  challenge_drop: "Challenge Drop",
  seasonal: "Seasonal Event",
  rescue_week: "Rescue Week",
  track_bonus: "Track Bonus",
};
