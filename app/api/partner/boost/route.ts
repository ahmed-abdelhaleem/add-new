import { NextResponse } from "next/server";
import { z } from "zod";

import { getPartner, insertPartnerBoost, recordBonus } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { PARTNER_BOOST_POINTS } from "@/lib/accountability";
import { monthKey } from "@/lib/time";

const schema = z.object({ message: z.string().max(280).optional() });

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const partner = getPartner(userId);
  if (!partner) return NextResponse.json({ error: "No partner" }, { status: 404 });

  insertPartnerBoost({
    partnerId: partner.id,
    userId: userId,
    awardedPoints: PARTNER_BOOST_POINTS,
    message: parsed.data.message,
  });
  recordBonus(userId, monthKey(), PARTNER_BOOST_POINTS);
  return NextResponse.json({ ok: true, awarded: PARTNER_BOOST_POINTS });
}
