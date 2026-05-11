import { VAULT } from "@/lib/catalog";
import {
  DEMO_USER_ID,
  ensureMonthlyState,
  getMonthlyState,
} from "@/lib/db";
import { sekToPoints } from "@/lib/points";
import { monthKey } from "@/lib/time";

import VaultClient from "./VaultClient";

export const dynamic = "force-dynamic";

export default function VaultPage() {
  const mk = monthKey();
  ensureMonthlyState(DEMO_USER_ID, mk);
  const state = getMonthlyState(DEMO_USER_ID, mk)!;
  const available = state.pointsEarned - state.pointsSpent;

  const items = VAULT.map((it) => ({
    ...it,
    pointCost: sekToPoints(it.costSEK, it.rate as "A" | "B"),
  }));

  return <VaultClient items={items} available={available} />;
}
