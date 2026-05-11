"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CharityDisbursement, Payment } from "@/lib/types";

export default function PaymentsClient({
  payments,
  disbursements,
  yearly,
  stakeSEK,
  recoveredSEK,
  unrecoveredSEK,
  charity,
}: {
  payments: Payment[];
  disbursements: CharityDisbursement[];
  yearly: { charged: number; recovered: number; donated: number };
  stakeSEK: number;
  recoveredSEK: number;
  unrecoveredSEK: number;
  charity: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const act = async (action: "charge" | "disburse") => {
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, provider: "swish" }),
      });
      const data = await res.json();
      if (action === "charge") {
        setFeedback(`Charged ${data.payment.amountSEK} SEK via ${data.payment.provider}.`);
      } else {
        setFeedback(`Sent ${data.amount} SEK to ${data.charity}.`);
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Stake & payments</h1>
        <p className="text-sm text-ink-300">Real money. Real recovery. Real donations.</p>
      </header>

      <section className="card grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-ink-400">Stake</p>
          <p className="text-lg font-semibold">{stakeSEK} SEK</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Recovered</p>
          <p className="text-lg font-semibold text-mint">{recoveredSEK} SEK</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">At risk</p>
          <p className="text-lg font-semibold text-flame">{unrecoveredSEK} SEK</p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-ink-200">Manual actions</h2>
        <p className="text-xs text-ink-400">
          Charge runs on the 1st of each month in production (via Stripe / Swish).
          Disbursement runs after month-end. Trigger them manually here for demo.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost text-xs" disabled={pending} onClick={() => act("charge")}>
            Charge stake now
          </button>
          <button className="btn-ghost text-xs" disabled={pending || unrecoveredSEK === 0} onClick={() => act("disburse")}>
            Disburse {unrecoveredSEK} → {charity}
          </button>
        </div>
        {feedback && <p className="text-sm text-mint">{feedback}</p>}
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">This year</h2>
        <div className="mt-2 grid grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-ink-400">Charged</p>
            <p>{yearly.charged} SEK</p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Recovered</p>
            <p>{yearly.recovered} SEK</p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Donated</p>
            <p>{yearly.donated} SEK</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Recent payments</h2>
        <ul className="mt-2 space-y-1 text-xs text-ink-300">
          {payments.length === 0 ? (
            <li className="text-ink-400">No payments yet.</li>
          ) : (
            payments.slice(0, 12).map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>
                  {new Date(p.createdAt).toLocaleDateString()} · {p.kind} · {p.provider}
                </span>
                <span>
                  {p.amountSEK} SEK · {p.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Charity</h2>
        <ul className="mt-2 space-y-1 text-xs text-ink-300">
          {disbursements.length === 0 ? (
            <li className="text-ink-400">None yet.</li>
          ) : (
            disbursements.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <span>{d.monthKey} → {d.charity}</span>
                <span>{d.amountSEK} SEK · {d.status}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
