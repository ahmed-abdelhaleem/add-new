import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  getPartner,
  insertPartnerBoost,
  recordBonus,
} from "@/lib/db";
import { PARTNER_BOOST_POINTS } from "@/lib/accountability";
import { monthKey } from "@/lib/time";

const schema = z.object({ message: z.string().max(280).optional() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const partner = getPartner(DEMO_USER_ID);
  if (!partner) return NextResponse.json({ error: "No partner" }, { status: 404 });

  insertPartnerBoost({
    partnerId: partner.id,
    userId: DEMO_USER_ID,
    awardedPoints: PARTNER_BOOST_POINTS,
    message: parsed.data.message,
  });
  recordBonus(DEMO_USER_ID, monthKey(), PARTNER_BOOST_POINTS);
  return NextResponse.json({ ok: true, awarded: PARTNER_BOOST_POINTS });
}
