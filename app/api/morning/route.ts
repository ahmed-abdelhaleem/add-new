import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { BEHAVIOR_INDEX } from "@/lib/economy";
import { ensureMonthlyState, insertBehavior, listBehaviorsForMonth, recordEarn, upsertDailyPlan } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { pickPriorities } from "@/lib/priorities";
import { dayKey, monthKey } from "@/lib/time";

const schema = z.object({
  energy: z.number().int().min(1).max(5),
  commitment: z.string().min(1).max(120),
  distractionBlock: z
    .object({ start: z.string(), end: z.string() })
    .optional(),
  // PRD §5 Feature 3 step 4 — NourishPlan check-in: did you eat roughly as
  // planned yesterday? +400 pts for any answer.
  nourishYesterday: z.enum(["yes", "partly", "no"]).optional(),
});

const NOURISH_CHECKIN_POINTS = 400;

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const now = new Date();
  const mk = monthKey(now);
  ensureMonthlyState(userId, mk);
  const monthHistory = listBehaviorsForMonth(userId, mk);

  const priorities = pickPriorities({
    energy: parsed.data.energy as 1 | 2 | 3 | 4 | 5,
    monthHistory,
  });

  const plan = {
    date: dayKey(now),
    energy: parsed.data.energy as 1 | 2 | 3 | 4 | 5,
    commitment: parsed.data.commitment,
    priorityActions: priorities,
    distractionBlock: parsed.data.distractionBlock,
    morningLoggedAt: now.toISOString(),
  };

  upsertDailyPlan(userId, plan);

  // NourishPlan check-in bonus — fired regardless of yes/partly/no.
  let nourishAwarded = 0;
  if (parsed.data.nourishYesterday) {
    insertBehavior({
      id: randomUUID(),
      userId,
      behavior: "ate_as_planned",
      rawPoints: BEHAVIOR_INDEX.ate_as_planned.points,
      // PRD §5 Feature 3 explicitly says +400 for the morning check-in,
      // which is lower than the 500 in the regular ate_as_planned log.
      awardedPoints: NOURISH_CHECKIN_POINTS,
      multiplier: 1,
      loggedAt: now.toISOString(),
      note: `Morning check-in: ate ${parsed.data.nourishYesterday}`,
    });
    recordEarn(userId, mk, NOURISH_CHECKIN_POINTS);
    nourishAwarded = NOURISH_CHECKIN_POINTS;
  }

  return NextResponse.json({ plan, nourishAwarded });
}
