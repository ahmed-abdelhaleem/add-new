"use client";

import { useState } from "react";

import type { ActionItem } from "@/lib/types";

export default function ActionsClient({ initialItems }: { initialItems: ActionItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [text, setText] = useState("");

  const add = async () => {
    if (!text.trim()) return;
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setItems([data.item, ...items]);
    setText("");
  };

  const complete = async (id: string) => {
    await fetch("/api/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems(items.map((i) => (i.id === id ? { ...i, doneAt: new Date().toISOString() } : i)));
  };

  const open = items.filter((i) => !i.doneAt);
  const done = items.filter((i) => i.doneAt);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Action items</h1>
        <p className="text-sm text-ink-300">Captured from brain dumps or added manually.</p>
      </header>

      <section className="card">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="One thing to do"
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
        <h2 className="text-sm font-semibold text-ink-200">To do ({open.length})</h2>
        <ul className="mt-2 space-y-2">
          {open.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded-xl bg-ink-700 px-3 py-2">
              <span className="text-sm">{i.text}</span>
              <button className="btn-ghost text-xs" onClick={() => complete(i.id)}>
                Done
              </button>
            </li>
          ))}
          {open.length === 0 && <p className="text-xs text-ink-400">Empty.</p>}
        </ul>
      </section>

      {done.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">Done ({done.length})</h2>
          <ul className="mt-2 space-y-1">
            {done.slice(0, 20).map((i) => (
              <li key={i.id} className="text-xs text-ink-400 line-through">{i.text}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
