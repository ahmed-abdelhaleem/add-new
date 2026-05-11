"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { VaultItem } from "@/lib/types";

type Item = VaultItem & { pointCost: number };

export default function VaultClient({
  items,
  available,
}: {
  items: Item[];
  available: number;
}) {
  const router = useRouter();
  const [balance, setBalance] = useState(available);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const redeem = async (item: Item) => {
    setRedeeming(item.id);
    setError(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed (${res.status})`);
        return;
      }
      setBalance(data.remaining);
      setConfirm(`${item.title} — redeemed.`);
      router.refresh();
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">The Vault</h1>
          <p className="text-sm text-ink-300">Spend the points you&apos;ve earned.</p>
        </div>
        <span className="pill">{balance.toLocaleString()} pts available</span>
      </header>

      {error && <div className="card border-flame/40 bg-flame/5 text-sm text-flame">{error}</div>}
      {confirm && <div className="card border-mint/40 bg-mint/5 text-sm text-mint">{confirm}</div>}

      <ul className="grid grid-cols-1 gap-3">
        {items.map((it) => {
          const affordable = it.pointCost <= balance;
          return (
            <li key={it.id} className="card">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold">{it.title}</h3>
                <span className="text-xs text-ink-300">{it.costSEK} SEK</span>
              </div>
              <p className="mt-1 text-sm text-ink-300">{it.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm">
                  <span className="text-gold">{it.pointCost.toLocaleString()} pts</span>
                  {it.rate === "B" && (
                    <span className="ml-2 text-xs text-ink-400">(Category B — 1.8× pts/SEK)</span>
                  )}
                </span>
                <button
                  onClick={() => redeem(it)}
                  disabled={!affordable || redeeming !== null}
                  className="btn-primary disabled:opacity-40"
                >
                  {redeeming === it.id ? "…" : affordable ? "Redeem" : "Not yet"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
