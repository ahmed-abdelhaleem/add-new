import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_USER_ID, listBehaviorsForMonth, upsertDailyPlan } from "@/lib/db";
import { pickPriorities } from "@/lib/priorities";
import { dayKey, monthKey } from "@/lib/time";

const schema = z.object({
  energy: z.number().int().min(1).max(5),
  commitment: z.string().min(1).max(120),
  distractionBlock: z
    .object({ start: z.string(), end: z.string() })
    .optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = DEMO_USER_ID;
  const now = new Date();
  const monthHistory = listBehaviorsForMonth(userId, monthKey(now));

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
  return NextResponse.json({ plan });
}
