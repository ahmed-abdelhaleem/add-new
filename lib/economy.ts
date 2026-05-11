import type {
  BehaviorDefinition,
  BehaviorKey,
  Domain,
  DomainCap,
  StakeTier,
  StakeTierConfig,
} from "./types";

// PRD §4.1
export const STAKE_TIERS: Record<StakeTier, StakeTierConfig> = {
  Starter: { tier: "Starter", stakeSEK: 500, maxRecoverableSEK: 500, maxWithBonusesSEK: 750 },
  Standard: { tier: "Standard", stakeSEK: 1000, maxRecoverableSEK: 1000, maxWithBonusesSEK: 1600 },
  Committed: { tier: "Committed", stakeSEK: 2000, maxRecoverableSEK: 2000, maxWithBonusesSEK: 3400 },
  "All-in": { tier: "All-in", stakeSEK: 5000, maxRecoverableSEK: 5000, maxWithBonusesSEK: 9000 },
};

// PRD §4.2 — 100 points = 1 SEK
export const POINTS_PER_SEK = 100;
export const REDUCED_POINTS_PER_SEK = 180; // Category B (44% penalty)

// PRD §4.3 — Behavior catalog with point values
export const BEHAVIORS: BehaviorDefinition[] = [
  // Physical (max 35,000 pts/month)
  {
    key: "gym_session",
    domain: "physical",
    label: "Gym session (verified)",
    points: 2500,
    notes: "GPS + duration minimum 30 min",
  },
  {
    key: "gym_session_hr",
    domain: "physical",
    label: "Gym session with heart-rate data",
    points: 3200,
    notes: "Connected wearable bonus",
  },
  {
    key: "steps_7k",
    domain: "physical",
    label: "Walked 7,000+ steps",
    points: 800,
    notes: "Daily",
    dailyCap: 1,
  },
  {
    key: "steps_10k",
    domain: "physical",
    label: "Walked 10,000+ steps",
    points: 1400,
    notes: "Daily",
    dailyCap: 1,
  },
  {
    key: "sport_session",
    domain: "physical",
    label: "Tennis / sport session",
    points: 2800,
    notes: "Location verified",
  },
  {
    key: "sleep_7_9",
    domain: "physical",
    label: "Slept 7–9 hours",
    points: 600,
    notes: "Wearable or self-log",
    dailyCap: 1,
  },

  // Mental & Learning (max 25,000 pts/month)
  {
    key: "swedish_study",
    domain: "mental",
    label: "Swedish study, 20+ min",
    points: 1800,
    notes: "Integrates with Duolingo / SFI portal",
  },
  {
    key: "reading_20",
    domain: "mental",
    label: "Reading 20+ min (timer)",
    points: 900,
    notes: "Book, not phone",
  },
  {
    key: "book_chapter",
    domain: "mental",
    label: "Finished a book chapter",
    points: 2000,
    notes: "Brief summary to ACE required",
  },
  {
    key: "course_lesson",
    domain: "mental",
    label: "Online course lesson",
    points: 1200,
    notes: "Coursera / Duolingo integration",
  },
  {
    key: "brain_dump",
    domain: "mental",
    label: "Brain dump completed",
    points: 500,
    notes: "Daily cap: once",
    dailyCap: 1,
  },

  // Social & Engagement (max 20,000 pts/month)
  {
    key: "left_apartment_social",
    domain: "social",
    label: "Left apartment for a social activity",
    points: 2000,
    notes: "Location verified, not work",
  },
  {
    key: "group_event",
    domain: "social",
    label: "Attended a group / class / event",
    points: 2800,
    notes: "Calendar or ticket verification",
  },
  {
    key: "office_workday",
    domain: "social",
    label: "Office workday (4+ hrs)",
    points: 1500,
    notes: "Location verified",
  },
  {
    key: "personal_connect",
    domain: "social",
    label: "Connected with a person",
    points: 800,
    notes: "Phone log or calendar entry",
  },

  // Self-Regulation (max 15,000 pts/month)
  {
    key: "home_cooked_meal",
    domain: "regulation",
    label: "Home-cooked meal",
    points: 600,
    notes: "Self-log",
  },
  {
    key: "no_delivery_today",
    domain: "regulation",
    label: "No food delivery today",
    points: 700,
    notes: "Wolt / Foodora integration",
    dailyCap: 1,
  },
  {
    key: "screen_free_hour",
    domain: "regulation",
    label: "Screen-free hour (evening)",
    points: 500,
    notes: "Phone usage tracking",
    dailyCap: 1,
  },
  {
    key: "daily_plan_completed",
    domain: "regulation",
    label: "Completed daily plan",
    points: 1000,
    notes: "Morning + evening log",
    dailyCap: 1,
  },
  {
    key: "no_impulse_today",
    domain: "regulation",
    label: "No impulse purchase today",
    points: 400,
    notes: "Bank integration",
    dailyCap: 1,
  },
];

export const BEHAVIOR_INDEX: Record<BehaviorKey, BehaviorDefinition> = Object.fromEntries(
  BEHAVIORS.map((b) => [b.key, b])
) as Record<BehaviorKey, BehaviorDefinition>;

// PRD §4.3 — domain monthly caps
export const DOMAIN_CAPS: DomainCap[] = [
  { domain: "physical", monthlyCap: 35000 },
  { domain: "mental", monthlyCap: 25000 },
  { domain: "social", monthlyCap: 20000 },
  { domain: "regulation", monthlyCap: 15000 },
];

export const DOMAIN_CAP_INDEX: Record<Exclude<Domain, "consistency">, number> = Object.fromEntries(
  DOMAIN_CAPS.map((d) => [d.domain, d.monthlyCap])
) as Record<Exclude<Domain, "consistency">, number>;

// PRD §4.3 Domain 5 — streak multipliers
export interface StreakRule {
  days: number;
  multiplier: number;
}

export const STREAK_RULES: StreakRule[] = [
  { days: 7, multiplier: 1.2 },
  { days: 14, multiplier: 1.4 },
  { days: 21, multiplier: 1.6 },
];

export const MONTH_BONUSES = {
  monthCompletedAnyStreak: 10000,
  monthCompletedNoZeroDays: 25000,
};

// Anti-gaming: manual step entries capped at 500 pts/day (PRD §7).
export const MANUAL_STEPS_DAILY_CAP_POINTS = 500;

// PRD §7 — comeback bonus once per 14-day period
export const COMEBACK_BONUS_COOLDOWN_DAYS = 14;
export const COMEBACK_BONUS_MULTIPLIER = 3;
