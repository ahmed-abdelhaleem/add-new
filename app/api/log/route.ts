import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { BEHAVIOR_INDEX } from "@/lib/economy";
import {
  DEMO_USER_ID,
  ensureMonthlyState,
  insertBehavior,
  isComebackOnCooldown,
  listBehaviorsAll,
  listBehaviorsForMonth,
  markComebackUsed,
  recordEarn,
} from "@/lib/db";
import { awardForBehavior, daysSinceLastActivity } from "@/lib/points";
import { monthKey } from "@/lib/time";
import type { LoggedBehavior } from "@/lib/types";

const schema = z.object({
  behavior: z.string(),
  note: z.string().max(280).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const def = BEHAVIOR_INDEX[parsed.data.behavior as keyof typeof BEHAVIOR_INDEX];
  if (!def) {
    return NextResponse.json({ error: "Unknown behavior" }, { status: 400 });
  }

  const userId = DEMO_USER_ID;
  const now = new Date();
  const mk = monthKey(now);
  ensureMonthlyState(userId, mk);

  const monthHistory = listBehaviorsForMonth(userId, mk);
  const allHistory = listBehaviorsAll(userId);
  const gap = daysSinceLastActivity(allHistory, now) ?? 0;
  const cooldown = isComebackOnCooldown(userId, mk, now);

  const result = awardForBehavior({
    behavior: def.key,
    loggedAt: now,
    monthHistory,
    daysSinceLastActivity: gap,
    comebackOnCooldown: cooldown,
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
