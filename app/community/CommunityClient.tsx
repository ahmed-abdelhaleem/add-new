"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CommunityChallenge } from "@/lib/types";

export default function CommunityClient({
  challenges,
  enrollment,
}: {
  challenges: CommunityChallenge[];
  enrollment: Record<string, boolean>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const toggle = async (id: string, joined: boolean) => {
    setPending(id);
    await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: id, action: joined ? "leave" : "join" }),
    });
    setPending(null);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
        <p className="text-sm text-ink-300">Opt-in only. Anonymous leaderboard.</p>
      </header>

      <ul className="space-y-3">
        {challenges.map((c) => {
          const joined = enrollment[c.id];
          const ends = new Date(c.endsAt).toLocaleDateString();
          return (
            <li key={c.id} className="card">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold">{c.title}</h3>
                <span className="text-xs text-gold">+{c.bonusPoints.toLocaleString()} pts</span>
              </div>
              <p className="mt-1 text-sm text-ink-300">{c.description}</p>
              <p className="mt-2 text-xs text-ink-400">
                Ends {ends} · {c.participants} participants
              </p>
              <button
                className={`mt-3 w-full ${joined ? "btn-ghost" : "btn-primary"}`}
                onClick={() => toggle(c.id, joined)}
                disabled={pending === c.id}
              >
                {joined ? "Leave" : "Join"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
