import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  ensureMonthlyState,
  getMonthlyState,
  getUser,
  listCharityDisbursements,
  listPayments,
} from "@/lib/db";
import { pointsToSEK } from "@/lib/points";
import { chargeMonthlyStake, disburseToCharity, totalSEKThisYear } from "@/lib/payments";
import { monthKey } from "@/lib/time";

export async function GET() {
  const yearly = totalSEKThisYear(DEMO_USER_ID);
  return NextResponse.json({
    payments: listPayments(DEMO_USER_ID),
    disbursements: listCharityDisbursements(DEMO_USER_ID),
    yearly,
  });
}

const schema = z.object({
  action: z.enum(["charge", "disburse"]),
  provider: z.enum(["swish", "stripe"]).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = getUser(DEMO_USER_ID)!;
  const mk = monthKey();
  ensureMonthlyState(DEMO_USER_ID, mk);

  if (parsed.data.action === "charge") {
    const p = await chargeMonthlyStake({
      userId: DEMO_USER_ID,
      amountSEK: user.stake_sek,
      provider: parsed.data.provider ?? "swish",
    });
    return NextResponse.json({ payment: p });
  }

  // Disbursement: calculates the unrecovered portion and ships it to charity.
  const state = getMonthlyState(DEMO_USER_ID, mk)!;
  const recovered = pointsToSEK(state.pointsEarned);
  const unrecovered = Math.max(0, user.stake_sek - recovered);
  await disburseToCharity({
    userId: DEMO_USER_ID,
    monthKey: mk,
    amountSEK: unrecovered,
    charity: user.charity,
  });
  return NextResponse.json({ ok: true, amount: unrecovered, charity: user.charity });
}
