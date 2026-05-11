import { randomUUID } from "node:crypto";

import { insertCharityDisbursement, insertPayment, listPayments, updateUser } from "./db";
import type { Payment } from "./types";

/**
 * Stake charge (PRD §4.1) — runs on the 1st of each month.
 * Real implementation hits Swish (BankID) for SEK debit or Stripe SEK card.
 *
 * TODO(integration:swish): Implement Swish payment request via Getswish API.
 *   1. POST /api/v2/paymentrequests with payerAlias + amount.
 *   2. Poll status (or use callback URL once we have stable HTTPS).
 *   3. Resolve to succeeded/failed and persist external_id.
 *
 * TODO(integration:stripe): Add Stripe Subscriptions:
 *   - Customer + paymentMethod via Stripe Elements at onboarding.
 *   - Subscription with metered price per tier (500/1000/2000/5000 SEK).
 *   - Webhook handler at /api/payments/stripe/webhook for invoice.paid.
 */
export async function chargeMonthlyStake(opts: {
  userId: string;
  amountSEK: number;
  provider: "swish" | "stripe";
}): Promise<Payment> {
  const id = randomUUID();
  const payment: Payment = {
    id,
    userId: opts.userId,
    amountSEK: opts.amountSEK,
    kind: "stake_charge",
    provider: opts.provider,
    // The stub auto-succeeds. A real implementation would start as "pending".
    status: "succeeded",
    externalId: `STUB-${id.slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  };
  insertPayment(payment);
  updateUser(opts.userId, { payment_connected: true });
  return payment;
}

/**
 * Disburse unclaimed stake to the user's chosen charity at month end (PRD §4.1).
 *
 * TODO(integration:disbursement): wire to Bankgirot or a recurring SEPA
 * payout via the charity's bank account. Must be auditable — each
 * transfer's bank reference goes into charity_disbursements.external_id.
 */
export async function disburseToCharity(opts: {
  userId: string;
  monthKey: string;
  amountSEK: number;
  charity: string;
}): Promise<void> {
  if (opts.amountSEK <= 0) return;
  const id = randomUUID();
  insertCharityDisbursement({
    id,
    userId: opts.userId,
    monthKey: opts.monthKey,
    amountSEK: opts.amountSEK,
    charity: opts.charity,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  const payment: Payment = {
    id: randomUUID(),
    userId: opts.userId,
    amountSEK: opts.amountSEK,
    kind: "disbursement",
    provider: "bank",
    status: "succeeded",
    externalId: `CHARITY-${id.slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  };
  insertPayment(payment);
}

export function totalSEKThisYear(userId: string): {
  charged: number;
  recovered: number;
  donated: number;
} {
  const year = new Date().getFullYear().toString();
  const all = listPayments(userId).filter((p) => p.createdAt.startsWith(year));
  let charged = 0;
  let donated = 0;
  for (const p of all) {
    if (p.kind === "stake_charge" && p.status === "succeeded") charged += p.amountSEK;
    if (p.kind === "disbursement" && p.status === "succeeded") donated += p.amountSEK;
  }
  return { charged, recovered: charged - donated, donated };
}
