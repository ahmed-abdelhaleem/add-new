import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  DEMO_USER_ID,
  ensureMonthlyState,
  insertBehavior,
  recordEarn,
  upsertEveningLog,
} from "@/lib/db";
import { dayKey, monthKey } from "@/lib/time";
import type { LoggedBehavior } from "@/lib/types";

const schema = z.object({
  didOneThing: z.enum(["yes", "partly", "no"]),
  reflection: z.string().min(1).max(280),
});

// PRD §5 Feature 3: evening log must never feel like a test.
// Showing up earns 200 pts even on a failed day.
const SHOW_UP_POINTS = 200;

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = DEMO_USER_ID;
  const now = new Date();
  const mk = monthKey(now);
  ensureMonthlyState(userId, mk);

  upsertEveningLog(userId, {
    date: dayKey(now),
    didOneThing: parsed.data.didOneThing,
    reflection: parsed.data.reflection,
    loggedAt: now.toISOString(),
  });

  // Award the show-up points as a synthetic behavior so it surfaces in history.
  const row: LoggedBehavior = {
    id: randomUUID(),
    userId,
    behavior: "daily_plan_completed",
    rawPoints: SHOW_UP_POINTS,
    awardedPoints: SHOW_UP_POINTS,
    multiplier: 1,
    loggedAt: now.toISOString(),
    note: "Evening log show-up",
  };
  insertBehavior(row);
  recordEarn(userId, mk, SHOW_UP_POINTS);

  return NextResponse.json({ ok: true, awarded: SHOW_UP_POINTS });
}
