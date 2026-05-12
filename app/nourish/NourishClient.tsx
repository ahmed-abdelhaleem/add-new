"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type {
  EnergyForecast,
  MealLog,
  MealOption,
  MealPlan,
  PantryItem,
  ShoppingList,
  WeeklyDeal,
} from "@/lib/types";

type Tab = "today" | "plan" | "shop" | "deals";

export default function NourishClient({
  today,
  plan,
  planLabels,
  shop,
  pantry,
  logs,
  streak,
  suggestions,
  deals,
}: {
  today: string;
  plan: MealPlan | null;
  planLabels: { breakfast: MealOption; lunch: MealOption; dinner: MealOption } | null;
  shop: ShoppingList | null;
  pantry: PantryItem[];
  logs: MealLog[];
  streak: number;
  suggestions: { breakfast: MealOption[]; lunch: MealOption[]; dinner: MealOption[] };
  deals: WeeklyDeal[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(plan ? "today" : "plan");
  const [energy, setEnergy] = useState<EnergyForecast>("medium");
  const [breakfast, setBreakfast] = useState(suggestions.breakfast[0]?.id);
  const [lunch, setLunch] = useState(suggestions.lunch[0]?.id);
  const [dinner, setDinner] = useState(suggestions.dinner[0]?.id);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pantryAdd, setPantryAdd] = useState("");

  const createPlan = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/nourish/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          energy,
          breakfastId: breakfast,
          lunchId: lunch,
          dinnerId: dinner,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(`+${data.awarded} pts. Plan locked.`);
        router.refresh();
      } else {
        setFeedback(typeof data.error === "string" ? data.error : "Failed");
      }
    } finally {
      setPending(false);
    }
  };

  const logAte = async (slot: "breakfast" | "lunch" | "dinner", answer: "yes" | "partly" | "no") => {
    const res = await fetch("/api/nourish/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, ateAsPlanned: answer }),
    });
    const data = await res.json();
    setFeedback(`+${data.awarded} pts. Streak ${data.streak} days.`);
    router.refresh();
  };

  const sendShop = async (provider: "ica" | "coop" | "mathem") => {
    if (!plan) return;
    const res = await fetch("/api/nourish/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, provider }),
    });
    const data = await res.json();
    setFeedback(`Sent to ${provider}. +${data.awarded} pts.`);
    router.refresh();
  };

  const toggleItem = async (itemName: string, checked: boolean) => {
    if (!plan) return;
    await fetch("/api/nourish/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, itemName, checked }),
    });
    router.refresh();
  };

  const togglePantry = async (name: string, action: "add" | "remove") => {
    await fetch("/api/nourish/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, action }),
    });
    if (action === "add") setPantryAdd("");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">NourishPlan</h1>
          <p className="text-sm text-ink-300">Five minutes. 1–2 days only. No extras.</p>
        </div>
        <span className="pill text-amber">Meal streak {streak}d</span>
      </header>

      <div className="grid grid-cols-4 gap-1 rounded-xl bg-ink-700 p-1">
        {(["today", "plan", "shop", "deals"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-2 text-xs font-medium ${tab === t ? "bg-gold text-ink-900" : "text-ink-300"}`}
          >
            {t === "today" ? "Today" : t === "plan" ? "Plan" : t === "shop" ? "Shop" : "Deals"}
          </button>
        ))}
      </div>

      {feedback && <div className="card border-mint/40 bg-mint/5 text-sm text-mint">{feedback}</div>}

      {tab === "today" && (
        <section className="card space-y-3">
          {!planLabels ? (
            <>
              <p className="text-sm text-ink-300">No plan for today yet. Tap Plan above.</p>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-ink-200">Today</h2>
              {(["breakfast", "lunch", "dinner"] as const).map((slot) => {
                const opt = planLabels[slot];
                return (
                  <div key={slot} className="rounded-xl bg-ink-700 p-3">
                    <p className="text-xs text-ink-400 uppercase">{slot}</p>
                    <p className="text-sm text-ink-100">{opt.name}</p>
                    <p className="text-xs text-ink-400">{opt.prepMinutes} min · {opt.ingredientCount} ingredients</p>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      {(["yes", "partly", "no"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => logAte(slot, a)}
                          className="rounded-lg bg-ink-600 px-2 py-1 text-xs hover:bg-ink-500"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>
      )}

      {tab === "plan" && (
        <section className="card space-y-4">
          {plan ? (
            <p className="text-sm text-ink-300">Plan locked for today. Switch to Today to log.</p>
          ) : (
            <>
              <div>
                <p className="text-sm text-ink-200">How much energy will you have tomorrow?</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as const).map((e) => (
                    <button
                      key={e}
                      onClick={() => setEnergy(e)}
                      className={`btn text-xs ${energy === e ? "bg-gold text-ink-900" : "bg-ink-700"}`}
                    >
                      {e === "low" ? "Low (<10 min)" : e === "medium" ? "Medium" : "High"}
                    </button>
                  ))}
                </div>
              </div>

              {(["breakfast", "lunch", "dinner"] as const).map((slot) => {
                const opts = suggestions[slot];
                const value = slot === "breakfast" ? breakfast : slot === "lunch" ? lunch : dinner;
                const setter =
                  slot === "breakfast" ? setBreakfast : slot === "lunch" ? setLunch : setDinner;
                return (
                  <div key={slot}>
                    <p className="text-xs text-ink-400 uppercase mb-2">{slot}</p>
                    <div className="space-y-2">
                      {opts.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => setter(o.id)}
                          className={`w-full rounded-xl border px-3 py-2 text-left ${
                            value === o.id ? "border-gold bg-gold/10" : "border-ink-700 bg-ink-700"
                          }`}
                        >
                          <p className="text-sm">{o.name}</p>
                          <p className="text-xs text-ink-400">
                            {o.prepMinutes} min · {o.ingredientCount} ingredients
                            {o.dealTag && <span className="ml-2 text-gold">{o.dealTag}</span>}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <button
                className="btn-primary w-full disabled:opacity-50"
                disabled={pending}
                onClick={createPlan}
              >
                {pending ? "Creating…" : "Lock plan (+600 pts)"}
              </button>
            </>
          )}
        </section>
      )}

      {tab === "shop" && (
        <section className="card space-y-3">
          {!shop ? (
            <p className="text-sm text-ink-300">Create a plan first.</p>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-ink-200">Shopping list</h2>
              <p className="text-xs text-ink-400">1–2 days only · Exact quantities · No extras</p>
              <ul className="space-y-1">
                {shop.items.length === 0 ? (
                  <li className="text-xs text-ink-400">All ingredients in pantry.</li>
                ) : (
                  shop.items.map((it) => (
                    <li key={it.name} className="flex items-center justify-between rounded-lg bg-ink-700 px-3 py-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={it.checked}
                          onChange={(e) => toggleItem(it.name, e.target.checked)}
                          className="accent-gold"
                        />
                        <span className={it.checked ? "line-through text-ink-400" : ""}>{it.name}</span>
                      </label>
                      <span className="text-xs text-ink-400">{it.section}</span>
                    </li>
                  ))
                )}
              </ul>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {(["ica", "coop", "mathem"] as const).map((p) => (
                  <button key={p} className="btn-ghost text-xs" onClick={() => sendShop(p)}>
                    Send to {p.toUpperCase()}
                  </button>
                ))}
              </div>
              {shop.sentTo && (
                <p className="text-xs text-mint">
                  Sent to {shop.sentTo} on {shop.sentAt ? new Date(shop.sentAt).toLocaleString() : "—"}
                </p>
              )}
            </>
          )}

          <div className="border-t border-ink-700 pt-4">
            <p className="text-sm text-ink-200">Pantry</p>
            <p className="text-xs text-ink-400">Items here won&apos;t appear on the shop list.</p>
            <div className="mt-2 flex gap-2">
              <input
                value={pantryAdd}
                onChange={(e) => setPantryAdd(e.target.value)}
                placeholder="add ingredient"
                className="flex-1 rounded-xl bg-ink-700 border border-ink-600 p-2 text-sm focus:outline-none focus:border-gold"
              />
              <button
                className="btn-primary text-xs"
                disabled={!pantryAdd.trim()}
                onClick={() => togglePantry(pantryAdd.trim().toLowerCase(), "add")}
              >
                Add
              </button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1">
              {pantry.map((p) => (
                <li key={p.name}>
                  <button
                    onClick={() => togglePantry(p.name, "remove")}
                    className="rounded-full bg-ink-700 px-2 py-1 text-xs text-ink-200 hover:bg-ink-600"
                  >
                    {p.name} ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === "deals" && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">This week&apos;s deals</h2>
          <p className="text-xs text-ink-400">
            Already factored into your plan suggestions — no need to browse.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {deals.map((d) => (
              <li key={`${d.store}-${d.item}`} className="flex items-center justify-between rounded-lg bg-ink-700 px-3 py-2">
                <span>{d.item}</span>
                <span className="text-xs">
                  <span className="text-gold uppercase mr-2">{d.store}</span>
                  {d.priceSEK} SEK
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {logs.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">Recent logs</h2>
          <ul className="mt-2 space-y-1 text-xs text-ink-300">
            {logs.slice(0, 10).map((l, i) => (
              <li key={i}>
                {l.date} · {l.slot} ·{" "}
                {l.ateAsPlanned === true ? "yes" : l.ateAsPlanned === false ? "no" : "partly"}
                {l.deliveryOrdered && <span className="ml-1 text-flame">(delivery)</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
