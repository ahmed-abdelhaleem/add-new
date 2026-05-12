import { randomUUID } from "node:crypto";

import {
  countNotificationsInWindow,
  insertNotification,
  lastNotificationAt,
} from "./db";
import type {
  NotificationPrefs,
  NotificationRecord,
  NotificationType,
} from "./types";

/**
 * PRD §7 — Notification System.
 *
 * Rules:
 *   - Max 2/day, max 8/week
 *   - 3-hour minimum gap between notifications
 *   - Quiet hours 21:30 – 08:00
 *   - 0 notifications on days the user opened the app 2+ times
 *   - Type 4 (Rescue): max 2/week
 *   - Type 3 (Surprise): max 1/day, never two in same day
 *
 * TODO(integration:push): Web Push API + VAPID keys for the PWA;
 * native push via APNs/FCM for the React Native shell. The store +
 * dispatch in this file is provider-agnostic — the wire goes here.
 */

export const PERMANENTLY_BANNED_PHRASES = [
  "don't forget",
  "dont forget",
  "you haven't",
  "it's been",
  "keep up the great work",
  "your streak is in danger",
  "great job",
];

export const MAX_PER_DAY = 2;
export const MAX_PER_WEEK = 8;
export const MIN_GAP_MIN = 180;
export const QUIET_HOURS_START_HOUR = 21; // 21:30
export const QUIET_HOURS_START_MIN = 30;
export const QUIET_HOURS_END_HOUR = 8;
export const MAX_RESCUE_PER_WEEK = 2;

export function passesCopyTests(title: string, body: string): { ok: true } | { ok: false; reason: string } {
  if (!body || body.length > 160) return { ok: false, reason: "Body must be 1–160 chars" };
  if (!title || title.length > 60) return { ok: false, reason: "Title must be 1–60 chars" };
  if (title.includes("!") || body.includes("!")) {
    return { ok: false, reason: "Exclamation marks are banned (PRD §7.6)" };
  }
  const combined = (title + " " + body).toLowerCase();
  for (const p of PERMANENTLY_BANNED_PHRASES) {
    if (combined.includes(p)) return { ok: false, reason: `Banned phrase: "${p}"` };
  }
  return { ok: true };
}

export function inQuietHours(d: Date = new Date()): boolean {
  const h = d.getHours();
  const m = d.getMinutes();
  if (h >= QUIET_HOURS_START_HOUR && (h > QUIET_HOURS_START_HOUR || m >= QUIET_HOURS_START_MIN)) return true;
  if (h < QUIET_HOURS_END_HOUR) return true;
  return false;
}

export interface SendIntent {
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  // Times the user has already opened the app today; if >=2, suppress all.
  opensToday?: number;
}

export interface SendResult {
  sent: boolean;
  reason?: string;
  record?: NotificationRecord;
}

export function dispatch(userId: string, intent: SendIntent, prefs: NotificationPrefs, now: Date = new Date()): SendResult {
  const copy = passesCopyTests(intent.title, intent.body);
  if (!copy.ok) return { sent: false, reason: copy.reason };

  // Pref check
  if (intent.type === "anchor" && !prefs.anchorEnabled) return { sent: false, reason: "anchor disabled" };
  if (intent.type === "moment" && !prefs.momentsEnabled) return { sent: false, reason: "moments disabled" };
  if (intent.type === "surprise" && !prefs.surprisesEnabled) return { sent: false, reason: "surprises disabled" };
  if (intent.type === "rescue" && !prefs.rescueEnabled) return { sent: false, reason: "rescue disabled" };

  // Quiet hours
  if (inQuietHours(now)) return { sent: false, reason: "quiet hours" };

  // User active twice today → suppress all (PRD §7.4)
  if ((intent.opensToday ?? 0) >= 2) return { sent: false, reason: "user already engaged 2+ today" };

  const last = lastNotificationAt(userId);
  if (last) {
    const minSinceLast = (now.getTime() - new Date(last).getTime()) / (60 * 1000);
    if (minSinceLast < MIN_GAP_MIN) return { sent: false, reason: `< ${MIN_GAP_MIN} min since last` };
  }

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // Aggregate today + week — count across ALL types for the global cap.
  const dayCount = (["anchor", "moment", "surprise", "rescue"] as NotificationType[])
    .reduce((s, t) => s + countNotificationsInWindow(userId, t, dayStart.toISOString()), 0);
  if (dayCount >= MAX_PER_DAY) return { sent: false, reason: "daily cap reached" };
  const weekCount = (["anchor", "moment", "surprise", "rescue"] as NotificationType[])
    .reduce((s, t) => s + countNotificationsInWindow(userId, t, weekStart.toISOString()), 0);
  if (weekCount >= MAX_PER_WEEK) return { sent: false, reason: "weekly cap reached" };

  // Type-specific limits
  if (intent.type === "rescue") {
    const rescueWeek = countNotificationsInWindow(userId, "rescue", weekStart.toISOString());
    if (rescueWeek >= MAX_RESCUE_PER_WEEK) return { sent: false, reason: "rescue cap reached" };
  }
  if (intent.type === "anchor") {
    const anchorToday = countNotificationsInWindow(userId, "anchor", dayStart.toISOString());
    if (anchorToday >= 1) return { sent: false, reason: "anchor already sent today" };
  }
  if (intent.type === "surprise") {
    const surpriseToday = countNotificationsInWindow(userId, "surprise", dayStart.toISOString());
    if (surpriseToday >= 1) return { sent: false, reason: "one surprise per day" };
  }

  const record: NotificationRecord = {
    id: randomUUID(),
    type: intent.type,
    title: intent.title,
    body: intent.body,
    sentAt: now.toISOString(),
    openedAt: null,
    dismissedAt: null,
    payload: intent.payload ?? null,
  };
  insertNotification(userId, record);
  return { sent: true, record };
}

