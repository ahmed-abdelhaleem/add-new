import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureMonthlyState, getMonthlyState, getUser, listCharityDisbursements, listPayments } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { pointsToSEK } from "@/lib/points";
import { chargeMonthlyStake, disburseToCharity, totalSEKThisYear } from "@/lib/payments";
import { monthKey } from "@/lib/time";

export async function GET() {
  const userId = await getUserId();
  const yearly = totalSEKThisYear(userId);
  return NextResponse.json({
    payments: listPayments(userId),
    disbursements: listCharityDisbursements(userId),
    yearly,
  });
}

const schema = z.object({
  action: z.enum(["charge", "disburse"]),
  provider: z.enum(["swish", "stripe"]).optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = getUser(userId)!;
  const mk = monthKey();
  ensureMonthlyState(userId, mk);

  if (parsed.data.action === "charge") {
    const p = await chargeMonthlyStake({
      userId: userId,
      amountSEK: user.stake_sek,
      provider: parsed.data.provider ?? "swish",
    });
    return NextResponse.json({ payment: p });
  }

  // Disbursement: calculates the unrecovered portion and ships it to charity.
  const state = getMonthlyState(userId, mk)!;
  const recovered = pointsToSEK(state.pointsEarned);
  const unrecovered = Math.max(0, user.stake_sek - recovered);
  await disburseToCharity({
    userId: userId,
    monthKey: mk,
    amountSEK: unrecovered,
    charity: user.charity,
  });
  return NextResponse.json({ ok: true, amount: unrecovered, charity: user.charity });
}
