"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { WishlistItem } from "@/lib/types";

type Item = WishlistItem & { pointCost: number };

const CATEGORIES = ["travel", "experience", "learning", "food", "health", "delivery", "shopping"] as const;

export default function WishlistClient({
  initialItems,
  available,
}: {
  initialItems: Item[];
  available: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [cost, setCost] = useState<number>(500);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("shopping");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!title.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url: url || undefined, costSEK: cost, category }),
      });
      const data = await res.json();
      setItems((prev) => [{ ...data.item, pointCost: 0 }, ...prev]);
      setTitle("");
      setUrl("");
      setCost(500);
    } finally {
      setPending(false);
    }
  };

  const act = async (id: string, action: "redeem" | "delete") => {
    setError(null);
    const res = await fetch("/api/wishlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Action failed");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
          <p className="text-sm text-ink-300">24-hour cooling between adding and redeeming.</p>
        </div>
        <span className="pill">{available.toLocaleString()} pts</span>
      </header>

      {error && <div className="card border-flame/40 bg-flame/5 text-sm text-flame">{error}</div>}

      <section className="card space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item title"
          className="w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL (optional)"
          className="w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={1}
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            className="rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
            className="rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary w-full disabled:opacity-50" disabled={pending || !title.trim()} onClick={add}>
          {pending ? "Adding…" : "Add to wishlist"}
        </button>
      </section>

      <ul className="space-y-3">
        {items.length === 0 && <p className="text-sm text-ink-400">Empty for now.</p>}
        {items.map((it) => {
          const cooled = Date.now() >= new Date(it.cooledUntil).getTime();
          const hoursLeft = Math.max(0, Math.ceil((new Date(it.cooledUntil).getTime() - Date.now()) / 3600000));
          return (
            <li key={it.id} className="card">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium">{it.title}</h3>
                <span className="text-xs text-ink-300">{it.costSEK} SEK</span>
              </div>
              <p className="text-xs text-ink-400">{it.category} · {it.rate}-rate · source: {it.source}</p>
              <div className="mt-3 flex items-center justify-between">
                {!cooled ? (
                  <span className="text-xs text-flame">Cooling — {hoursLeft}h left</span>
                ) : it.redeemedAt ? (
                  <span className="text-xs text-mint">Redeemed</span>
                ) : (
                  <span className="text-xs text-gold">{it.pointCost.toLocaleString()} pts</span>
                )}
                <div className="flex gap-2">
                  {cooled && !it.redeemedAt && it.costSEK > 0 && (
                    <button className="btn-primary" onClick={() => act(it.id, "redeem")}>
                      Redeem
                    </button>
                  )}
                  <button className="btn-ghost" onClick={() => act(it.id, "delete")}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
