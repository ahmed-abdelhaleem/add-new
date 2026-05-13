import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { deleteWishlistItem, insertRedemption, insertWishlistItem, listWishlist, markWishlistRedeemed, recordSpend, getMonthlyState, ensureMonthlyState } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { sekToPoints } from "@/lib/points";
import { monthKey } from "@/lib/time";
import type { WishlistItem } from "@/lib/types";

const COOLING_HOURS = 24;

const addSchema = z.object({
  title: z.string().min(1).max(140),
  url: z.string().url().optional(),
  category: z.enum(["travel", "experience", "learning", "food", "health", "delivery", "shopping"]),
  costSEK: z.number().int().min(1).max(50000),
  rate: z.enum(["A", "B", "C"]).optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const now = new Date();
  const cooledUntil = new Date(now.getTime() + COOLING_HOURS * 60 * 60 * 1000);
  // Default rate by category — anything non-Category-A becomes B.
  const rate =
    parsed.data.rate ??
    (["delivery", "shopping"].includes(parsed.data.category) ? "B" : "A");

  const item: WishlistItem = {
    id: randomUUID(),
    userId,
    title: parsed.data.title,
    url: parsed.data.url,
    category: parsed.data.category,
    costSEK: parsed.data.costSEK,
    rate,
    addedAt: now.toISOString(),
    cooledUntil: cooledUntil.toISOString(),
    source: "manual",
  };
  insertWishlistItem(item);
  return NextResponse.json({ item });
}

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ items: listWishlist(userId) });
}

const redeemSchema = z.object({ id: z.string(), action: z.enum(["redeem", "delete"]) });

export async function PATCH(req: Request) {
  const userId = await getUserId();
  const parsed = redeemSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "delete") {
    deleteWishlistItem(parsed.data.id, userId);
    return NextResponse.json({ ok: true });
  }

  const items = listWishlist(userId);
  const item = items.find((i) => i.id === parsed.data.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (new Date(item.cooledUntil).getTime() > Date.now()) {
    return NextResponse.json({ error: "Still in 24-h cooling window." }, { status: 409 });
  }
  if (item.redeemedAt) {
    return NextResponse.json({ error: "Already redeemed." }, { status: 409 });
  }
  if (item.rate === "C") {
    return NextResponse.json(
      { error: "Category C requires the 72-hour conversation with ACE." },
      { status: 409 }
    );
  }

  const mk = monthKey();
  ensureMonthlyState(userId, mk);
  const state = getMonthlyState(userId, mk)!;
  const available = state.pointsEarned - state.pointsSpent;
  const cost = sekToPoints(item.costSEK, item.rate as "A" | "B");
  if (cost > available) {
    return NextResponse.json({ error: "Not enough points", cost, available }, { status: 402 });
  }
  recordSpend(userId, mk, cost);
  insertRedemption({
    userId,
    itemId: item.id,
    pointsSpent: cost,
    sekValue: item.costSEK,
    rate: item.rate as "A" | "B",
  });
  markWishlistRedeemed(item.id);
  return NextResponse.json({ ok: true, pointsSpent: cost, remaining: available - cost });
}
