"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { BankTransaction } from "@/lib/types";

export default function BankClient({
  connected,
  transactions,
}: {
  connected: boolean;
  transactions: BankTransaction[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const connect = async (action: "connect" | "disconnect") => {
    setPending(true);
    await fetch("/api/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setPending(false);
    router.refresh();
  };

  const simulate = async (preset: { merchant: string; category: BankTransaction["category"]; amountSEK: number }) => {
    await fetch("/api/bank", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    });
    router.refresh();
  };

  const act = async (id: string, action: "confirm" | "cancel") => {
    const res = await fetch("/api/bank", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    if (data.awarded) {
      setFeedback(`+${data.awarded} pts awarded for the cancellation.`);
      setTimeout(() => setFeedback(null), 2000);
    }
    router.refresh();
  };

  const open = transactions.filter((t) => t.status === "detected");
  const past = transactions.filter((t) => t.status !== "detected");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Bank</h1>
        <p className="text-sm text-ink-300">Impulse interception. The pause, not the block.</p>
      </header>

      <section className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink-200">PSD2 connection</h2>
          {connected ? (
            <button className="btn-ghost text-xs" onClick={() => connect("disconnect")} disabled={pending}>
              Disconnect
            </button>
          ) : (
            <button className="btn-primary text-xs" onClick={() => connect("connect")} disabled={pending}>
              Connect bank
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-400">
          Stubbed — production wires Tink or Aiia open banking. The connection flow
          opens a BankID consent screen, then polls / webhooks for transactions.
        </p>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Simulate incoming transactions</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn-ghost text-xs" onClick={() => simulate({ merchant: "Wolt", category: "delivery", amountSEK: 220 })}>
            Wolt 220 SEK
          </button>
          <button className="btn-ghost text-xs" onClick={() => simulate({ merchant: "Foodora", category: "delivery", amountSEK: 340 })}>
            Foodora 340 SEK
          </button>
          <button className="btn-ghost text-xs" onClick={() => simulate({ merchant: "H&M", category: "fast_fashion", amountSEK: 690 })}>
            H&M 690 SEK
          </button>
          <button className="btn-ghost text-xs" onClick={() => simulate({ merchant: "Systembolaget", category: "alcohol", amountSEK: 380 })}>
            Systembolaget 380 SEK
          </button>
        </div>
      </section>

      {feedback && <div className="card border-mint/40 bg-mint/5 text-sm text-mint">{feedback}</div>}

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Open intercepts ({open.length})</h2>
        {open.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">Clear.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {open.map((t) => (
              <li key={t.id} className="rounded-xl bg-flame/5 border border-flame/30 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm">{t.merchant}</span>
                  <span className="text-xs text-ink-300">{t.amountSEK} SEK</span>
                </div>
                <p className="mt-1 text-xs text-ink-400">{t.category}</p>
                <div className="mt-3 flex gap-2">
                  <button className="btn-primary text-xs" onClick={() => act(t.id, "cancel")}>
                    Cancel & keep pts
                  </button>
                  <button className="btn-ghost text-xs" onClick={() => act(t.id, "confirm")}>
                    Proceed
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">Past</h2>
          <ul className="mt-2 space-y-1 text-xs">
            {past.slice(0, 20).map((t) => (
              <li key={t.id} className="flex items-center justify-between text-ink-300">
                <span>{t.merchant} · {t.category} · {t.amountSEK} SEK</span>
                <span className={t.cancelled ? "text-mint" : "text-ink-400"}>{t.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
