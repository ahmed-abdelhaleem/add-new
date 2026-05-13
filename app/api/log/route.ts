import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { BEHAVIOR_INDEX } from "@/lib/economy";
import {
  ensureMonthlyState,
  getBehaviorOverride,
  getCustomBehavior,
  getUser,
  insertBehavior,
  isComebackOnCooldown,
  listActiveBonusEvents,
  listActiveTrackEnrollments,
  listBehaviorsAll,
  listBehaviorsForMonth,
  markComebackUsed,
  recordEarn,
} from "@/lib/db";
import { getUserId } from "@/lib/session";
import { activeEventMultiplier } from "@/lib/events";
import { awardForBehavior, daysSinceLastActivity } from "@/lib/points";
import { FIRST_WEEK_MULTIPLIER, isInFirstWeek } from "@/lib/onboarding";
import { TRACK_INDEX } from "@/lib/tracks";
import { monthKey } from "@/lib/time";
import type { LoggedBehavior } from "@/lib/types";

const schema = z.object({
  behavior: z.string(),
  note: z.string().max(280).optional(),
  // Client-side confirmation — server doesn't currently enforce, but if a
  // future setting requires it we can check `user_settings.confirm_before_log`.
  confirmed: z.boolean().optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = getUser(userId);
  const now = new Date();
  const mk = monthKey(now);
  ensureMonthlyState(userId, mk);

  const monthHistory = listBehaviorsForMonth(userId, mk);
  const allHistory = listBehaviorsAll(userId);
  const gap = daysSinceLastActivity(allHistory, now) ?? 0;
  const cooldown = isComebackOnCooldown(userId, mk, now);

  // Custom behavior path: stored without entering the BEHAVIOR_INDEX. We
  // log it under a synthetic key prefixed with `custom:` so it doesn't
  // collide with built-ins, and use the user's per-row points/cap directly.
  if (parsed.data.behavior.startsWith("custom:")) {
    const slug = parsed.data.behavior.slice("custom:".length);
    const custom = getCustomBehavior(userId, slug);
    if (!custom) {
      return NextResponse.json({ error: "Unknown custom behavior" }, { status: 400 });
    }
    if (!custom.enabled) {
      return NextResponse.json({ error: "Behavior disabled" }, { status: 409 });
    }
    // Daily-cap check.
    if (custom.dailyCap != null) {
      const today = monthHistory.filter(
        (h) => h.behavior === (`custom:${slug}` as never) &&
          h.loggedAt.slice(0, 10) === now.toISOString().slice(0, 10)
      );
      if (today.length >= custom.dailyCap) {
        return NextResponse.json(
          {
            result: {
              rawPoints: custom.points,
              awardedPoints: 0,
              multiplier: 0,
              hitDailyCap: true,
              hitDomainCap: false,
              comebackTriggered: false,
              reasons: [`Daily cap reached for ${custom.label}`],
            },
          }
        );
      }
    }
    const row: LoggedBehavior = {
      id: randomUUID(),
      userId,
      behavior: (`custom:${slug}` as never),
      rawPoints: custom.points,
      awardedPoints: custom.points,
      multiplier: 1,
      loggedAt: now.toISOString(),
      note: parsed.data.note,
    };
    insertBehavior(row);
    if (custom.points > 0) recordEarn(userId, mk, custom.points);
    return NextResponse.json({
      result: {
        rawPoints: custom.points,
        awardedPoints: custom.points,
        multiplier: 1,
        hitDailyCap: false,
        hitDomainCap: false,
        comebackTriggered: false,
        reasons: [],
      },
      log: row,
    });
  }

  const def = BEHAVIOR_INDEX[parsed.data.behavior as keyof typeof BEHAVIOR_INDEX];
  if (!def) {
    return NextResponse.json({ error: "Unknown behavior" }, { status: 400 });
  }

  const override = getBehaviorOverride(userId, def.key);
  if (override && !override.enabled) {
    return NextResponse.json({ error: "Behavior disabled" }, { status: 409 });
  }

  // Combine all active event multipliers + active track multipliers.
  const events = listActiveBonusEvents(userId, now);
  let eventMultiplier = activeEventMultiplier(events, def.key);
  const tracks = listActiveTrackEnrollments(userId, now);
  for (const t of tracks) {
    const track = TRACK_INDEX[t.trackKey];
    if (track && track.behaviors.includes(def.key)) {
      eventMultiplier *= track.trackMultiplier;
    }
  }

  const firstWeekMultiplier = isInFirstWeek(user?.first_week_bonus_until ?? null, now) ? FIRST_WEEK_MULTIPLIER : 1;

  const result = awardForBehavior({
    behavior: def.key,
    loggedAt: now,
    monthHistory,
    daysSinceLastActivity: gap,
    comebackOnCooldown: cooldown,
    eventMultiplier,
    firstWeekMultiplier,
    override: override
      ? {
          points: override.points,
          dailyCap: override.dailyCap,
          dailyCapActive: override.dailyCapActive,
        }
      : undefined,
  });

  const row: LoggedBehavior = {
    id: randomUUID(),
    userId,
    behavior: def.key,
    rawPoints: result.rawPoints,
    awardedPoints: result.awardedPoints,
    multiplier: result.multiplier,
    loggedAt: now.toISOString(),
    note: parsed.data.note,
  };
  insertBehavior(row);
  if (result.awardedPoints > 0) recordEarn(userId, mk, result.awardedPoints);
  if (result.comebackTriggered) markComebackUsed(userId, mk, now);

  return NextResponse.json({ result, log: row });
}
