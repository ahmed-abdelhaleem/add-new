import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { BEHAVIOR_INDEX } from "@/lib/economy";
import { ensureMonthlyState, getMealPlanForDate, insertBehavior, insertMealPlan, insertShoppingList, listPantry, recordEarn } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { MEAL_OPTION_INDEX, buildShoppingList, suggestOptions } from "@/lib/nourish";
import { monthKey } from "@/lib/time";
import type { EnergyForecast } from "@/lib/types";

const schema = z.object({
  date: z.string(),
  energy: z.enum(["low", "medium", "high"]),
  breakfastId: z.string(),
  lunchId: z.string(),
  dinnerId: z.string(),
});

export async function GET(req: Request) {
  const userId = await getUserId();
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const energy = (url.searchParams.get("energy") as EnergyForecast | null) ?? "medium";
  const plan = getMealPlanForDate(userId, date);
  return NextResponse.json({
    plan: plan ?? null,
    options: {
      breakfast: suggestOptions("breakfast", energy),
      lunch: suggestOptions("lunch", energy),
      dinner: suggestOptions("dinner", energy),
    },
    pantry: listPantry(userId),
  });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // Ensure each meal id is valid.
  for (const id of [parsed.data.breakfastId, parsed.data.lunchId, parsed.data.dinnerId]) {
    if (!MEAL_OPTION_INDEX[id]) {
      return NextResponse.json({ error: `Unknown meal id: ${id}` }, { status: 400 });
    }
  }
  const planId = randomUUID();
  const now = new Date();
  insertMealPlan({
    id: planId,
    userId: userId,
    date: parsed.data.date,
    energyForecast: parsed.data.energy,
    breakfastId: parsed.data.breakfastId,
    lunchId: parsed.data.lunchId,
    dinnerId: parsed.data.dinnerId,
    createdAt: now.toISOString(),
  });

  // Auto-generate the shopping list.
  const pantryNames = listPantry(userId).map((p) => p.name);
  const items = buildShoppingList({
    options: [
      MEAL_OPTION_INDEX[parsed.data.breakfastId],
      MEAL_OPTION_INDEX[parsed.data.lunchId],
      MEAL_OPTION_INDEX[parsed.data.dinnerId],
    ],
    pantry: pantryNames,
  });
  const shopId = randomUUID();
  insertShoppingList({
    id: shopId,
    userId: userId,
    planId,
    items,
    createdAt: now.toISOString(),
    sentTo: null,
    sentAt: null,
  });

  // Award meal_plan_created.
  const def = BEHAVIOR_INDEX.meal_plan_created;
  const mk = monthKey(now);
  ensureMonthlyState(userId, mk);
  insertBehavior({
    id: randomUUID(),
    userId: userId,
    behavior: "meal_plan_created",
    rawPoints: def.points,
    awardedPoints: def.points,
    multiplier: 1,
    loggedAt: now.toISOString(),
    note: `Plan for ${parsed.data.date}`,
  });
  recordEarn(userId, mk, def.points);

  return NextResponse.json({ planId, shopId, awarded: def.points });
}
