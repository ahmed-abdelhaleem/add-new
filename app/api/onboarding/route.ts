import { NextResponse } from "next/server";
import { z } from "zod";

import { updateUser } from "@/lib/db";
import { getUserId } from "@/lib/session";
import {
  firstWeekBonusUntil,
  tierForStake,
  validateAnswers,
} from "@/lib/onboarding";
import { chargeMonthlyStake } from "@/lib/payments";

const schema = z.object({
  collapsePattern: z.string().min(1),
  bestWeek: z.string().min(1),
  energyWindow: z.string().min(1),
  aspiration: z.string().min(1),
  involvePartner: z.enum(["yes", "no"]),
  stakeSEK: z.number().int().min(100).max(50000),
  charity: z.string().min(1),
  name: z.string().min(1).max(60).optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const err = validateAnswers(parsed.data);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const tier = tierForStake(parsed.data.stakeSEK);
  const now = new Date();

  updateUser(userId, {
    name: parsed.data.name,
    tier,
    stake_sek: parsed.data.stakeSEK,
    charity: parsed.data.charity,
    onboarded_at: now.toISOString(),
    onboarding_answers: parsed.data,
    first_week_bonus_until: firstWeekBonusUntil(now).toISOString(),
  });

  // PRD §9 step 5: no stake charged for the first 7 days. Schedule the
  // first charge for day 7 via a stub payment record.
  // TODO(integration:cron): replace with a Vercel Cron / Inngest schedule
  // that calls chargeMonthlyStake on the 1st of each month.
  await chargeMonthlyStake({
    userId,
    amountSEK: 0, // first-week comp
    provider: "stripe",
  });

  return NextResponse.json({ ok: true, tier });
}
