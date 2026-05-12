import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { BEHAVIOR_INDEX } from "@/lib/economy";
import {
  DEMO_USER_ID,
  ensureMonthlyState,
  getShoppingListForPlan,
  insertBehavior,
  markShoppingListSent,
  recordEarn,
  updateShoppingListItems,
} from "@/lib/db";
import { monthKey } from "@/lib/time";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const planId = url.searchParams.get("planId");
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });
  const list = getShoppingListForPlan(planId);
  return NextResponse.json({ list });
}

const checkSchema = z.object({
  planId: z.string(),
  itemName: z.string(),
  checked: z.boolean(),
});

export async function PATCH(req: Request) {
  const parsed = checkSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const list = getShoppingListForPlan(parsed.data.planId);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = list.items.map((i) =>
    i.name === parsed.data.itemName ? { ...i, checked: parsed.data.checked } : i
  );
  updateShoppingListItems(list.id, items);
  return NextResponse.json({ ok: true });
}

const sendSchema = z.object({
  planId: z.string(),
  provider: z.enum(["ica", "coop", "mathem"]),
});

// Mark as sent to a delivery provider — awards shopped_as_planned pts.
// TODO(integration:delivery): replace with actual cart API call per provider.
export async function POST(req: Request) {
  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const list = getShoppingListForPlan(parsed.data.planId);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  markShoppingListSent(list.id, parsed.data.provider);

  const def = BEHAVIOR_INDEX.shopped_as_planned;
  const mk = monthKey();
  ensureMonthlyState(DEMO_USER_ID, mk);
  insertBehavior({
    id: randomUUID(),
    userId: DEMO_USER_ID,
    behavior: "shopped_as_planned",
    rawPoints: def.points,
    awardedPoints: def.points,
    multiplier: 1,
    loggedAt: new Date().toISOString(),
    note: `Sent to ${parsed.data.provider}`,
  });
  recordEarn(DEMO_USER_ID, mk, def.points);
  return NextResponse.json({ awarded: def.points });
}
