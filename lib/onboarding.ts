import type { OnboardingAnswers, StakeTier } from "./types";

// PRD §9 — exactly seven questions, conversational, charity last.
export const ONBOARDING_QUESTIONS = [
  {
    key: "collapsePattern",
    prompt: "What's the one thing you've tried to build that always eventually collapses?",
    placeholder: "Be specific — gym routine, study habit, side project…",
  },
  {
    key: "bestWeek",
    prompt: "What does your best week look like?",
    placeholder: "A typical good week from the past year.",
  },
  {
    key: "energyWindow",
    prompt: "What time of day do you have the most energy?",
    placeholder: "Early morning, late morning, afternoon, evening…",
  },
  {
    key: "aspiration",
    prompt: "What's something you want to do or experience that feels out of reach right now?",
    placeholder: "Trip, skill, conversation, event.",
  },
  {
    key: "involvePartner",
    prompt: "Do you want someone else involved, or just you and the app?",
    placeholder: "Just me / Yes — a friend",
    binary: true,
  },
  {
    key: "stakeSEK",
    prompt: "What's the highest monthly stake you'd set if you were being serious?",
    placeholder: "500 / 1,000 / 2,000 / 5,000 SEK",
    numeric: true,
  },
  {
    key: "charity",
    prompt: "What charity should get your money if you don't earn it back?",
    placeholder: "e.g. Läkare Utan Gränser",
  },
] as const;

export type OnboardingQuestionKey = (typeof ONBOARDING_QUESTIONS)[number]["key"];

export function tierForStake(stakeSEK: number): StakeTier {
  if (stakeSEK >= 5000) return "All-in";
  if (stakeSEK >= 2000) return "Committed";
  if (stakeSEK >= 1000) return "Standard";
  return "Starter";
}

// PRD §9 step 5: first 7 days earn at 1.5×, no stake charged.
export function firstWeekBonusUntil(start: Date = new Date()): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

export function isInFirstWeek(firstWeekBonusUntil: string | null, now: Date = new Date()): boolean {
  if (!firstWeekBonusUntil) return false;
  return new Date(firstWeekBonusUntil).getTime() > now.getTime();
}

export const FIRST_WEEK_MULTIPLIER = 1.5;

export function validateAnswers(a: Partial<OnboardingAnswers>): string | null {
  if (!a.collapsePattern) return "Tell me the pattern you'd most like to break.";
  if (!a.bestWeek) return "Describe your best week.";
  if (!a.energyWindow) return "Pick an energy window.";
  if (!a.aspiration) return "What's the thing you want?";
  if (!a.involvePartner) return "Pick: just you, or with someone.";
  if (!a.stakeSEK || a.stakeSEK < 100) return "Stake must be at least 100 SEK.";
  if (!a.charity) return "Charity is the last question. It must be answered last.";
  return null;
}
