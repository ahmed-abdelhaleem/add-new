"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { NotificationPrefs, NotificationRecord } from "@/lib/types";

export default function NotificationsClient({
  initialPrefs,
  initialHistory,
}: {
  initialPrefs: NotificationPrefs;
  initialHistory: NotificationRecord[];
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const update = async (patch: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const fire = async (type: "anchor" | "moment" | "surprise" | "rescue") => {
    setPending(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, opensToday: 0 }),
      });
      const data = await res.json();
      setFeedback(data.sent ? `Sent: ${data.record.title}` : `Skipped: ${data.reason}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const act = async (id: string, action: "open" | "dismiss") => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    router.refresh();
  };

  const allOff =
    !prefs.anchorEnabled && !prefs.momentsEnabled && !prefs.surprisesEnabled && !prefs.rescueEnabled;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-ink-300">Four types. Granular control. Never noise.</p>
      </header>

      <section className="card space-y-3">
        <Toggle
          label="Daily Anchor"
          hint="One a day, timed to your optimal window."
          on={prefs.anchorEnabled}
          onChange={(v) => update({ anchorEnabled: v })}
        />
        {prefs.anchorEnabled && (
          <div>
            <label className="text-xs text-ink-400">Anchor time</label>
            <input
              type="time"
              value={prefs.anchorTimeHHMM}
              onChange={(e) => update({ anchorTimeHHMM: e.target.value })}
              className="ml-2 rounded-lg bg-ink-700 px-2 py-1 text-sm"
            />
          </div>
        )}
        <Toggle
          label="Streak & milestones"
          hint="Event-triggered. Max 2/day."
          on={prefs.momentsEnabled}
          onChange={(v) => update({ momentsEnabled: v })}
        />
        <Toggle
          label="Surprises & bonuses"
          hint="Unpredictable timing. The pull mechanic."
          on={prefs.surprisesEnabled}
          onChange={(v) => update({ surprisesEnabled: v })}
        />
        <Toggle
          label="Rescue"
          hint="Only when you go quiet."
          on={prefs.rescueEnabled}
          onChange={(v) => update({ rescueEnabled: v })}
        />
      </section>

      {allOff && (
        <div className="card border-mint/30 bg-mint/5 text-sm text-mint">
          All good. The app still works fully — notifications are a tool, not a requirement.
        </div>
      )}

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Test send</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["anchor", "moment", "surprise", "rescue"] as const).map((t) => (
            <button key={t} className="btn-ghost text-xs" disabled={pending} onClick={() => fire(t)}>
              {t}
            </button>
          ))}
        </div>
        {feedback && <p className="mt-2 text-xs text-ink-300">{feedback}</p>}
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">History</h2>
        {initialHistory.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">No notifications yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {initialHistory.map((n) => (
              <li key={n.id} className="rounded-lg bg-ink-700 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase text-gold">{n.type}</span>
                  <span className="text-xs text-ink-400">{new Date(n.sentAt).toLocaleString()}</span>
                </div>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-ink-300">{n.body}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  {!n.openedAt && (
                    <button className="text-mint" onClick={() => act(n.id, "open")}>
                      Mark opened
                    </button>
                  )}
                  {!n.dismissedAt && !n.openedAt && (
                    <button className="text-ink-400" onClick={() => act(n.id, "dismiss")}>
                      Dismiss
                    </button>
                  )}
                  {n.openedAt && <span className="text-mint">opened</span>}
                  {n.dismissedAt && <span className="text-ink-400">dismissed</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-ink-700"
    >
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-ink-400">{hint}</p>
      </div>
      <div className={`h-6 w-11 rounded-full p-1 ${on ? "bg-gold" : "bg-ink-600"}`}>
        <div className={`h-4 w-4 rounded-full bg-ink-100 transition-transform ${on ? "translate-x-5" : ""}`} />
      </div>
    </button>
  );
}
