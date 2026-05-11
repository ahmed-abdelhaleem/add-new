import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  getPartner,
  insertPartner,
  listBehaviorsAll,
  listPartnerBoosts,
  removePartner,
  verifyPartner,
} from "@/lib/db";
import { buildWeeklyDigest } from "@/lib/accountability";

const schema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email(),
});

export async function GET() {
  const partner = getPartner(DEMO_USER_ID);
  if (!partner) return NextResponse.json({ partner: null, boosts: [] });
  return NextResponse.json({
    partner,
    boosts: listPartnerBoosts(DEMO_USER_ID),
  });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const partner = insertPartner(DEMO_USER_ID, parsed.data.name, parsed.data.email);
  // TODO(integration:email): send tokenized verification link via Resend.
  // Auto-verify in the prototype.
  verifyPartner(partner.id);
  return NextResponse.json({ partner: { ...partner, verified: true } });
}

export async function DELETE() {
  removePartner(DEMO_USER_ID);
  return NextResponse.json({ ok: true });
}

// Preview the weekly digest the partner would receive.
export async function PATCH() {
  const partner = getPartner(DEMO_USER_ID);
  if (!partner) return NextResponse.json({ error: "No partner" }, { status: 404 });
  const history = listBehaviorsAll(DEMO_USER_ID);
  const digest = buildWeeklyDigest({
    userName: "Saeed",
    partnerName: partner.name,
    history,
  });
  return NextResponse.json({ digest });
}
