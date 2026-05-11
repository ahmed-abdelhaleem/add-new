import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { categorizeBrainDump } from "@/lib/ace";
import {
  DEMO_USER_ID,
  ensureMonthlyState,
  insertBehavior,
  insertBrainDump,
  isComebackOnCooldown,
  listBehaviorsAll,
  listBehaviorsForMonth,
  markComebackUsed,
  recordEarn,
  updateBrainDumpCategorization,
} from "@/lib/db";
import { awardForBehavior, daysSinceLastActivity } from "@/lib/points";
import { monthKey } from "@/lib/time";
import type { BrainDump, LoggedBehavior } from "@/lib/types";

const schema = z.object({
  text: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = DEMO_USER_ID;
  const now = new Date();
  const mk = monthKey(now);
  ensureMonthlyState(userId, mk);

  const id = randomUUID();
  const dump: BrainDump = {
    id,
    text: parsed.data.text,
    capturedAt: now.toISOString(),
  };
  insertBrainDump(userId, dump);

  const categorized = await categorizeBrainDump(parsed.data.text);
  updateBrainDumpCategorization(id, categorized);

  // Award the brain_dump behavior, subject to its daily cap of 1.
  const monthHistory = listBehaviorsForMonth(userId, mk);
  const allHistory = listBehaviorsAll(userId);
  const gap = daysSinceLastActivity(allHistory, now) ?? 0;
  const cooldown = isComebackOnCooldown(userId, mk, now);
  const award = awardForBehavior({
    behavior: "brain_dump",
    loggedAt: now,
    monthHistory,
    daysSinceLastActivity: gap,
    comebackOnCooldown: cooldown,
  });

  let logged: LoggedBehavior | null = null;
  if (award.awardedPoints > 0) {
    logged = {
      id: randomUUID(),
      userId,
      behavior: "brain_dump",
      rawPoints: award.rawPoints,
      awardedPoints: award.awardedPoints,
      multiplier: award.multiplier,
      loggedAt: now.toISOString(),
      note: "Brain dump",
    };
    insertBehavior(logged);
    recordEarn(userId, mk, award.awardedPoints);
    if (award.comebackTriggered) markComebackUsed(userId, mk, now);
  }

  return NextResponse.json({ dump: { ...dump, categorized }, award, logged });
}
