import { ensureMonthlyState, getMonthlyState, listWishlist } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { sekToPoints } from "@/lib/points";
import { monthKey } from "@/lib/time";

import WishlistClient from "./WishlistClient";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const userId = await getUserId();
  const mk = monthKey();
  ensureMonthlyState(userId, mk);
  const state = getMonthlyState(userId, mk)!;
  const available = state.pointsEarned - state.pointsSpent;
  const items = listWishlist(userId).map((i) => ({
    ...i,
    pointCost: i.costSEK > 0 ? sekToPoints(i.costSEK, i.rate as "A" | "B") : 0,
  }));
  return <WishlistClient initialItems={items} available={available} />;
}
