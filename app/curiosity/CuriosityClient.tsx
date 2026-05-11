"use client";

import { useState } from "react";

import type { CuriosityItem } from "@/lib/types";

export default function CuriosityClient({ initialItems }: { initialItems: CuriosityItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [text, setText] = useState("");

  const add = async () => {
    if (!text.trim()) return;
    const res = await fetch("/api/curiosity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setItems([data.item, ...items]);
    setText("");
  };

  const resolve = async (id: string) => {
    await fetch("/api/curiosity", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems(items.map((i) => (i.id === id ? { ...i, resolvedAt: new Date().toISOString() } : i)));
  };

  const open = items.filter((i) => !i.resolvedAt);
  const resolved = items.filter((i) => i.resolvedAt);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Curiosity Queue</h1>
        <p className="text-sm text-ink-300">The rabbit holes, deferred.</p>
      </header>

      <section className="card">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you almost search?"
          className="w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn-primary mt-3 w-full" onClick={add} disabled={!text.trim()}>
          Add
        </button>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Queue ({open.length})</h2>
        {open.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">Clear.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {open.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl bg-ink-700 px-3 py-2">
                <span className="text-sm">{i.text}</span>
                <button className="btn-ghost text-xs" onClick={() => resolve(i.id)}>
                  Resolved
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">Done ({resolved.length})</h2>
          <ul className="mt-2 space-y-1">
            {resolved.slice(0, 20).map((i) => (
              <li key={i.id} className="text-xs text-ink-400">· {i.text}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
