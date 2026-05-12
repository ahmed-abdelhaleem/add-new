import { BEHAVIOR_INDEX } from "./economy";
import type {
  LoggedBehavior,
  ReadinessPhase,
  ReadinessScore,
  RedirectOption,
  TriggerLog,
} from "./types";

/**
 * PRD §5 Feature 10 — Foundation Mode.
 *
 * The 6-month readiness protocol. Activated voluntarily, +500 SEK
 * stake surcharge, trigger log + redirect menu, weekly readiness
 * score across 4 pillars.
 */

export const FOUNDATION_DEFAULT_DAYS = 180;

// PRD §10.2 — redirect menu. Time-of-day + energy aware.
export const REDIRECT_MENU: RedirectOption[] = [
  // Evening, low energy
  { key: "watched_saved", label: "Watch something from your saved list", bonusPoints: 0, timeWindow: "evening", energy: "low" },
  { key: "evening_dump", label: "Brain dump what's actually on your mind", bonusPoints: 500, timeWindow: "evening", energy: "low" },
  { key: "message_one", label: "Message one person — anyone", bonusPoints: 800, timeWindow: "evening", energy: "low" },
  // Evening, mid energy
  { key: "evening_walk", label: "20 min walk before bed", bonusPoints: 800, timeWindow: "evening", energy: "mid" },
  { key: "evening_cook", label: "Cook something simple", bonusPoints: 600, timeWindow: "evening", energy: "mid" },
  { key: "evening_read", label: "20 min reading — book only", bonusPoints: 900, timeWindow: "evening", energy: "mid" },
  // Late night, high restlessness
  { key: "plan_trip", label: "Plan the next trip — open the Vault", bonusPoints: 0, timeWindow: "late_night", energy: "high" },
  { key: "pushups", label: "20 push-ups right now", bonusPoints: 1000, timeWindow: "late_night", energy: "high" },
  { key: "queue_it", label: "Queue it — revisit in the morning", bonusPoints: 0, timeWindow: "late_night", energy: "any" },
  // Day
  { key: "office", label: "Head into the office for the afternoon", bonusPoints: 1500, timeWindow: "afternoon", energy: "mid" },
  { key: "gym_now", label: "Gym now — short session counts", bonusPoints: 2500, timeWindow: "any", energy: "high" },
  { key: "swedish_20", label: "20 min Swedish — Duolingo", bonusPoints: 1800, timeWindow: "any", energy: "mid" },
];

export function pickRedirectMenu(now: Date = new Date(), energy: "low" | "mid" | "high" = "mid"): RedirectOption[] {
  const h = now.getHours();
  const window: RedirectOption["timeWindow"] =
    h < 5 ? "late_night"
      : h < 12 ? "morning"
      : h < 18 ? "afternoon"
      : h < 23 ? "evening"
      : "late_night";

  const matches = REDIRECT_MENU.filter(
    (r) => (r.timeWindow === window || r.timeWindow === "any") && (r.energy === energy || r.energy === "any")
  );
  // Always 3 options. If not enough matches, top up from any-window.
  if (matches.length >= 3) return matches.slice(0, 3);
  const filler = REDIRECT_MENU.filter((r) => !matches.includes(r));
  return [...matches, ...filler].slice(0, 3);
}

// PRD §10.3 — Readiness Score. 4 pillars at 25% each, weekly.
export function readinessPhase(total: number): ReadinessPhase {
  if (total <= 30) return "Foundation";
  if (total <= 55) return "Building";
  if (total <= 75) return "Momentum";
  return "Ready";
}

interface ReadinessInputs {
  weekKey: string;
  history: LoggedBehavior[];
  triggerLogs: TriggerLog[];
  // Number of medication days in the week
  medicationDays: number;
  // Number of therapy/assessment attendance markers (manual flag — counted as office_workday in MVP)
  therapyAttendance: number;
}

export function computeReadinessScore(input: ReadinessInputs): ReadinessScore {
  const week = input.weekKey;
  const inWeek = (b: LoggedBehavior) =>
    weekKeyFor(new Date(b.loggedAt)) === week;

  const weekBehaviors = input.history.filter(inWeek);

  const sumDomain = (domain: string) =>
    weekBehaviors
      .filter((b) => BEHAVIOR_INDEX[b.behavior]?.domain === domain)
      .reduce((s, b) => s + b.awardedPoints, 0);

  // Physical: 0–100 based on points hitting 8,000 in a week (gym × ~3).
  const physical = Math.min(100, (sumDomain("physical") / 8000) * 100);

  // Mental: brain dumps + reading + study + meds.
  const mentalPoints = sumDomain("mental");
  const mentalScore = Math.min(100, (mentalPoints / 6000) * 100);
  const medBoost = Math.min(20, input.medicationDays * 3); // up to +20
  const therapyBoost = Math.min(20, input.therapyAttendance * 10);
  const mental = Math.min(100, mentalScore + medBoost + therapyBoost);

  // Social: outings + group + connect.
  const social = Math.min(100, (sumDomain("social") / 6000) * 100);

  // Self-regulation: regulation domain + trigger-success rate.
  const regulationPoints = sumDomain("regulation");
  const triggersThisWeek = input.triggerLogs.filter(
    (t) => weekKeyFor(new Date(t.loggedAt)) === week
  );
  const triggerSuccess =
    triggersThisWeek.length === 0
      ? 0
      : triggersThisWeek.filter((t) => t.redirectCompletedAt).length / triggersThisWeek.length;
  const regulationBase = Math.min(80, (regulationPoints / 4000) * 80);
  const regulation = Math.min(100, regulationBase + triggerSuccess * 20);

  const total = (physical + mental + social + regulation) / 4;

  return {
    weekKey: week,
    physical: round(physical),
    mental: round(mental),
    social: round(social),
    regulation: round(regulation),
    total: round(total),
    phase: readinessPhase(total),
    computedAt: new Date().toISOString(),
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

export function weekKeyFor(d: Date): string {
  // ISO-ish week key: YYYY-WW (Monday-based)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// PRD §10.6 — language constraints for Foundation Mode messages.
export const FOUNDATION_BANNED_WORDS = ["unhealthy", "inappropriate", "bad", "failure", "wrong"];

// PRD §10.1 — 72-hour reflection window required before deactivation.
export const DEACTIVATION_REFLECTION_HOURS = 72;

export function deactivationReady(state: { deactivationStartedAt: string | null }): boolean {
  if (!state.deactivationStartedAt) return false;
  const started = new Date(state.deactivationStartedAt).getTime();
  const hours = (Date.now() - started) / (1000 * 60 * 60);
  return hours >= DEACTIVATION_REFLECTION_HOURS;
}

export function deactivationHoursRemaining(state: { deactivationStartedAt: string | null }): number {
  if (!state.deactivationStartedAt) return DEACTIVATION_REFLECTION_HOURS;
  const started = new Date(state.deactivationStartedAt).getTime();
  const hours = (Date.now() - started) / (1000 * 60 * 60);
  return Math.max(0, DEACTIVATION_REFLECTION_HOURS - hours);
}
