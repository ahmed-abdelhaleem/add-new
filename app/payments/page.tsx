import { ensureMonthlyState, getMonthlyState, getUser, listCharityDisbursements, listPayments } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { pointsToSEK } from "@/lib/points";
import { totalSEKThisYear } from "@/lib/payments";
import { monthKey } from "@/lib/time";

import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const userId = await getUserId();
  const user = getUser(userId)!;
  const mk = monthKey();
  ensureMonthlyState(userId, mk);
  const state = getMonthlyState(userId, mk)!;
  const recovered = pointsToSEK(state.pointsEarned);
  const unrecovered = Math.max(0, user.stake_sek - recovered);
  const yearly = totalSEKThisYear(userId);

  return (
    <PaymentsClient
      payments={listPayments(userId)}
      disbursements={listCharityDisbursements(userId)}
      yearly={yearly}
      stakeSEK={user.stake_sek}
      recoveredSEK={Math.round(recovered)}
      unrecoveredSEK={Math.round(unrecovered)}
      charity={user.charity}
    />
  );
}
