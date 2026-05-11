"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AccountabilityPartner, PartnerBoost } from "@/lib/types";

export default function PartnerClient({
  initialPartner,
  initialBoosts,
  digest,
}: {
  initialPartner: AccountabilityPartner | null;
  initialBoosts: PartnerBoost[];
  digest: string | null;
}) {
  const router = useRouter();
  const [partner, setPartner] = useState(initialPartner);
  const [boosts] = useState(initialBoosts);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [boostMsg, setBoostMsg] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const add = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      setPartner(data.partner);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    await fetch("/api/partner", { method: "DELETE" });
    setPartner(null);
    router.refresh();
  };

  const sendBoost = async () => {
    const res = await fetch("/api/partner/boost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: boostMsg || undefined }),
    });
    const data = await res.json();
    setFeedback(`Sent. +${data.awarded} bonus pts.`);
    setBoostMsg("");
    setTimeout(() => setFeedback(null), 2000);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Accountability partner</h1>
        <p className="text-sm text-ink-300">Summary only — never granular data.</p>
      </header>

      {!partner ? (
        <section className="card space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Their name"
            className="w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Their email"
            type="email"
            className="w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
          />
          <button
            className="btn-primary w-full disabled:opacity-50"
            disabled={pending || !name || !email}
            onClick={add}
          >
            Invite
          </button>
          <p className="text-xs text-ink-400">
            Production sends a tokenized verification email via Resend. Stubbed
            here — clicking Invite marks them verified.
          </p>
        </section>
      ) : (
        <>
          <section className="card">
            <p className="text-sm">
              <strong>{partner.name}</strong> — {partner.email}
              {partner.verified && <span className="text-mint ml-2">verified</span>}
            </p>
            <button className="btn-ghost mt-3 text-xs" onClick={remove}>
              Remove
            </button>
          </section>

          <section className="card space-y-3">
            <h2 className="text-sm font-semibold text-ink-200">Send a boost</h2>
            <input
              value={boostMsg}
              onChange={(e) => setBoostMsg(e.target.value)}
              placeholder="Optional note"
              className="w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
            />
            <button className="btn-primary w-full" onClick={sendBoost}>
              Send boost (+1,000 pts)
            </button>
            {feedback && <p className="text-sm text-mint">{feedback}</p>}
          </section>

          {digest && (
            <section className="card">
              <h2 className="text-sm font-semibold text-ink-200">Weekly digest preview</h2>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-ink-300">{digest}</pre>
            </section>
          )}

          {boosts.length > 0 && (
            <section className="card">
              <h2 className="text-sm font-semibold text-ink-200">Past boosts</h2>
              <ul className="mt-2 space-y-1 text-xs text-ink-300">
                {boosts.map((b) => (
                  <li key={b.id}>
                    {new Date(b.sentAt).toLocaleDateString()} · +{b.awardedPoints} pts
                    {b.message && <span className="text-ink-400">{" — \""}{b.message}{"\""}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
