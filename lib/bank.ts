import { randomUUID } from "node:crypto";

import {
  insertBankTransaction,
  listBankTransactions,
  updateBankTransactionStatus,
  updateUser,
} from "./db";
import type { BankTransaction } from "./types";

/**
 * PRD §5 Feature 5 — Impulse Interception via PSD2.
 *
 * TODO(integration:tink): Connect via Tink Link aggregation, request the
 * `transactions:read` scope. Poll account transactions every 60s OR
 * subscribe to webhooks (Tink Money). Map Tink merchant categories to
 * our internal categories (delivery / gambling / fast_fashion / alcohol).
 *
 * TODO(integration:aiia): Aiia is the Nordic alternative. Same OAuth + PSD2
 * flow; cheaper per active-account.
 *
 * Bank connection itself is a webview flow — link the user from Settings
 * to /onboarding/bank-link which deep-links into the bank's BankID consent
 * screen, then redirects back with an authorization code.
 *
 * For now: connectBank() marks the flag; simulateIncomingTransaction()
 * is the dev hook the prototype uses to demonstrate the intercept UX.
 */
export function connectBank(userId: string, _provider: "tink" | "aiia" | "manual" = "manual") {
  updateUser(userId, { bank_connected: true });
}

export function disconnectBank(userId: string) {
  updateUser(userId, { bank_connected: false });
}

const INTERCEPTABLE_CATEGORIES: BankTransaction["category"][] = [
  "delivery",
  "gambling",
  "fast_fashion",
  "alcohol",
];

export function simulateIncomingTransaction(opts: {
  userId: string;
  merchant: string;
  category: BankTransaction["category"];
  amountSEK: number;
}): BankTransaction {
  const id = randomUUID();
  const intercept = INTERCEPTABLE_CATEGORIES.includes(opts.category);
  const tx: BankTransaction = {
    id,
    userId: opts.userId,
    merchant: opts.merchant,
    category: opts.category,
    amountSEK: opts.amountSEK,
    detectedAt: new Date().toISOString(),
    intercepted: intercept,
    cancelled: false,
    status: intercept ? "detected" : "ignored",
  };
  insertBankTransaction(tx);
  return tx;
}

export function confirmTransaction(id: string) {
  updateBankTransactionStatus(id, "confirmed", false);
}

export function cancelTransaction(id: string) {
  updateBankTransactionStatus(id, "cancelled", true);
}

export function listOpenIntercepts(userId: string): BankTransaction[] {
  return listBankTransactions(userId).filter((t) => t.status === "detected");
}
