"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { VaultCustomItem } from "@/lib/types";

const CATEGORIES = ["travel", "experience", "learning", "food", "health", "delivery", "shopping"] as const;

export default function VaultCustomClient({ initialItems }: { initialItems: VaultCustomItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("experience");
  const [cost, setCost] = useState<number>(500);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) return;
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/vault/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: desc || undefined,
          category: cat,
          costSEK: cost,
        }),
      });
      const data = await res.json();
      setFeedback(data.review.approve ? `Approved · ${data.review.reason}` : `Held · ${data.review.reason}`);
      setTitle("");
      setDesc("");
      router.refresh();
      // Re-fetch list
      const fresh = await fetch("/api/vault/custom").then((r) => r.json());
      setItems(fresh.items);
    } finally {
      setPending(false);
    }
  };

  const del = async (id: string) => {
    await fetch("/api/vault/custom", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems(items.filter((i) => i.id !== id));
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Custom rewards</h1>
        <p className="text-sm text-ink-300">
          Propose your own Vault item. ACE moderates it for safety (and may refine the wording).
        </p>
      </header>

      <section className="card space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title — e.g. 'Photography workshop'"
          className="w-full rounded-xl bg-ink-700 p-3 text-sm focus:outline-none focus:border-gold"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="What is it? What makes it good for you?"
          className="w-full rounded-xl bg-ink-700 p-3 text-sm focus:outline-none focus:border-gold"
        />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as (typeof CATEGORIES)[number])}
            className="rounded-xl bg-ink-700 p-3"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            value={cost}
            min={1}
            onChange={(e) => setCost(Number(e.target.value))}
            className="rounded-xl bg-ink-700 p-3 text-right"
          />
        </div>
        <button className="btn-primary w-full disabled:opacity-50" disabled={pending || !title.trim()} onClick={submit}>
          {pending ? "Asking ACE…" : "Submit for moderation"}
        </button>
        {feedback && (
          <p className={`text-xs ${feedback.startsWith("Held") ? "text-flame" : "text-mint"}`}>
            {feedback}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Your proposals</h2>
        {items.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">Nothing yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {items.map((it) => (
              <li key={it.id} className="rounded-lg bg-ink-700 p-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-medium">{it.title}</h3>
                  <span
                    className={`text-xs uppercase ${
                      it.status === "approved" ? "text-mint" : it.status === "rejected" ? "text-flame" : "text-amber"
                    }`}
                  >
                    {it.status}
                  </span>
                </div>
                <p className="text-xs text-ink-300">
                  {it.category} · {it.rate}-rate · {it.costSEK} SEK
                </p>
                {it.description && <p className="text-xs text-ink-300 italic">&ldquo;{it.description}&rdquo;</p>}
                {it.aiReview && <p className="mt-1 text-xs text-ink-400">ACE: {it.aiReview}</p>}
                <button onClick={() => del(it.id)} className="mt-2 text-xs text-flame underline">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
