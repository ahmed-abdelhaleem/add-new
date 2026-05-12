export type StakeTier = "Starter" | "Standard" | "Committed" | "All-in";

export type Domain =
  | "physical"
  | "mental"
  | "social"
  | "regulation"
  | "foundation"
  | "nourish"
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
  | "no_delivery_today"
  | "screen_free_hour"
  | "daily_plan_completed"
  | "no_impulse_today"
  // Foundation Mode (active only when Foundation Mode is on)
  | "trigger_logged"
  | "redirect_completed"
  | "readiness_score_weekly"
  | "foundation_month_complete"
  // NourishPlan
  | "meal_plan_created"
  | "shopped_as_planned"
  | "ate_as_planned"
  | "meal_streak_3"
  | "meal_streak_7"
  | "home_cooked_meal";

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
  distractionBlock?: { start: string; end: string; completed?: boolean };
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

export interface OnboardingAnswers {
  collapsePattern: string;
  bestWeek: string;
  energyWindow: string;
  aspiration: string;
  involvePartner: "yes" | "no";
  stakeSEK: number;
  charity: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  title: string;
  url?: string;
  category: "travel" | "experience" | "learning" | "food" | "health" | "delivery" | "shopping";
  costSEK: number;
  rate: "A" | "B" | "C";
  addedAt: string;
  cooledUntil: string;
  redeemedAt?: string;
  source: "brain_dump" | "share" | "manual";
}

export interface CuriosityItem {
  id: string;
  text: string;
  addedAt: string;
  resolvedAt?: string;
  source: "brain_dump" | "manual";
}

export interface ActionItem {
  id: string;
  text: string;
  addedAt: string;
  doneAt?: string;
  source: "brain_dump" | "manual";
}

export interface MoodLog {
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export interface MedicationLog {
  date: string;
  taken: boolean;
  note?: string;
}

export interface AccountabilityPartner {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  createdAt: string;
}

export interface PartnerBoost {
  id: string;
  partnerId: string;
  awardedPoints: number;
  message?: string;
  sentAt: string;
}

export type BonusEventKind =
  | "double_hour"
  | "challenge_drop"
  | "seasonal"
  | "rescue_week"
  | "track_bonus";

export interface BonusEvent {
  id: string;
  userId: string;
  kind: BonusEventKind;
  payload: BonusEventPayload;
  startsAt: string;
  endsAt: string;
  completedAt?: string;
  awardedPoints?: number;
}

export type BonusEventPayload =
  | { kind: "double_hour"; multiplier: number }
  | { kind: "challenge_drop"; description: string; bonusPoints: number; behavior?: BehaviorKey }
  | { kind: "seasonal"; seasonKey: string; description: string; behaviorMultiplier: number }
  | { kind: "rescue_week"; multiplier: number; reduceTo: number }
  | { kind: "track_bonus"; trackKey: string; multiplier: number };

export interface ChallengeTrack {
  key: string;
  title: string;
  description: string;
  behaviors: BehaviorKey[];
  durationDays: number;
  trackMultiplier: number;
}

export interface TrackEnrollment {
  id: string;
  userId: string;
  trackKey: string;
  enrolledAt: string;
  endsAt: string;
  completedAt?: string;
}

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  bonusPoints: number;
  participants: number;
}

export interface Payment {
  id: string;
  userId: string;
  amountSEK: number;
  kind: "stake_charge" | "disbursement" | "refund";
  provider: "swish" | "stripe" | "bank";
  status: "pending" | "succeeded" | "failed";
  externalId?: string;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  userId: string;
  merchant: string;
  category: "delivery" | "gambling" | "fast_fashion" | "alcohol" | "groceries" | "other";
  amountSEK: number;
  detectedAt: string;
  intercepted: boolean;
  cancelled: boolean;
  status: "detected" | "confirmed" | "cancelled" | "ignored";
}

export interface HealthSample {
  id: string;
  userId: string;
  kind: "steps" | "sleep" | "hr" | "workout";
  value: number;
  unit: string;
  sampledAt: string;
  source: "apple_health" | "google_fit" | "garmin" | "fitbit" | "manual";
}

export interface MonthlyReport {
  monthKey: string;
  content: string;
  generatedAt: string;
}

