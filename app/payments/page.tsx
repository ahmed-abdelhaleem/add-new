import {
  DEMO_USER_ID,
  ensureMonthlyState,
  getMonthlyState,
  getUser,
  listCharityDisbursements,
  listPayments,
} from "@/lib/db";
import { pointsToSEK } from "@/lib/points";
import { totalSEKThisYear } from "@/lib/payments";
import { monthKey } from "@/lib/time";

import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default function PaymentsPage() {
  const user = getUser(DEMO_USER_ID)!;
  const mk = monthKey();
  ensureMonthlyState(DEMO_USER_ID, mk);
  const state = getMonthlyState(DEMO_USER_ID, mk)!;
  const recovered = pointsToSEK(state.pointsEarned);
  const unrecovered = Math.max(0, user.stake_sek - recovered);
  const yearly = totalSEKThisYear(DEMO_USER_ID);

  return (
    <PaymentsClient
      payments={listPayments(DEMO_USER_ID)}
      disbursements={listCharityDisbursements(DEMO_USER_ID)}
      yearly={yearly}
      stakeSEK={user.stake_sek}
      recoveredSEK={Math.round(recovered)}
      unrecoveredSEK={Math.round(unrecovered)}
      charity={user.charity}
    />
  );
}
