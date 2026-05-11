import {
  BEHAVIOR_INDEX,
  COMEBACK_BONUS_COOLDOWN_DAYS,
  COMEBACK_BONUS_MULTIPLIER,
  DOMAIN_CAP_INDEX,
  MONTH_BONUSES,
  POINTS_PER_SEK,
  REDUCED_POINTS_PER_SEK,
  STREAK_RULES,
} from "./economy";
import type { BehaviorKey, Domain, LoggedBehavior } from "./types";

export interface AwardInput {
  behavior: BehaviorKey;
  loggedAt: Date;
  // History within the same calendar month, used to apply domain caps and daily caps.
  monthHistory: LoggedBehavior[];
  // Most-recent active day before today, used to decide whether to trigger a comeback bonus.
  daysSinceLastActivity?: number;
  // Whether the user has already claimed a comeback bonus within the cooldown window.
  comebackOnCooldown?: boolean;
  // Optional active event multiplier (e.g. Double Points Hour, challenge track).
  eventMultiplier?: number;
  // PRD §9 onboarding bonus: first 7 days earn at 1.5×, no stake charged.
  firstWeekMultiplier?: number;
}

export interface AwardResult {
  rawPoints: number;
  awardedPoints: number;
  multiplier: number;
  hitDailyCap: boolean;
  hitDomainCap: boolean;
  comebackTriggered: boolean;
  reasons: string[];
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const sameDay = (a: Date, b: Date) => ymd(a) === ymd(b);

/**
 * Award points for a single behavior log. Applies (in order):
 *   1. daily caps for the behavior
 *   2. monthly domain caps
 *   3. comeback bonus (after a 2–3+ day gap, once per 14 days)
 *   4. event multiplier (Double Points Hour, challenge track, etc.)
 *
 * Streak multipliers are applied weekly, not per-log — see `applyStreakMultiplier`.
 */
export function awardForBehavior(input: AwardInput): AwardResult {
  const def = BEHAVIOR_INDEX[input.behavior];
  if (!def) throw new Error(`Unknown behavior: ${input.behavior}`);

  const reasons: string[] = [];

  // Daily cap check.
  if (def.dailyCap !== undefined) {
    const today = input.monthHistory.filter(
      (h) => h.behavior === input.behavior && sameDay(new Date(h.loggedAt), input.loggedAt)
    );
    if (today.length >= def.dailyCap) {
      reasons.push(`Daily cap reached for ${def.label}`);
      return {
        rawPoints: 0,
        awardedPoints: 0,
        multiplier: 0,
        hitDailyCap: true,
        hitDomainCap: false,
        comebackTriggered: false,
        reasons,
      };
    }
  }

  // Monthly domain cap.
  const domain = def.domain;
  const domainCap = DOMAIN_CAP_INDEX[domain];
  const domainSpent = input.monthHistory
    .filter((h) => BEHAVIOR_INDEX[h.behavior]?.domain === domain)
    .reduce((sum, h) => sum + h.awardedPoints, 0);

  const remainingDomain = Math.max(0, domainCap - domainSpent);
  if (remainingDomain <= 0) {
    reasons.push(`Monthly cap reached for ${domain}`);
    return {
      rawPoints: def.points,
      awardedPoints: 0,
      multiplier: 0,
      hitDailyCap: false,
      hitDomainCap: true,
      comebackTriggered: false,
      reasons,
    };
  }

  // Compute multipliers.
  let multiplier = 1;
  let comebackTriggered = false;

  const gap = input.daysSinceLastActivity ?? 0;
  if (gap >= 2 && !input.comebackOnCooldown) {
    multiplier *= COMEBACK_BONUS_MULTIPLIER;
    comebackTriggered = true;
    reasons.push(`Comeback bonus: ${COMEBACK_BONUS_MULTIPLIER}× after ${gap}-day gap`);
  }

  if (input.eventMultiplier && input.eventMultiplier > 1) {
    multiplier *= input.eventMultiplier;
    reasons.push(`Event multiplier: ${input.eventMultiplier}×`);
  }

  if (input.firstWeekMultiplier && input.firstWeekMultiplier > 1) {
    multiplier *= input.firstWeekMultiplier;
    reasons.push(`First-week bonus: ${input.firstWeekMultiplier}×`);
  }

  const beforeCap = Math.round(def.points * multiplier);
  const awarded = Math.min(beforeCap, remainingDomain);
  const hitDomainCap = awarded < beforeCap;
  if (hitDomainCap) reasons.push(`Trimmed to domain cap (${remainingDomain} pts remaining)`);

  return {
    rawPoints: def.points,
    awardedPoints: awarded,
    multiplier,
    hitDailyCap: false,
    hitDomainCap,
    comebackTriggered,
    reasons,
  };
}

/**
 * Apply weekly streak multiplier to a week's points.
 * Selects the highest applicable rule (7/14/21 day).
 */
export function applyStreakMultiplier(weekPoints: number, currentStreakDays: number): {
  bonus: number;
  multiplier: number;
} {
  const rule = [...STREAK_RULES].reverse().find((r) => currentStreakDays >= r.days);
  if (!rule) return { bonus: 0, multiplier: 1 };
  const bonus = Math.round(weekPoints * (rule.multiplier - 1));
  return { bonus, multiplier: rule.multiplier };
}

/**
 * Compute end-of-month bonus points (PRD §4.3 Domain 5).
 */
export function monthEndBonus(opts: {
  monthCompletedWithAnyStreak: boolean;
  monthCompletedWithNoZeroDays: boolean;
}): number {
  let bonus = 0;
  if (opts.monthCompletedWithAnyStreak) bonus += MONTH_BONUSES.monthCompletedAnyStreak;
  if (opts.monthCompletedWithNoZeroDays) bonus += MONTH_BONUSES.monthCompletedNoZeroDays;
  return bonus;
}

/**
 * Convert points to SEK at full or reduced (Category B) rate.
 */
export function pointsToSEK(points: number, rate: "A" | "B" = "A"): number {
  const divisor = rate === "A" ? POINTS_PER_SEK : REDUCED_POINTS_PER_SEK;
  return points / divisor;
}

export function sekToPoints(sek: number, rate: "A" | "B" = "A"): number {
  const factor = rate === "A" ? POINTS_PER_SEK : REDUCED_POINTS_PER_SEK;
  return Math.ceil(sek * factor);
}

/**
 * Aggregate points across a month's log history, including caps applied per-log.
 */
export function summarizeMonth(history: LoggedBehavior[]): {
  byDomain: Record<Exclude<Domain, "consistency">, number>;
  total: number;
} {
  const byDomain: Record<Exclude<Domain, "consistency">, number> = {
    physical: 0,
    mental: 0,
    social: 0,
    regulation: 0,
  };
  let total = 0;
  for (const h of history) {
    const def = BEHAVIOR_INDEX[h.behavior];
    if (!def) continue;
    byDomain[def.domain] += h.awardedPoints;
    total += h.awardedPoints;
  }
  return { byDomain, total };
}

/**
 * Compute the current active streak in days based on event log.
 * A "day" counts if it has at least one logged event.
 */
export function currentStreak(history: LoggedBehavior[], today: Date = new Date()): number {
  if (history.length === 0) return 0;
  const days = new Set(history.map((h) => h.loggedAt.slice(0, 10)));
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Most recent past day with any activity. Returns null if no history.
 */
export function daysSinceLastActivity(history: LoggedBehavior[], reference: Date = new Date()): number | null {
  if (history.length === 0) return null;
  const sorted = [...history].sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));
  const lastDay = new Date(sorted[0].loggedAt);
  const ms = reference.getTime() - lastDay.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export { COMEBACK_BONUS_COOLDOWN_DAYS };