export interface AccountabilityCall {
  id: string;
  startedAt: string;
  endedAt?: string;
  transcript: Array<{ role: "user" | "ace"; text: string; at: string }>;
  awardedPoints: number;
}

export interface CharityDisbursement {
  id: string;
  monthKey: string;
  amountSEK: number;
  charity: string;
  status: "pending" | "sent" | "failed";
  createdAt: string;
}

export interface LevelInfo {
  level: number;
  lifetimePoints: number;
  nextLevelAt: number;
  pctToNext: number;
  unlockedAt: string[];
}

// ── Foundation Mode (PRD §5 Feature 10) ─────────────────────────────

export interface FoundationModeState {
  userId: string;
  activatedAt: string;
  durationDays: number; // default 180
  commitment: string;
  originalStakeSEK: number;
  surchargeSEK: number; // typically +500
  deactivationStartedAt: string | null;
  deactivatedAt: string | null;
}

export type TriggerEmotion = "boredom" | "loneliness" | "restlessness" | "anxious" | "stressed" | "other";

export interface TriggerLog {
  id: string;
  loggedAt: string;
  emotionUnderneath: TriggerEmotion | null;
  energyLevel: number | null;
  redirectChosen: string | null;
  redirectCompletedAt: string | null;
}

export type ReadinessPhase = "Foundation" | "Building" | "Momentum" | "Ready";

export interface ReadinessScore {
  weekKey: string;
  physical: number;
  mental: number;
  social: number;
  regulation: number;
  total: number;
  phase: ReadinessPhase;
  computedAt: string;
}

export interface RedirectOption {
  key: string;
  label: string;
  bonusPoints: number;
  timeWindow: "morning" | "afternoon" | "evening" | "late_night" | "any";
  energy: "low" | "mid" | "high" | "any";
}

// ── NourishPlan (PRD §5 Feature 11) ────────────────────────────────

export type MealSlot = "breakfast" | "lunch" | "dinner";
export type EnergyForecast = "low" | "medium" | "high";

export interface MealOption {
  id: string;
  name: string;
  slot: MealSlot;
  prepMinutes: number;
  ingredientCount: number;
  energyRequired: EnergyForecast;
  ingredients: string[];
  dealTag?: string;
  section?: "produce" | "meat" | "dairy" | "frozen" | "bakery" | "drygoods";
}

export interface MealPlan {
  id: string;
  userId: string;
  date: string;
  energyForecast: EnergyForecast;
  breakfastId: string;
  lunchId: string;
  dinnerId: string;
  createdAt: string;
}

export interface MealLog {
  date: string;
  slot: MealSlot;
  ateAsPlanned: boolean | null;
  deliveryOrdered: boolean;
  loggedAt: string;
}

export interface ShoppingList {
  id: string;
  userId: string;
  planId: string;
  items: ShoppingListItem[];
  createdAt: string;
  sentTo: "ica" | "coop" | "mathem" | null;
  sentAt: string | null;
}

export interface ShoppingListItem {
  name: string;
  section: string;
  checked: boolean;
}

export interface PantryItem {
  name: string;
  addedAt: string;
}

export interface WeeklyDeal {
  store: "ica" | "coop" | "lidl" | "willys";
  item: string;
  priceSEK: number;
  weekKey: string;
}

// ── Notifications (PRD §7) ─────────────────────────────────────────

export type NotificationType = "anchor" | "moment" | "surprise" | "rescue";

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  sentAt: string;
  openedAt: string | null;
  dismissedAt: string | null;
  payload: Record<string, unknown> | null;
}

export interface NotificationPrefs {
  anchorEnabled: boolean;
  anchorTimeHHMM: string;
  momentsEnabled: boolean;
  surprisesEnabled: boolean;
  rescueEnabled: boolean;
}

// ── Memory Gallery (PRD §5 Feature 6) ──────────────────────────────

export interface MemoryCard {
  id: string;
  itemId: string;
  title: string;
  caption: string;
  monthKey: string;
  imageHint: string;
  redeemedAt: string;
}

// ── Live Feed ──────────────────────────────────────────────────────

export interface FeedItem {
  id: string;
  kind: "behavior" | "redemption" | "streak" | "event" | "level" | "deal";
  text: string;
  at: string;
  pointsDelta?: number;
}
