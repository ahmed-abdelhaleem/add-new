import { NextResponse } from "next/server";
import { z } from "zod";

import { VAULT_INDEX } from "@/lib/catalog";
import {
  DEMO_USER_ID,
  ensureMonthlyState,
  getMonthlyState,
  insertRedemption,
  recordSpend,
} from "@/lib/db";
import { sekToPoints } from "@/lib/points";
import { monthKey } from "@/lib/time";

const schema = z.object({ itemId: z.string() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const item = VAULT_INDEX[parsed.data.itemId];
  if (!item) return NextResponse.json({ error: "Unknown item" }, { status: 404 });

  // Category C requires 72-hour cooling + a written intention reviewed by ACE.
  // The prototype refuses the immediate redemption rather than silently
  // ignoring the constraint.
  if (item.rate === "C") {
    return NextResponse.json(
      { error: "Category C items require a 72-hour cooling window. Talk to ACE first." },
      { status: 409 }
    );
  }

  const userId = DEMO_USER_ID;
  const mk = monthKey();
  ensureMonthlyState(userId, mk);
  const state = getMonthlyState(userId, mk)!;
  const available = state.pointsEarned - state.pointsSpent;

  const cost = sekToPoints(item.costSEK, item.rate as "A" | "B");
  if (cost > available) {
    return NextResponse.json(
      { error: "Not enough points", cost, available },
      { status: 402 }
    );
  }

  recordSpend(userId, mk, cost);
  const id = insertRedemption({
    userId,
    itemId: item.id,
    pointsSpent: cost,
    sekValue: item.costSEK,
    rate: item.rate as "A" | "B",
  });

  return NextResponse.json({ id, pointsSpent: cost, remaining: available - cost });
}
