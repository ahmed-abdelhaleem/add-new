import { DEMO_USER_ID, ensureMonthlyState, getMonthlyState, listWishlist } from "@/lib/db";
import { sekToPoints } from "@/lib/points";
import { monthKey } from "@/lib/time";

import WishlistClient from "./WishlistClient";

export const dynamic = "force-dynamic";

export default function WishlistPage() {
  const mk = monthKey();
  ensureMonthlyState(DEMO_USER_ID, mk);
  const state = getMonthlyState(DEMO_USER_ID, mk)!;
  const available = state.pointsEarned - state.pointsSpent;
  const items = listWishlist(DEMO_USER_ID).map((i) => ({
    ...i,
    pointCost: i.costSEK > 0 ? sekToPoints(i.costSEK, i.rate as "A" | "B") : 0,
  }));
  return <WishlistClient initialItems={items} available={available} />;
}
