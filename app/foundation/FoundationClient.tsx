"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { pickRedirectMenu } from "@/lib/foundation";
import type {
  FoundationModeState,
  ReadinessScore,
  TriggerLog,
} from "@/lib/types";

export default function FoundationClient({
  state,
  triggerLogs,
  readiness,
  deactivationReady,
  deactivationHoursRemaining,
}: {
  state: FoundationModeState | null;
  triggerLogs: TriggerLog[];
  readiness: ReadinessScore[];
  deactivationReady: boolean;
  deactivationHoursRemaining: number;
}) {
  const router = useRouter();
  const [commitment, setCommitment] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showRedirect, setShowRedirect] = useState<string | null>(null);
  const [currentEnergy, setCurrentEnergy] = useState<"low" | "mid" | "high">("mid");

  const activate = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/foundation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setFeedback(typeof data.error === "string" ? data.error : "Failed");
      }
    } finally {
      setPending(false);
    }
  };

  const trigger = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/foundation/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRedirect(data.id);
        setFeedback(`+${data.awarded} pts. Take 10 minutes.`);
      } else {
        setFeedback(data.error);
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const pickRedirect = async (triggerId: string, redirectKey: string, bonus: number) => {
    const res = await fetch("/api/foundation/trigger", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: triggerId, redirectChosen: redirectKey, completed: true }),
    });
    const data = await res.json();
    setFeedback(`Redirect logged. +${data.awarded || bonus} pts.`);
    setShowRedirect(null);
    router.refresh();
  };

  const computeReadiness = async () => {
    setPending(true);
    try {
      await fetch("/api/foundation/readiness", { method: "POST" });
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const startDeactivate = async () => {
    await fetch("/api/foundation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    router.refresh();
  };

  const completeDeactivate = async () => {
    const res = await fetch("/api/foundation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    if (res.ok) router.refresh();
  };

  const latestScore = readiness[readiness.length - 1];
  const redirectMenu = pickRedirectMenu(new Date(), currentEnergy);

  // Activation screen
  if (!state || state.deactivatedAt) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Foundation Mode</h1>
          <p className="text-sm text-ink-300">Six months. Building, not depriving.</p>
        </header>

        <section className="card space-y-3">
          <p className="text-sm text-ink-200">
            The framing: spending six months becoming someone you&apos;d want to be in a
            relationship with. Stake increases by 500 SEK/month. Deactivation requires
            a 72-hour reflection window.
          </p>
          <p className="text-sm text-ink-200">Write your commitment:</p>
          <textarea
            value={commitment}
            onChange={(e) => setCommitment(e.target.value.slice(0, 280))}
            rows={4}
            placeholder="I'm activating this because ___. In 6 months I want to be ___."
            className="w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-gold"
          />
          <button
            className="btn-primary w-full disabled:opacity-50"
            disabled={pending || commitment.trim().length < 10}
            onClick={activate}
          >
            {pending ? "Activating…" : "Activate Foundation Mode"}
          </button>
          {feedback && <p className="text-xs text-flame">{feedback}</p>}
        </section>
      </div>
    );
  }

  // Active screen
  const daysIn = Math.floor((Date.now() - new Date(state.activatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const triggersThisWeek = triggerLogs.filter((t) => {
    const ms = Date.now() - new Date(t.loggedAt).getTime();
    return ms < 7 * 24 * 60 * 60 * 1000;
  });
  const completedThisWeek = triggersThisWeek.filter((t) => t.redirectCompletedAt).length;

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Foundation Mode</h1>
          <p className="text-sm text-ink-300">
            Day {daysIn} of {state.durationDays}
          </p>
        </div>
        <span className="pill text-gold">+{state.surchargeSEK} SEK stake</span>
      </header>

      <section className="card">
        <h2 className="text-xs font-semibold text-ink-200 uppercase tracking-wider">Commitment</h2>
        <p className="mt-2 text-sm italic text-ink-100">&ldquo;{state.commitment}&rdquo;</p>
      </section>

      {latestScore && (
        <section className="card">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ink-200">Readiness</h2>
            <span className="text-xs text-amber">{latestScore.phase}</span>
          </div>
          <p className="mt-2 text-3xl font-display font-semibold text-gold">{latestScore.total}</p>
          <p className="text-xs text-ink-400">out of 100, this week</p>
          <ul className="mt-3 grid grid-cols-2 gap-1 text-xs text-ink-300">
            <li>Physical: {latestScore.physical}</li>
            <li>Mental: {latestScore.mental}</li>
            <li>Social: {latestScore.social}</li>
            <li>Regulation: {latestScore.regulation}</li>
          </ul>
        </section>
      )}

      <button
        className="btn-danger w-full py-5 text-lg disabled:opacity-50"
        onClick={trigger}
        disabled={pending}
      >
        Urge hit
      </button>
      <p className="text-center text-xs text-ink-400">One tap. +800 pts. 10-minute timer.</p>
      {feedback && <p className="text-center text-sm text-mint">{feedback}</p>}

      {showRedirect && (
        <section className="card border-amber/40 bg-amber/5 space-y-3">
          <p className="text-sm text-amber">
            Noted. What&apos;s underneath this right now — boredom, loneliness, restlessness, something else?
          </p>
          <div className="flex gap-2">
            {(["low", "mid", "high"] as const).map((e) => (
              <button
                key={e}
                onClick={() => setCurrentEnergy(e)}
                className={`btn text-xs flex-1 ${currentEnergy === e ? "bg-gold text-ink-900" : "bg-ink-700"}`}
              >
                {e === "low" ? "Low" : e === "mid" ? "Mid" : "High"} energy
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {redirectMenu.map((r) => (
              <li key={r.key}>
                <button
                  className="w-full rounded-xl bg-ink-700 px-3 py-3 text-left hover:bg-ink-600"
                  onClick={() => pickRedirect(showRedirect, r.key, r.bonusPoints)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{r.label}</span>
                    {r.bonusPoints > 0 && (
                      <span className="text-xs text-gold">+{r.bonusPoints}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">This week</h2>
        <p className="mt-2 text-xs text-ink-300">
          {triggersThisWeek.length} triggers logged · {completedThisWeek} redirects completed
        </p>
        <button className="btn-ghost mt-3 w-full text-xs" onClick={computeReadiness} disabled={pending}>
          Compute weekly readiness
        </button>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Recent triggers</h2>
        {triggerLogs.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">None yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs">
            {triggerLogs.slice(0, 10).map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span className="text-ink-300">{new Date(t.loggedAt).toLocaleString()}</span>
                <span className={t.redirectCompletedAt ? "text-mint" : "text-ink-400"}>
                  {t.redirectCompletedAt ? "redirected" : "logged"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        {state.deactivationStartedAt ? (
          <>
            <p className="text-sm text-amber">
              Deactivation reflection in progress. {Math.ceil(deactivationHoursRemaining)} hours
              remaining.
            </p>
            <button
              className="btn-danger mt-3 w-full disabled:opacity-50"
              disabled={!deactivationReady}
              onClick={completeDeactivate}
            >
              Complete deactivation
            </button>
          </>
        ) : (
          <button className="btn-ghost w-full text-xs" onClick={startDeactivate}>
            Start 72-hour deactivation window
          </button>
        )}
      </section>
    </div>
  );
}
