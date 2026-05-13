"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RoutineButton({
  behaviorKey,
  label,
  points,
  doneToday,
}: {
  behaviorKey: string;
  label: string;
  points: number;
  doneToday: boolean;
}) {
  const router = useRouter();
  const [logged, setLogged] = useState(doneToday);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const submit = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ behavior: behaviorKey, confirmed: true }),
      });
      const data = await res.json();
      if (data?.result?.awardedPoints > 0) setLogged(true);
      router.refresh();
    } finally {
      setPending(false);
      setConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        disabled={pending || logged}
        className={`flex items-center justify-between rounded-xl px-3 py-2 text-left disabled:opacity-50 ${
          logged ? "bg-mint/15 text-mint" : "bg-ink-700 hover:bg-ink-600"
        }`}
      >
        <span className="text-xs">
          <span className="block">{label}</span>
          <span className="block text-ink-400">{logged ? "done today" : `+${points} pts`}</span>
        </span>
        {logged ? <span aria-hidden>✓</span> : <span aria-hidden>+</span>}
      </button>

      {confirm && !logged && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/80 backdrop-blur-sm p-4"
          onClick={() => setConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-ink-800 border border-ink-700 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Log {label}?</h3>
            <p className="mt-1 text-sm text-ink-300">+{points} pts will be added.</p>
            <div className="mt-4 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button className="btn-primary flex-1" onClick={submit} disabled={pending}>
                {pending ? "…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
