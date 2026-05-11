export type StakeTier = "Starter" | "Standard" | "Committed" | "All-in";

export type Domain =
  | "physical"
  | "mental"
  | "social"
  | "regulation"
  | "consistency";

export type BehaviorKey =
  // Physical
  | "gym_session"
  | "gym_session_hr"
  | "steps_7k"
  | "steps_10k"
  | "sport_session"
  | "sleep_7_9"
  // Mental & Learning
  | "swedish_study"
  | "reading_20"
  | "book_chapter"
  | "course_lesson"
  | "brain_dump"
  // Social & Engagement
  | "left_apartment_social"
  | "group_event"
  | "office_workday"
  | "personal_connect"
  // Self-Regulation
  | "home_cooked_meal"
  | "no_delivery_today"
  | "screen_free_hour"
  | "daily_plan_completed"
  | "no_impulse_today";

export interface BehaviorDefinition {
  key: BehaviorKey;
  domain: Exclude<Domain, "consistency">;
  label: string;
  points: number;
  notes: string;
  dailyCap?: number;
}

export interface DomainCap {
  domain: Exclude<Domain, "consistency">;
  monthlyCap: number;
}

export interface StakeTierConfig {
  tier: StakeTier;
  stakeSEK: number;
  maxRecoverableSEK: number;
  maxWithBonusesSEK: number;
}

export interface LoggedBehavior {
  id: string;
  userId: string;
  behavior: BehaviorKey;
  rawPoints: number;
  awardedPoints: number;
  multiplier: number;
  loggedAt: string;
  note?: string;
}

export interface DailyPlan {
  date: string;
  energy: 1 | 2 | 3 | 4 | 5;
  commitment: string;
  priorityActions: BehaviorKey[];
  distractionBlock?: { start: string; end: string };
  morningLoggedAt: string;
}

export interface EveningLog {
  date: string;
  didOneThing: "yes" | "partly" | "no";
  reflection: string;
  loggedAt: string;
}

export interface BrainDump {
  id: string;
  text: string;
  capturedAt: string;
  categorized?: BrainDumpCategorization;
}

export interface BrainDumpCategorization {
  actionItems: string[];
  curiosityQueue: string[];
  wishlist: string[];
  anxious: string[];
  summary: string;
}

export interface MonthlyState {
  monthKey: string;
  stakeSEK: number;
  tier: StakeTier;
  pointsEarned: number;
  pointsSpent: number;
  bonusPoints: number;
  charity: string;
}

export interface VaultItem {
  id: string;
  title: string;
  description: string;
  category: "travel" | "experience" | "learning" | "food" | "health" | "delivery" | "shopping";
  rate: "A" | "B" | "C";
  costSEK: number;
  imageHint: string;
}

export interface EngagementSignature {
  baselineEventsPerDay: number;
  last7DaysEventsPerDay: number;
  deltaPct: number;
  consecutiveLowDays: number;
  decayTier: 0 | 3 | 5 | 7 | 10;
}
