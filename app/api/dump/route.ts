import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { categorizeBrainDump } from "@/lib/ace";
import { ensureMonthlyState, insertActionItem, insertBehavior, insertBrainDump, insertCuriosity, insertWishlistItem, isComebackOnCooldown, listBehaviorsAll, listBehaviorsForMonth, markComebackUsed, recordEarn, updateBrainDumpCategorization } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { awardForBehavior, daysSinceLastActivity } from "@/lib/points";
import { monthKey } from "@/lib/time";
import type { BrainDump, LoggedBehavior, WishlistItem } from "@/lib/types";

const schema = z.object({
  text: z.string().min(1).max(4000),
});

const COOLING_HOURS = 24;

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
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

  // Fan out to the structured tables so the user can resolve / redeem later.
  for (const a of categorized.actionItems) insertActionItem(userId, a, "brain_dump");
  for (const c of categorized.curiosityQueue) insertCuriosity(userId, c, "brain_dump");
  for (const w of categorized.wishlist) {
    const item: WishlistItem = {
      id: randomUUID(),
      userId,
      title: w,
      category: "shopping",
      costSEK: 0, // user fills in later
      rate: "B",
      addedAt: now.toISOString(),
      cooledUntil: new Date(now.getTime() + COOLING_HOURS * 60 * 60 * 1000).toISOString(),
      source: "brain_dump",
    };
    insertWishlistItem(item);
  }

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
