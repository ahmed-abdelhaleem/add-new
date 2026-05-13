import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { BEHAVIOR_INDEX } from "@/lib/economy";
import { ensureMonthlyState, insertBehavior, listMealLogs, recordEarn, upsertMealLog } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { mealStreak, mealStreakBonusDue } from "@/lib/nourish";
import { dayKey, monthKey } from "@/lib/time";

const schema = z.object({
  date: z.string().optional(),
  slot: z.enum(["breakfast", "lunch", "dinner"]),
  ateAsPlanned: z.enum(["yes", "partly", "no"]),
  deliveryOrdered: z.boolean().optional(),
});

// Morning check-in for prior-day adherence + free-form logging during the day.
// PRD §11.2: every "yes/partly/no" still earns base points; streak math depends
// only on "yes" answers crossing 2 slots / day (see lib/nourish.mealStreak).
export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const date = parsed.data.date ?? dayKey();
  upsertMealLog(userId, {
    date,
    slot: parsed.data.slot,
    ateAsPlanned:
      parsed.data.ateAsPlanned === "yes"
        ? true
        : parsed.data.ateAsPlanned === "no"
          ? false
          : null,
    deliveryOrdered: parsed.data.deliveryOrdered ?? false,
    loggedAt: new Date().toISOString(),
  });

  // Award ate_as_planned (capped daily so multiple slot logs don't multi-award).
  const def = BEHAVIOR_INDEX.ate_as_planned;
  const mk = monthKey();
  ensureMonthlyState(userId, mk);
  insertBehavior({
    id: randomUUID(),
    userId: userId,
    behavior: "ate_as_planned",
    rawPoints: def.points,
    awardedPoints: def.points,
    multiplier: 1,
    loggedAt: new Date().toISOString(),
    note: `${parsed.data.slot}: ${parsed.data.ateAsPlanned}`,
  });
  recordEarn(userId, mk, def.points);

  // Check if a streak milestone fires.
  const logs = listMealLogs(userId);
  const streak = mealStreak(logs);
  const milestone = mealStreakBonusDue(streak);
  let bonus = 0;
  if (milestone) {
    const mdef = BEHAVIOR_INDEX[milestone];
    insertBehavior({
      id: randomUUID(),
      userId: userId,
      behavior: milestone,
      rawPoints: mdef.points,
      awardedPoints: mdef.points,
      multiplier: 1,
      loggedAt: new Date().toISOString(),
      note: `Meal streak ${streak}-day milestone`,
    });
    recordEarn(userId, mk, mdef.points);
    bonus = mdef.points;
  }

  return NextResponse.json({ awarded: def.points + bonus, streak });
}

export async function GET() {
  const userId = await getUserId();
  const logs = listMealLogs(userId);
  return NextResponse.json({ logs, streak: mealStreak(logs) });
}
