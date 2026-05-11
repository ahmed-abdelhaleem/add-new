"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ONBOARDING_QUESTIONS, tierForStake } from "@/lib/onboarding";

type Answers = {
  collapsePattern?: string;
  bestWeek?: string;
  energyWindow?: string;
  aspiration?: string;
  involvePartner?: "yes" | "no";
  stakeSEK?: number;
  charity?: string;
  name?: string;
};

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add a 0th step for name.
  const totalSteps = 1 + ONBOARDING_QUESTIONS.length;
  const isNameStep = step === 0;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : `Failed (${res.status})`);
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const q = isNameStep ? null : ONBOARDING_QUESTIONS[step - 1];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Set the frame</h1>
        <p className="text-sm text-ink-300">
          Eight minutes. The last question is the charity — that&apos;s deliberate.
        </p>
      </header>

      <div className="h-1 rounded-full bg-ink-700">
        <div
          className="h-full rounded-full bg-flame transition-all"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <section className="card space-y-4">
        {isNameStep ? (
          <NameStep value={answers.name} onChange={(v) => setAnswers({ ...answers, name: v })} />
        ) : q?.key === "involvePartner" ? (
          <BinaryStep
            prompt={q.prompt}
            value={answers.involvePartner}
            onChange={(v) => setAnswers({ ...answers, involvePartner: v })}
          />
        ) : q?.key === "stakeSEK" ? (
          <StakeStep
            prompt={q.prompt}
            value={answers.stakeSEK}
            onChange={(v) => setAnswers({ ...answers, stakeSEK: v })}
          />
        ) : q ? (
          <FreeTextStep
            prompt={q.prompt}
            placeholder={q.placeholder}
            value={(answers as Record<string, string | undefined>)[q.key] ?? ""}
            onChange={(v) => setAnswers({ ...answers, [q.key]: v })}
          />
        ) : null}

        <div className="flex justify-between gap-2 pt-2">
          {step > 0 && (
            <button className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          {step < totalSteps - 1 ? (
            <button
              className="btn-primary ml-auto"
              onClick={() => setStep((s) => s + 1)}
              disabled={!stepValid(step, answers)}
            >
              Next
            </button>
          ) : (
            <button
              className="btn-primary ml-auto"
              onClick={submit}
              disabled={submitting || !stepValid(step, answers)}
            >
              {submitting ? "Locking in…" : "Lock it in"}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-flame">{error}</p>}
      </section>

      <p className="text-xs text-ink-400">
        First 7 days: 1.5× earn rate, no stake charged. After that you owe the
        stake every month.
      </p>
    </div>
  );
}

function stepValid(step: number, a: Answers): boolean {
  if (step === 0) return !!a.name && a.name.trim().length > 0;
  const keys = ONBOARDING_QUESTIONS.map((q) => q.key);
  const key = keys[step - 1];
  if (key === "stakeSEK") return typeof a.stakeSEK === "number" && a.stakeSEK >= 100;
  if (key === "involvePartner") return !!a.involvePartner;
  const v = (a as Record<string, string | undefined>)[key];
  return !!v && v.trim().length > 0;
}

function NameStep({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-ink-200">What should ACE call you?</label>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
      />
    </div>
  );
}

function FreeTextStep({
  prompt,
  placeholder,
  value,
  onChange,
}: {
  prompt: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-sm text-ink-200">{prompt}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-2 w-full rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
      />
    </div>
  );
}

function BinaryStep({
  prompt,
  value,
  onChange,
}: {
  prompt: string;
  value?: "yes" | "no";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div>
      <p className="text-sm text-ink-200">{prompt}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className={`btn ${value === "no" ? "bg-flame text-ink-900" : "bg-ink-700 text-ink-100"}`}
          onClick={() => onChange("no")}
        >
          Just me
        </button>
        <button
          className={`btn ${value === "yes" ? "bg-flame text-ink-900" : "bg-ink-700 text-ink-100"}`}
          onClick={() => onChange("yes")}
        >
          A friend
        </button>
      </div>
    </div>
  );
}

function StakeStep({
  prompt,
  value,
  onChange,
}: {
  prompt: string;
  value?: number;
  onChange: (v: number) => void;
}) {
  const tier = value ? tierForStake(value) : null;
  const options = [500, 1000, 2000, 5000];
  return (
    <div>
      <p className="text-sm text-ink-200">{prompt}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            className={`btn ${value === opt ? "bg-flame text-ink-900" : "bg-ink-700 text-ink-100"}`}
            onClick={() => onChange(opt)}
          >
            {opt} SEK
            <span className="text-xs opacity-70 ml-1">{tierForStake(opt)}</span>
          </button>
        ))}
      </div>
      {tier && <p className="mt-2 text-xs text-ink-400">{tier} tier</p>}
    </div>
  );
}
