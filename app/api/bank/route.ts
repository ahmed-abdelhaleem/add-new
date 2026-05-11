import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  ensureMonthlyState,
  getUser,
  insertBehavior,
  listBankTransactions,
  recordEarn,
} from "@/lib/db";
import {
  cancelTransaction,
  confirmTransaction,
  connectBank,
  disconnectBank,
  simulateIncomingTransaction,
} from "@/lib/bank";
import { BEHAVIOR_INDEX } from "@/lib/economy";
import { monthKey } from "@/lib/time";
import { randomUUID } from "node:crypto";

export async function GET() {
  const user = getUser(DEMO_USER_ID)!;
  return NextResponse.json({
    connected: user.bank_connected === 1,
    transactions: listBankTransactions(DEMO_USER_ID),
  });
}

const connectSchema = z.object({ action: z.enum(["connect", "disconnect"]) });

export async function POST(req: Request) {
  const parsed = connectSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "connect") connectBank(DEMO_USER_ID);
  else disconnectBank(DEMO_USER_ID);
  return NextResponse.json({ ok: true });
}

const simSchema = z.object({
  merchant: z.string().min(1),
  category: z.enum(["delivery", "gambling", "fast_fashion", "alcohol", "groceries", "other"]),
  amountSEK: z.number().int().min(1),
});

// Simulates a bank webhook arrival. In production this is hit by Tink / Aiia.
// TODO(integration:tink_webhook): verify the X-Tink-Signature header.
export async function PUT(req: Request) {
  const parsed = simSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const tx = simulateIncomingTransaction({ userId: DEMO_USER_ID, ...parsed.data });
  return NextResponse.json({ tx });
}

const actSchema = z.object({ id: z.string(), action: z.enum(["confirm", "cancel"]) });

export async function PATCH(req: Request) {
  const parsed = actSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "cancel") {
    cancelTransaction(parsed.data.id);
    // Award "no_delivery_today" points if this was a delivery.
    // PRD §5 Feature 5: cancellation within 5 min earns the points.
    const tx = listBankTransactions(DEMO_USER_ID).find((t) => t.id === parsed.data.id);
    if (tx && tx.category === "delivery") {
      const mk = monthKey();
      ensureMonthlyState(DEMO_USER_ID, mk);
      const def = BEHAVIOR_INDEX.no_delivery_today;
      const log = {
        id: randomUUID(),
        userId: DEMO_USER_ID,
        behavior: "no_delivery_today" as const,
        rawPoints: def.points,
        awardedPoints: def.points,
        multiplier: 1,
        loggedAt: new Date().toISOString(),
        note: "Cancelled via impulse interception",
      };
      insertBehavior(log);
      recordEarn(DEMO_USER_ID, mk, def.points);
      return NextResponse.json({ ok: true, awarded: def.points });
    }
    return NextResponse.json({ ok: true });
  }
  confirmTransaction(parsed.data.id);
  return NextResponse.json({ ok: true });
}
