import { VAULT } from "@/lib/catalog";
import { ensureMonthlyState, getMonthlyState } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { sekToPoints } from "@/lib/points";
import { monthKey } from "@/lib/time";

import VaultClient from "./VaultClient";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const userId = await getUserId();
  const mk = monthKey();
  ensureMonthlyState(userId, mk);
  const state = getMonthlyState(userId, mk)!;
  const available = state.pointsEarned - state.pointsSpent;

  const items = VAULT.map((it) => ({
    ...it,
    pointCost: sekToPoints(it.costSEK, it.rate as "A" | "B"),
  }));

  return <VaultClient items={items} available={available} />;
}
