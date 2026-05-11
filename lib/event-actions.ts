import "server-only";

import { insertBonusEvent } from "./db";
import type { BonusEvent, BonusEventPayload } from "./types";

const HOUR = 60 * 60 * 1000;

/**
 * Server-only generators that persist bonus events. PRD §4.3 Domain 5
 * + Feature 2 + Feature 8.
 */

export function generateDoublePointsHour(userId: string, now: Date = new Date()): BonusEvent {
  const startsAt = new Date(now);
  startsAt.setHours(15, 0, 0, 0);
  if (startsAt.getTime() < now.getTime()) startsAt.setDate(startsAt.getDate() + 1);
  const endsAt = new Date(startsAt.getTime() + HOUR);
  const payload: BonusEventPayload = { kind: "double_hour", multiplier: 2 };
  return insertBonusEvent({
    userId,
    kind: "double_hour",
    payload,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });
}

export function generateChallengeDrop(userId: string, now: Date = new Date()): BonusEvent {
  const options: BonusEventPayload[] = [
    { kind: "challenge_drop", description: "Go outside for 20 min in the next 3 hours.", bonusPoints: 5000 },
    { kind: "challenge_drop", description: "Cook tonight instead of ordering — 2,500 bonus.", bonusPoints: 2500, behavior: "home_cooked_meal" },
    { kind: "challenge_drop", description: "20 minutes of Swedish before 21:00 — 3,000 bonus.", bonusPoints: 3000, behavior: "swedish_study" },
    { kind: "challenge_drop", description: "One brain dump before bed — 1,500 bonus.", bonusPoints: 1500, behavior: "brain_dump" },
  ];
  const payload = options[Math.floor(Math.random() * options.length)];
  return insertBonusEvent({
    userId,
    kind: "challenge_drop",
    payload,
    startsAt: now.toISOString(),
    endsAt: new Date(now.getTime() + 3 * HOUR).toISOString(),
  });
}

export function generateRescueWeek(userId: string, now: Date = new Date()): BonusEvent {
  const payload: BonusEventPayload = { kind: "rescue_week", multiplier: 1.5, reduceTo: 3 };
  return insertBonusEvent({
    userId,
    kind: "rescue_week",
    payload,
    startsAt: now.toISOString(),
    endsAt: new Date(now.getTime() + 7 * 24 * HOUR).toISOString(),
  });
}