// ── Copy generators ────────────────────────────────────────────────

export function anchorCopy(opts: {
  streak: number;
  priorityCount: number;
  hasDoubleHour?: boolean;
  doubleHourEndsAt?: Date;
}): { title: string; body: string } {
  if (opts.hasDoubleHour && opts.doubleHourEndsAt) {
    const hh = opts.doubleHourEndsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      title: `Double Points in ${minutesUntil(opts.doubleHourEndsAt)} min`,
      body: `Ends at ${hh}. Worth opening.`,
    };
  }
  if (opts.streak >= 7) {
    return {
      title: `Day ${opts.streak}`,
      body: `Flame's still lit. ${opts.priorityCount} actions ready.`,
    };
  }
  return {
    title: `${opts.priorityCount} actions ready`,
    body: `Tap one to start.`,
  };
}

export function momentCopy(kind:
  | "streak_7"
  | "streak_14"
  | "stake_50"
  | "stake_100"
  | "first_plan"
  | "comeback"
  | "level_up"
  | "foundation_30",
opts: { value?: number; level?: number; readiness?: number } = {}): { title: string; body: string } {
  switch (kind) {
    case "streak_7":
      return { title: "One week.", body: "That's further than most get. Keep it." };
    case "streak_14":
      return { title: "14 days straight.", body: "Two weeks. The data says you're building something real." };
    case "stake_50":
      return { title: "Halfway there", body: `You've recovered ${opts.value ?? 0} kr of your stake this month.` };
    case "stake_100":
      return { title: "Stake recovered.", body: "Everything from here is bonus." };
    case "first_plan":
      return { title: "First plan done.", body: `Shopping list is ready. ${opts.value ?? "Some"} items.` };
    case "comeback":
      return { title: "3× points right now.", body: "You've been away — this is the re-entry bonus." };
    case "level_up":
      return { title: `Level ${opts.level ?? "up"} unlocked.`, body: "New reward categories in the Vault." };
    case "foundation_30":
      return {
        title: "One month in Foundation Mode.",
        body: `Readiness score: ${opts.readiness ?? "—"}. Here's what changed.`,
      };
  }
}

export function surpriseCopy(kind: "double_hour" | "scratch" | "challenge_drop" | "deal_expires", opts: { endsAt?: Date; deal?: string } = {}): { title: string; body: string } {
  switch (kind) {
    case "double_hour":
      return {
        title: "Double Points — 60 minutes",
        body: `Anything you log right now earns double.${opts.endsAt ? ` Ends at ${shortTime(opts.endsAt)}.` : ""}`,
      };
    case "scratch":
      return { title: "Your weekly bonus is ready.", body: "Scratch it open — could be anything." };
    case "challenge_drop":
      return {
        title: "Challenge just dropped.",
        body: "Leave the apartment before 7pm today: +3,500 pts. Expires tonight.",
      };
    case "deal_expires":
      return {
        title: `${opts.deal ?? "ICA deal"} expires tomorrow.`,
        body: "Your deal hasn't been used. Meal plan it tonight?",
      };
  }
}

export function rescueCopy(kind: "still_here" | "comeback_active" | "new_challenge"): { title: string; body: string } {
  switch (kind) {
    case "still_here":
      return { title: "Still here.", body: "3× points on anything you log today. No catch." };
    case "comeback_active":
      return {
        title: "Comeback bonus active.",
        body: "Your streak is paused, not gone. One action restarts it.",
      };
    case "new_challenge":
      return { title: "New challenge this week.", body: "Something worth coming back for." };
  }
}

function minutesUntil(d: Date): number {
  return Math.max(0, Math.round((d.getTime() - Date.now()) / 60000));
}

function shortTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Near-Miss helper (PRD §6.3) — when within 10% of a threshold,
// format the number as "X pts to Y" rather than the raw counter.
export function nearMissLabel(opts: {
  current: number;
  target: number;
  unit: string;
  label: string;
}): { label: string; isNear: boolean } {
  const remaining = opts.target - opts.current;
  if (remaining <= 0 || remaining / opts.target > 0.1) {
    return { label: `${opts.current.toLocaleString()} ${opts.unit}`, isNear: false };
  }
  return { label: `${remaining.toLocaleString()} ${opts.unit} to ${opts.label}`, isNear: true };
}
