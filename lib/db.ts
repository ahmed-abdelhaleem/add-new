import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type {
  AccountabilityCall,
  AccountabilityPartner,
  ActionItem,
  BankTransaction,
  BonusEvent,
  BonusEventKind,
  BonusEventPayload,
  BrainDump,
  BrainDumpCategorization,
  CharityDisbursement,
  CommunityChallenge,
  CuriosityItem,
  DailyPlan,
  EveningLog,
  FoundationModeState,
  HealthSample,
  LoggedBehavior,
  MealLog,
  MealPlan,
  MedicationLog,
  MemoryCard,
  MonthlyReport,
  MonthlyState,
  MoodLog,
  NotificationPrefs,
  NotificationRecord,
  NotificationType,
  OnboardingAnswers,
  PantryItem,
  PartnerBoost,
  Payment,
  ReadinessScore,
  ShoppingList,
  StakeTier,
  TrackEnrollment,
  TriggerLog,
  WishlistItem,
} from "./types";

let _db: Database.Database | null = null;

function dbPath(): string {
  return resolve(process.cwd(), process.env.MOMENTUM_DB_PATH || "momentum.db");
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedIfEmpty(db);
  _db = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      stake_sek INTEGER NOT NULL,
      charity TEXT NOT NULL,
      created_at TEXT NOT NULL,
      onboarded_at TEXT,
      onboarding_answers TEXT,
      first_week_bonus_until TEXT,
      total_lifetime_points INTEGER NOT NULL DEFAULT 0,
      partner_id TEXT,
      health_provider TEXT,
      bank_connected INTEGER NOT NULL DEFAULT 0,
      payment_connected INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS behaviors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      behavior TEXT NOT NULL,
      raw_points INTEGER NOT NULL,
      awarded_points INTEGER NOT NULL,
      multiplier REAL NOT NULL,
      logged_at TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_behaviors_user_logged ON behaviors(user_id, logged_at);

    CREATE TABLE IF NOT EXISTS daily_plans (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      energy INTEGER NOT NULL,
      commitment TEXT NOT NULL,
      priority_actions TEXT NOT NULL,
      distraction_block TEXT,
      morning_logged_at TEXT NOT NULL,
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS evening_logs (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      did_one_thing TEXT NOT NULL,
      reflection TEXT NOT NULL,
      logged_at TEXT NOT NULL,
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS brain_dumps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      categorized TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_brain_dumps_user ON brain_dumps(user_id, captured_at);

    CREATE TABLE IF NOT EXISTS monthly_state (
      user_id TEXT NOT NULL,
      month_key TEXT NOT NULL,
      stake_sek INTEGER NOT NULL,
      tier TEXT NOT NULL,
      points_earned INTEGER NOT NULL DEFAULT 0,
      points_spent INTEGER NOT NULL DEFAULT 0,
      bonus_points INTEGER NOT NULL DEFAULT 0,
      charity TEXT NOT NULL,
      comeback_last_used TEXT,
      PRIMARY KEY (user_id, month_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      points_spent INTEGER NOT NULL,
      sek_value REAL NOT NULL,
      rate TEXT NOT NULL,
      redeemed_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ace_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_ace_messages_user ON ace_messages(user_id, created_at);

    CREATE TABLE IF NOT EXISTS wishlist (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      category TEXT NOT NULL,
      cost_sek INTEGER NOT NULL,
      rate TEXT NOT NULL,
      added_at TEXT NOT NULL,
      cooled_until TEXT NOT NULL,
      redeemed_at TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS curiosity_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      added_at TEXT NOT NULL,
      resolved_at TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      added_at TEXT NOT NULL,
      done_at TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS mood_logs (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      mood INTEGER NOT NULL,
      note TEXT,
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      taken INTEGER NOT NULL,
      note TEXT,
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS partner_boosts (
      id TEXT PRIMARY KEY,
      partner_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      awarded_points INTEGER NOT NULL,
      message TEXT,
      sent_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (partner_id) REFERENCES partners(id)
    );

    CREATE TABLE IF NOT EXISTS bonus_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      completed_at TEXT,
      awarded_points INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_bonus_events_user ON bonus_events(user_id, starts_at);

    CREATE TABLE IF NOT EXISTS track_enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      track_key TEXT NOT NULL,
      enrolled_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS community_challenges (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      bonus_points INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS community_participations (
      challenge_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      enrolled_at TEXT NOT NULL,
      PRIMARY KEY (challenge_id, user_id),
      FOREIGN KEY (challenge_id) REFERENCES community_challenges(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount_sek INTEGER NOT NULL,
      kind TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      external_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      merchant TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_sek INTEGER NOT NULL,
      detected_at TEXT NOT NULL,
      intercepted INTEGER NOT NULL DEFAULT 0,
      cancelled INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS health_samples (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      sampled_at TEXT NOT NULL,
      source TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_health_user_kind ON health_samples(user_id, kind, sampled_at);

    CREATE TABLE IF NOT EXISTS monthly_reports (
      user_id TEXT NOT NULL,
      month_key TEXT NOT NULL,
      content TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, month_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS accountability_calls (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      transcript TEXT NOT NULL,
      awarded_points INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS charity_disbursements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      month_key TEXT NOT NULL,
      amount_sek REAL NOT NULL,
      charity TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Foundation Mode (PRD §5 Feature 10)
    CREATE TABLE IF NOT EXISTS foundation_mode (
      user_id TEXT PRIMARY KEY,
      activated_at TEXT NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 180,
      commitment TEXT NOT NULL,
      original_stake_sek INTEGER NOT NULL,
      surcharge_sek INTEGER NOT NULL DEFAULT 500,
      deactivation_started_at TEXT,
      deactivated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS trigger_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      logged_at TEXT NOT NULL,
      emotion_underneath TEXT,
      energy_level INTEGER,
      redirect_chosen TEXT,
      redirect_completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_trigger_logs_user ON trigger_logs(user_id, logged_at);

    CREATE TABLE IF NOT EXISTS readiness_scores (
      user_id TEXT NOT NULL,
      week_key TEXT NOT NULL,
      physical REAL NOT NULL,
      mental REAL NOT NULL,
      social REAL NOT NULL,
      regulation REAL NOT NULL,
      total REAL NOT NULL,
      phase TEXT NOT NULL,
      computed_at TEXT NOT NULL,
      PRIMARY KEY (user_id, week_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- NourishPlan (PRD §5 Feature 11)
    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      energy_forecast TEXT NOT NULL,
      breakfast_id TEXT NOT NULL,
      lunch_id TEXT NOT NULL,
      dinner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);

    CREATE TABLE IF NOT EXISTS meal_logs (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      slot TEXT NOT NULL,
      ate_as_planned INTEGER,
      delivery_ordered INTEGER NOT NULL DEFAULT 0,
      logged_at TEXT NOT NULL,
      PRIMARY KEY (user_id, date, slot),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS shopping_lists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      items TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sent_to TEXT,
      sent_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS pantry (
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      added_at TEXT NOT NULL,
      PRIMARY KEY (user_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Notifications (PRD §7)
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      opened_at TEXT,
      dismissed_at TEXT,
      payload TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, sent_at);

    CREATE TABLE IF NOT EXISTS notification_prefs (
      user_id TEXT PRIMARY KEY,
      anchor_enabled INTEGER NOT NULL DEFAULT 1,
      anchor_time TEXT NOT NULL DEFAULT '08:30',
      moments_enabled INTEGER NOT NULL DEFAULT 1,
      surprises_enabled INTEGER NOT NULL DEFAULT 1,
      rescue_enabled INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Memory Gallery (PRD §5 Feature 6)
    CREATE TABLE IF NOT EXISTS memory_gallery (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      title TEXT NOT NULL,
      caption TEXT NOT NULL,
      month_key TEXT NOT NULL,
      image_hint TEXT NOT NULL,
      redeemed_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

function seedIfEmpty(db: Database.Database) {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c > 0) return;

  // PRD §3 — primary user profile. Pre-seed a single demo user so the prototype
  // is usable without running through onboarding every time.
  const userId = "user_demo";
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, name, tier, stake_sek, charity, created_at, onboarded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, "Saeed", "Standard", 1000, "Läkare Utan Gränser", now, now);

  const monthKey = now.slice(0, 7);
  db.prepare(
    `INSERT INTO monthly_state (user_id, month_key, stake_sek, tier, charity)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, monthKey, 1000, "Standard", "Läkare Utan Gränser");

  // Seed a few community challenges so the page isn't empty.
  const seedChallenge = (id: string, title: string, description: string, startOffset: number, days: number, bonus: number) => {
    const start = new Date();
    start.setDate(start.getDate() + startOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    db.prepare(
      `INSERT INTO community_challenges (id, title, description, starts_at, ends_at, bonus_points)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, title, description, start.toISOString(), end.toISOString(), bonus);
  };
  seedChallenge(
    "cc_feb_consistency",
    "Stockholm Consistency Sprint",
    "100 users, top 20 earn 50,000 bonus pts. Anonymous leaderboard.",
    -3,
    30,
    50000
  );
  seedChallenge(
    "cc_outdoor",
    "March Outdoor Month",
    "Any outdoor behavior scores 2× for the month. Opt-in.",
    -1,
    30,
    20000
  );
}

export const DEMO_USER_ID = "user_demo";

export interface UserRow {
  id: string;
  name: string;
  tier: StakeTier;
  stake_sek: number;
  charity: string;
  created_at: string;
  onboarded_at: string | null;
  onboarding_answers: string | null;
  first_week_bonus_until: string | null;
  total_lifetime_points: number;
  partner_id: string | null;
  health_provider: string | null;
  bank_connected: number;
  payment_connected: number;
}

export function getUser(userId: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;
}

export function updateUser(userId: string, patch: Partial<{
  name: string;
  tier: StakeTier;
  stake_sek: number;
  charity: string;
  onboarded_at: string;
  onboarding_answers: OnboardingAnswers;
  first_week_bonus_until: string;
  partner_id: string | null;
  health_provider: string | null;
  bank_connected: boolean;
  payment_connected: boolean;
}>) {
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (k === "onboarding_answers") {
      fields.push(`${k} = ?`);
      values.push(JSON.stringify(v));
    } else if (k === "bank_connected" || k === "payment_connected") {
      fields.push(`${k} = ?`);
      values.push(v ? 1 : 0);
    } else {
      fields.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (fields.length === 0) return;
  values.push(userId);
  getDb().prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...(values as never[]));
}

export function addLifetimePoints(userId: string, points: number) {
  if (points <= 0) return;
  getDb()
    .prepare(`UPDATE users SET total_lifetime_points = total_lifetime_points + ? WHERE id = ?`)
    .run(points, userId);
}

export function listBehaviorsForMonth(userId: string, monthKey: string): LoggedBehavior[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id as userId, behavior, raw_points as rawPoints,
              awarded_points as awardedPoints, multiplier, logged_at as loggedAt, note
         FROM behaviors WHERE user_id = ? AND substr(logged_at, 1, 7) = ?
        ORDER BY logged_at ASC`
    )
    .all(userId, monthKey) as LoggedBehavior[];
  return rows;
}

export function listBehaviorsAll(userId: string): LoggedBehavior[] {
  return getDb()
    .prepare(
      `SELECT id, user_id as userId, behavior, raw_points as rawPoints,
              awarded_points as awardedPoints, multiplier, logged_at as loggedAt, note
         FROM behaviors WHERE user_id = ? ORDER BY logged_at ASC`
    )
    .all(userId) as LoggedBehavior[];
}

export function insertBehavior(b: LoggedBehavior) {
  getDb()
    .prepare(
      `INSERT INTO behaviors (id, user_id, behavior, raw_points, awarded_points, multiplier, logged_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(b.id, b.userId, b.behavior, b.rawPoints, b.awardedPoints, b.multiplier, b.loggedAt, b.note ?? null);
  addLifetimePoints(b.userId, b.awardedPoints);
}

export function getMonthlyState(userId: string, monthKey: string): MonthlyState | undefined {
  const row = getDb()
    .prepare(
      `SELECT month_key as monthKey, stake_sek as stakeSEK, tier,
              points_earned as pointsEarned, points_spent as pointsSpent,
              bonus_points as bonusPoints, charity
         FROM monthly_state WHERE user_id = ? AND month_key = ?`
    )
    .get(userId, monthKey) as MonthlyState | undefined;
  return row;
}

export function ensureMonthlyState(userId: string, monthKey: string): MonthlyState {
  const existing = getMonthlyState(userId, monthKey);
  if (existing) return existing;
  const user = getUser(userId);
  if (!user) throw new Error(`User ${userId} not found`);
  getDb()
    .prepare(
      `INSERT INTO monthly_state (user_id, month_key, stake_sek, tier, charity)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(userId, monthKey, user.stake_sek, user.tier, user.charity);
  return getMonthlyState(userId, monthKey)!;
}

export function recordEarn(userId: string, monthKey: string, points: number) {
  ensureMonthlyState(userId, monthKey);
  getDb()
    .prepare(
      `UPDATE monthly_state SET points_earned = points_earned + ?
       WHERE user_id = ? AND month_key = ?`
    )
    .run(points, userId, monthKey);
}

export function recordSpend(userId: string, monthKey: string, points: number) {
  ensureMonthlyState(userId, monthKey);
  getDb()
    .prepare(
      `UPDATE monthly_state SET points_spent = points_spent + ?
       WHERE user_id = ? AND month_key = ?`
    )
    .run(points, userId, monthKey);
}

export function recordBonus(userId: string, monthKey: string, points: number) {
  ensureMonthlyState(userId, monthKey);
  getDb()
    .prepare(
      `UPDATE monthly_state SET bonus_points = bonus_points + ?, points_earned = points_earned + ?
       WHERE user_id = ? AND month_key = ?`
    )
    .run(points, points, userId, monthKey);
  addLifetimePoints(userId, points);
}

export function isComebackOnCooldown(userId: string, monthKey: string, now: Date): boolean {
  const row = getDb()
    .prepare(
      `SELECT comeback_last_used FROM monthly_state WHERE user_id = ? AND month_key = ?`
    )
    .get(userId, monthKey) as { comeback_last_used: string | null } | undefined;
  if (!row?.comeback_last_used) return false;
  const last = new Date(row.comeback_last_used).getTime();
  const days = (now.getTime() - last) / (1000 * 60 * 60 * 24);
  return days < 14;
}

export function markComebackUsed(userId: string, monthKey: string, at: Date) {
  getDb()
    .prepare(
      `UPDATE monthly_state SET comeback_last_used = ?
       WHERE user_id = ? AND month_key = ?`
    )
    .run(at.toISOString(), userId, monthKey);
}

export function upsertDailyPlan(userId: string, plan: DailyPlan) {
  getDb()
    .prepare(
      `INSERT INTO daily_plans (user_id, date, energy, commitment, priority_actions, distraction_block, morning_logged_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
         energy = excluded.energy,
         commitment = excluded.commitment,
         priority_actions = excluded.priority_actions,
         distraction_block = excluded.distraction_block,
         morning_logged_at = excluded.morning_logged_at`
    )
    .run(
      userId,
      plan.date,
      plan.energy,
      plan.commitment,
      JSON.stringify(plan.priorityActions),
      plan.distractionBlock ? JSON.stringify(plan.distractionBlock) : null,
      plan.morningLoggedAt
    );
}

export function getDailyPlan(userId: string, date: string): DailyPlan | undefined {
  const row = getDb()
    .prepare(`SELECT * FROM daily_plans WHERE user_id = ? AND date = ?`)
    .get(userId, date) as
    | {
        date: string;
        energy: number;
        commitment: string;
        priority_actions: string;
        distraction_block: string | null;
        morning_logged_at: string;
      }
    | undefined;
  if (!row) return undefined;
  return {
    date: row.date,
    energy: row.energy as DailyPlan["energy"],
    commitment: row.commitment,
    priorityActions: JSON.parse(row.priority_actions),
    distractionBlock: row.distraction_block ? JSON.parse(row.distraction_block) : undefined,
    morningLoggedAt: row.morning_logged_at,
  };
}

export function upsertEveningLog(userId: string, log: EveningLog) {
  getDb()
    .prepare(
      `INSERT INTO evening_logs (user_id, date, did_one_thing, reflection, logged_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
         did_one_thing = excluded.did_one_thing,
         reflection = excluded.reflection,
         logged_at = excluded.logged_at`
    )
    .run(userId, log.date, log.didOneThing, log.reflection, log.loggedAt);
}

export function getEveningLog(userId: string, date: string): EveningLog | undefined {
  const row = getDb()
    .prepare(`SELECT * FROM evening_logs WHERE user_id = ? AND date = ?`)
    .get(userId, date) as
    | { date: string; did_one_thing: EveningLog["didOneThing"]; reflection: string; logged_at: string }
    | undefined;
  if (!row) return undefined;
  return {
    date: row.date,
    didOneThing: row.did_one_thing,
    reflection: row.reflection,
    loggedAt: row.logged_at,
  };
}

export function insertBrainDump(userId: string, dump: BrainDump) {
  getDb()
    .prepare(
      `INSERT INTO brain_dumps (id, user_id, text, captured_at, categorized)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(dump.id, userId, dump.text, dump.capturedAt, dump.categorized ? JSON.stringify(dump.categorized) : null);
}

export function updateBrainDumpCategorization(id: string, cat: BrainDumpCategorization) {
  getDb().prepare(`UPDATE brain_dumps SET categorized = ? WHERE id = ?`).run(JSON.stringify(cat), id);
}

export function listBrainDumps(userId: string, limit = 20): BrainDump[] {
  const rows = getDb()
    .prepare(
      `SELECT id, text, captured_at as capturedAt, categorized
         FROM brain_dumps WHERE user_id = ? ORDER BY captured_at DESC LIMIT ?`
    )
    .all(userId, limit) as Array<{
    id: string;
    text: string;
    capturedAt: string;
    categorized: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    capturedAt: r.capturedAt,
    categorized: r.categorized ? JSON.parse(r.categorized) : undefined,
  }));
}

export interface AceMessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function insertAceMessage(userId: string, role: "user" | "assistant", content: string) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO ace_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, userId, role, content, createdAt);
  return { id, role, content, created_at: createdAt };
}

export function listAceMessages(userId: string, limit = 50): AceMessageRow[] {
  return getDb()
    .prepare(
      `SELECT id, role, content, created_at FROM ace_messages
        WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit) as AceMessageRow[];
}

export function insertRedemption(opts: {
  userId: string;
  itemId: string;
  pointsSpent: number;
  sekValue: number;
  rate: "A" | "B";
}) {
  const id = randomUUID();
  const at = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO redemptions (id, user_id, item_id, points_spent, sek_value, rate, redeemed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, opts.userId, opts.itemId, opts.pointsSpent, opts.sekValue, opts.rate, at);
  return id;
}

// ── Wishlist ────────────────────────────────────────────────────────

export function insertWishlistItem(item: WishlistItem) {
  getDb()
    .prepare(
      `INSERT INTO wishlist (id, user_id, title, url, category, cost_sek, rate, added_at, cooled_until, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      item.id,
      item.userId,
      item.title,
      item.url ?? null,
      item.category,
      item.costSEK,
      item.rate,
      item.addedAt,
      item.cooledUntil,
      item.source
    );
}

export function listWishlist(userId: string): WishlistItem[] {
  return getDb()
    .prepare(
      `SELECT id, user_id as userId, title, url, category, cost_sek as costSEK, rate,
              added_at as addedAt, cooled_until as cooledUntil, redeemed_at as redeemedAt, source
         FROM wishlist WHERE user_id = ? ORDER BY added_at DESC`
    )
    .all(userId) as WishlistItem[];
}

export function markWishlistRedeemed(id: string) {
  getDb().prepare(`UPDATE wishlist SET redeemed_at = ? WHERE id = ?`).run(new Date().toISOString(), id);
}

export function deleteWishlistItem(id: string, userId: string) {
  getDb().prepare(`DELETE FROM wishlist WHERE id = ? AND user_id = ?`).run(id, userId);
}

// ── Curiosity Queue ─────────────────────────────────────────────────

export function insertCuriosity(userId: string, text: string, source: CuriosityItem["source"] = "manual"): CuriosityItem {
  const id = randomUUID();
  const at = new Date().toISOString();
  getDb()
    .prepare(`INSERT INTO curiosity_queue (id, user_id, text, added_at, source) VALUES (?, ?, ?, ?, ?)`)
    .run(id, userId, text, at, source);
  return { id, text, addedAt: at, source };
}

export function listCuriosity(userId: string): CuriosityItem[] {
  return getDb()
    .prepare(
      `SELECT id, text, added_at as addedAt, resolved_at as resolvedAt, source
         FROM curiosity_queue WHERE user_id = ? ORDER BY added_at DESC`
    )
    .all(userId) as CuriosityItem[];
}

export function resolveCuriosity(id: string, userId: string) {
  getDb()
    .prepare(`UPDATE curiosity_queue SET resolved_at = ? WHERE id = ? AND user_id = ?`)
    .run(new Date().toISOString(), id, userId);
}

// ── Action Items ────────────────────────────────────────────────────

export function insertActionItem(userId: string, text: string, source: ActionItem["source"] = "manual"): ActionItem {
  const id = randomUUID();
  const at = new Date().toISOString();
  getDb()
    .prepare(`INSERT INTO action_items (id, user_id, text, added_at, source) VALUES (?, ?, ?, ?, ?)`)
    .run(id, userId, text, at, source);
  return { id, text, addedAt: at, source };
}

export function listActionItems(userId: string): ActionItem[] {
  return getDb()
    .prepare(
      `SELECT id, text, added_at as addedAt, done_at as doneAt, source
         FROM action_items WHERE user_id = ? ORDER BY added_at DESC`
    )
    .all(userId) as ActionItem[];
}

export function completeActionItem(id: string, userId: string) {
  getDb()
    .prepare(`UPDATE action_items SET done_at = ? WHERE id = ? AND user_id = ?`)
    .run(new Date().toISOString(), id, userId);
}

// ── Mood ────────────────────────────────────────────────────────────

export function upsertMood(userId: string, log: MoodLog) {
  getDb()
    .prepare(
      `INSERT INTO mood_logs (user_id, date, mood, note) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET mood = excluded.mood, note = excluded.note`
    )
    .run(userId, log.date, log.mood, log.note ?? null);
}

export function listMood(userId: string): MoodLog[] {
  return getDb()
    .prepare(`SELECT date, mood, note FROM mood_logs WHERE user_id = ? ORDER BY date ASC`)
    .all(userId) as MoodLog[];
}

// ── Medication ──────────────────────────────────────────────────────

export function upsertMedication(userId: string, log: MedicationLog) {
  getDb()
    .prepare(
      `INSERT INTO medication_logs (user_id, date, taken, note) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET taken = excluded.taken, note = excluded.note`
    )
    .run(userId, log.date, log.taken ? 1 : 0, log.note ?? null);
}

export function listMedication(userId: string): MedicationLog[] {
  const rows = getDb()
    .prepare(`SELECT date, taken, note FROM medication_logs WHERE user_id = ? ORDER BY date ASC`)
    .all(userId) as Array<{ date: string; taken: number; note: string | null }>;
  return rows.map((r) => ({ date: r.date, taken: r.taken === 1, note: r.note ?? undefined }));
}

// ── Partners ────────────────────────────────────────────────────────

export function insertPartner(userId: string, name: string, email: string): AccountabilityPartner {
  const id = randomUUID();
  const at = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO partners (id, user_id, name, email, verified, created_at) VALUES (?, ?, ?, ?, 0, ?)`
    )
    .run(id, userId, name, email, at);
  updateUser(userId, { partner_id: id });
  return { id, name, email, verified: false, createdAt: at };
}

export function verifyPartner(id: string) {
  getDb().prepare(`UPDATE partners SET verified = 1 WHERE id = ?`).run(id);
}

export function getPartner(userId: string): AccountabilityPartner | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, name, email, verified, created_at as createdAt FROM partners WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(userId) as
    | { id: string; name: string; email: string; verified: number; createdAt: string }
    | undefined;
  if (!row) return undefined;
  return { id: row.id, name: row.name, email: row.email, verified: row.verified === 1, createdAt: row.createdAt };
}

export function removePartner(userId: string) {
  getDb().prepare(`DELETE FROM partners WHERE user_id = ?`).run(userId);
  updateUser(userId, { partner_id: null });
}

export function insertPartnerBoost(opts: {
  partnerId: string;
  userId: string;
  awardedPoints: number;
  message?: string;
}): PartnerBoost {
  const id = randomUUID();
  const at = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO partner_boosts (id, partner_id, user_id, awarded_points, message, sent_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, opts.partnerId, opts.userId, opts.awardedPoints, opts.message ?? null, at);
  return { id, partnerId: opts.partnerId, awardedPoints: opts.awardedPoints, message: opts.message, sentAt: at };
}

export function listPartnerBoosts(userId: string): PartnerBoost[] {
  return getDb()
    .prepare(
      `SELECT id, partner_id as partnerId, awarded_points as awardedPoints, message, sent_at as sentAt
         FROM partner_boosts WHERE user_id = ? ORDER BY sent_at DESC`
    )
    .all(userId) as PartnerBoost[];
}

// ── Bonus events ────────────────────────────────────────────────────

export function insertBonusEvent(opts: {
  userId: string;
  kind: BonusEventKind;
  payload: BonusEventPayload;
  startsAt: string;
  endsAt: string;
}): BonusEvent {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO bonus_events (id, user_id, kind, payload, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, opts.userId, opts.kind, JSON.stringify(opts.payload), opts.startsAt, opts.endsAt);
  return {
    id,
    userId: opts.userId,
    kind: opts.kind,
    payload: opts.payload,
    startsAt: opts.startsAt,
    endsAt: opts.endsAt,
  };
}

export function listActiveBonusEvents(userId: string, now: Date = new Date()): BonusEvent[] {
  const iso = now.toISOString();
  const rows = getDb()
    .prepare(
      `SELECT id, user_id as userId, kind, payload, starts_at as startsAt, ends_at as endsAt,
              completed_at as completedAt, awarded_points as awardedPoints
         FROM bonus_events
        WHERE user_id = ? AND starts_at <= ? AND ends_at >= ? AND completed_at IS NULL
        ORDER BY starts_at ASC`
    )
    .all(userId, iso, iso) as Array<{ payload: string } & Omit<BonusEvent, "payload">>;
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
}

export function listAllBonusEvents(userId: string, limit = 20): BonusEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id as userId, kind, payload, starts_at as startsAt, ends_at as endsAt,
              completed_at as completedAt, awarded_points as awardedPoints
         FROM bonus_events WHERE user_id = ? ORDER BY starts_at DESC LIMIT ?`
    )
    .all(userId, limit) as Array<{ payload: string } & Omit<BonusEvent, "payload">>;
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
}

export function completeBonusEvent(id: string, awardedPoints: number) {
  getDb()
    .prepare(`UPDATE bonus_events SET completed_at = ?, awarded_points = ? WHERE id = ?`)
    .run(new Date().toISOString(), awardedPoints, id);
}

// ── Tracks ──────────────────────────────────────────────────────────

export function insertTrackEnrollment(opts: {
  userId: string;
  trackKey: string;
  enrolledAt: string;
  endsAt: string;
}): TrackEnrollment {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO track_enrollments (id, user_id, track_key, enrolled_at, ends_at) VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, opts.userId, opts.trackKey, opts.enrolledAt, opts.endsAt);
  return { id, userId: opts.userId, trackKey: opts.trackKey, enrolledAt: opts.enrolledAt, endsAt: opts.endsAt };
}

export function listActiveTrackEnrollments(userId: string, now: Date = new Date()): TrackEnrollment[] {
  const iso = now.toISOString();
  return getDb()
    .prepare(
      `SELECT id, user_id as userId, track_key as trackKey, enrolled_at as enrolledAt,
              ends_at as endsAt, completed_at as completedAt
         FROM track_enrollments
        WHERE user_id = ? AND ends_at >= ? AND completed_at IS NULL`
    )
    .all(userId, iso) as TrackEnrollment[];
}

export function listAllTrackEnrollments(userId: string): TrackEnrollment[] {
  return getDb()
    .prepare(
      `SELECT id, user_id as userId, track_key as trackKey, enrolled_at as enrolledAt,
              ends_at as endsAt, completed_at as completedAt
         FROM track_enrollments WHERE user_id = ? ORDER BY enrolled_at DESC`
    )
    .all(userId) as TrackEnrollment[];
}

export function completeTrack(id: string) {
  getDb()
    .prepare(`UPDATE track_enrollments SET completed_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), id);
}

// ── Community challenges ───────────────────────────────────────────

export function listCommunityChallenges(): CommunityChallenge[] {
  const rows = getDb()
    .prepare(
      `SELECT id, title, description, starts_at as startsAt, ends_at as endsAt, bonus_points as bonusPoints
         FROM community_challenges ORDER BY starts_at DESC`
    )
    .all() as Array<Omit<CommunityChallenge, "participants">>;
  const countStmt = getDb().prepare(
    `SELECT COUNT(*) as c FROM community_participations WHERE challenge_id = ?`
  );
  return rows.map((r) => ({ ...r, participants: (countStmt.get(r.id) as { c: number }).c }));
}

export function isEnrolledInChallenge(challengeId: string, userId: string): boolean {
  const row = getDb()
    .prepare(`SELECT 1 FROM community_participations WHERE challenge_id = ? AND user_id = ?`)
    .get(challengeId, userId);
  return !!row;
}

export function enrollInChallenge(challengeId: string, userId: string) {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO community_participations (challenge_id, user_id, enrolled_at) VALUES (?, ?, ?)`
    )
    .run(challengeId, userId, new Date().toISOString());
}

export function unenrollFromChallenge(challengeId: string, userId: string) {
  getDb()
    .prepare(`DELETE FROM community_participations WHERE challenge_id = ? AND user_id = ?`)
    .run(challengeId, userId);
}

// ── Payments ───────────────────────────────────────────────────────

export function insertPayment(p: Payment) {
  getDb()
    .prepare(
      `INSERT INTO payments (id, user_id, amount_sek, kind, provider, status, external_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(p.id, p.userId, p.amountSEK, p.kind, p.provider, p.status, p.externalId ?? null, p.createdAt);
}

export function listPayments(userId: string): Payment[] {
  return getDb()
    .prepare(
      `SELECT id, user_id as userId, amount_sek as amountSEK, kind, provider, status,
              external_id as externalId, created_at as createdAt
         FROM payments WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(userId) as Payment[];
}

// ── Bank transactions ──────────────────────────────────────────────

export function insertBankTransaction(t: BankTransaction) {
  getDb()
    .prepare(
      `INSERT INTO bank_transactions (id, user_id, merchant, category, amount_sek, detected_at, intercepted, cancelled, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      t.id,
      t.userId,
      t.merchant,
      t.category,
      t.amountSEK,
      t.detectedAt,
      t.intercepted ? 1 : 0,
      t.cancelled ? 1 : 0,
      t.status
    );
}

export function listBankTransactions(userId: string): BankTransaction[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id as userId, merchant, category, amount_sek as amountSEK,
              detected_at as detectedAt, intercepted, cancelled, status
         FROM bank_transactions WHERE user_id = ? ORDER BY detected_at DESC LIMIT 50`
    )
    .all(userId) as Array<{
    id: string;
    userId: string;
    merchant: string;
    category: BankTransaction["category"];
    amountSEK: number;
    detectedAt: string;
    intercepted: number;
    cancelled: number;
    status: BankTransaction["status"];
  }>;
  return rows.map((r) => ({ ...r, intercepted: r.intercepted === 1, cancelled: r.cancelled === 1 }));
}

export function updateBankTransactionStatus(id: string, status: BankTransaction["status"], cancelled: boolean) {
  getDb()
    .prepare(`UPDATE bank_transactions SET status = ?, cancelled = ? WHERE id = ?`)
    .run(status, cancelled ? 1 : 0, id);
}

// ── Health samples ─────────────────────────────────────────────────

export function insertHealthSample(s: HealthSample) {
  getDb()
    .prepare(
      `INSERT INTO health_samples (id, user_id, kind, value, unit, sampled_at, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(s.id, s.userId, s.kind, s.value, s.unit, s.sampledAt, s.source);
}

export function listHealthSamples(userId: string, kind?: HealthSample["kind"]): HealthSample[] {
  if (kind) {
    return getDb()
      .prepare(
        `SELECT id, user_id as userId, kind, value, unit, sampled_at as sampledAt, source
           FROM health_samples WHERE user_id = ? AND kind = ? ORDER BY sampled_at DESC LIMIT 200`
      )
      .all(userId, kind) as HealthSample[];
  }
  return getDb()
    .prepare(
      `SELECT id, user_id as userId, kind, value, unit, sampled_at as sampledAt, source
         FROM health_samples WHERE user_id = ? ORDER BY sampled_at DESC LIMIT 200`
    )
    .all(userId) as HealthSample[];
}

// ── Monthly reports ────────────────────────────────────────────────

export function upsertMonthlyReport(userId: string, report: MonthlyReport) {
  getDb()
    .prepare(
      `INSERT INTO monthly_reports (user_id, month_key, content, generated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, month_key) DO UPDATE SET content = excluded.content, generated_at = excluded.generated_at`
    )
    .run(userId, report.monthKey, report.content, report.generatedAt);
}

export function getMonthlyReport(userId: string, monthKey: string): MonthlyReport | undefined {
  const row = getDb()
    .prepare(`SELECT month_key as monthKey, content, generated_at as generatedAt FROM monthly_reports WHERE user_id = ? AND month_key = ?`)
    .get(userId, monthKey) as MonthlyReport | undefined;
  return row;
}

export function listMonthlyReports(userId: string): MonthlyReport[] {
  return getDb()
    .prepare(`SELECT month_key as monthKey, content, generated_at as generatedAt FROM monthly_reports WHERE user_id = ? ORDER BY month_key DESC`)
    .all(userId) as MonthlyReport[];
}

// ── Accountability calls ──────────────────────────────────────────

export function insertCall(userId: string, call: AccountabilityCall) {
  getDb()
    .prepare(
      `INSERT INTO accountability_calls (id, user_id, started_at, ended_at, transcript, awarded_points)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(call.id, userId, call.startedAt, call.endedAt ?? null, JSON.stringify(call.transcript), call.awardedPoints);
}

export function listCalls(userId: string): AccountabilityCall[] {
  const rows = getDb()
    .prepare(
      `SELECT id, started_at as startedAt, ended_at as endedAt, transcript, awarded_points as awardedPoints
         FROM accountability_calls WHERE user_id = ? ORDER BY started_at DESC LIMIT 20`
    )
    .all(userId) as Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    transcript: string;
    awardedPoints: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    startedAt: r.startedAt,
    endedAt: r.endedAt ?? undefined,
    transcript: JSON.parse(r.transcript),
    awardedPoints: r.awardedPoints,
  }));
}

// ── Charity ────────────────────────────────────────────────────────

export function insertCharityDisbursement(d: CharityDisbursement & { userId: string }) {
  getDb()
    .prepare(
      `INSERT INTO charity_disbursements (id, user_id, month_key, amount_sek, charity, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(d.id, d.userId, d.monthKey, d.amountSEK, d.charity, d.status, d.createdAt);
}

export function listCharityDisbursements(userId: string): CharityDisbursement[] {
  return getDb()
    .prepare(
      `SELECT id, month_key as monthKey, amount_sek as amountSEK, charity, status, created_at as createdAt
         FROM charity_disbursements WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(userId) as CharityDisbursement[];
}

// ── Foundation Mode ────────────────────────────────────────────────

export function getFoundation(userId: string): FoundationModeState | undefined {
  const row = getDb()
    .prepare(
      `SELECT user_id as userId, activated_at as activatedAt, duration_days as durationDays,
              commitment, original_stake_sek as originalStakeSEK, surcharge_sek as surchargeSEK,
              deactivation_started_at as deactivationStartedAt, deactivated_at as deactivatedAt
         FROM foundation_mode WHERE user_id = ?`
    )
    .get(userId) as FoundationModeState | undefined;
  return row;
}

export function activateFoundation(opts: {
  userId: string;
  commitment: string;
  originalStakeSEK: number;
  surchargeSEK: number;
  durationDays?: number;
}): FoundationModeState {
  const at = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO foundation_mode
        (user_id, activated_at, duration_days, commitment, original_stake_sek, surcharge_sek,
         deactivation_started_at, deactivated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`
    )
    .run(
      opts.userId,
      at,
      opts.durationDays ?? 180,
      opts.commitment,
      opts.originalStakeSEK,
      opts.surchargeSEK
    );
  return getFoundation(opts.userId)!;
}

export function startFoundationDeactivation(userId: string) {
  getDb()
    .prepare(`UPDATE foundation_mode SET deactivation_started_at = ? WHERE user_id = ?`)
    .run(new Date().toISOString(), userId);
}

export function completeFoundationDeactivation(userId: string) {
  getDb()
    .prepare(`UPDATE foundation_mode SET deactivated_at = ? WHERE user_id = ?`)
    .run(new Date().toISOString(), userId);
}

export function insertTriggerLog(userId: string, log: TriggerLog) {
  getDb()
    .prepare(
      `INSERT INTO trigger_logs (id, user_id, logged_at, emotion_underneath, energy_level, redirect_chosen, redirect_completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      log.id,
      userId,
      log.loggedAt,
      log.emotionUnderneath,
      log.energyLevel,
      log.redirectChosen,
      log.redirectCompletedAt
    );
}

export function updateTriggerLog(id: string, patch: Partial<TriggerLog>) {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (patch.emotionUnderneath !== undefined) {
    fields.push("emotion_underneath = ?");
    values.push(patch.emotionUnderneath);
  }
  if (patch.energyLevel !== undefined) {
    fields.push("energy_level = ?");
    values.push(patch.energyLevel);
  }
  if (patch.redirectChosen !== undefined) {
    fields.push("redirect_chosen = ?");
    values.push(patch.redirectChosen);
  }
  if (patch.redirectCompletedAt !== undefined) {
    fields.push("redirect_completed_at = ?");
    values.push(patch.redirectCompletedAt);
  }
  if (fields.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE trigger_logs SET ${fields.join(", ")} WHERE id = ?`).run(...(values as never[]));
}

export function listTriggerLogs(userId: string, limit = 200): TriggerLog[] {
  const rows = getDb()
    .prepare(
      `SELECT id, logged_at as loggedAt, emotion_underneath as emotionUnderneath,
              energy_level as energyLevel, redirect_chosen as redirectChosen,
              redirect_completed_at as redirectCompletedAt
         FROM trigger_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT ?`
    )
    .all(userId, limit) as TriggerLog[];
  return rows;
}

export function upsertReadinessScore(userId: string, s: ReadinessScore) {
  getDb()
    .prepare(
      `INSERT INTO readiness_scores (user_id, week_key, physical, mental, social, regulation, total, phase, computed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, week_key) DO UPDATE SET
         physical = excluded.physical, mental = excluded.mental,
         social = excluded.social, regulation = excluded.regulation,
         total = excluded.total, phase = excluded.phase, computed_at = excluded.computed_at`
    )
    .run(userId, s.weekKey, s.physical, s.mental, s.social, s.regulation, s.total, s.phase, s.computedAt);
}

export function listReadinessScores(userId: string): ReadinessScore[] {
  return getDb()
    .prepare(
      `SELECT week_key as weekKey, physical, mental, social, regulation, total, phase, computed_at as computedAt
         FROM readiness_scores WHERE user_id = ? ORDER BY week_key ASC`
    )
    .all(userId) as ReadinessScore[];
}

// ── NourishPlan ────────────────────────────────────────────────────

export function insertMealPlan(p: MealPlan) {
  getDb()
    .prepare(
      `INSERT INTO meal_plans (id, user_id, date, energy_forecast, breakfast_id, lunch_id, dinner_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(p.id, p.userId, p.date, p.energyForecast, p.breakfastId, p.lunchId, p.dinnerId, p.createdAt);
}

export function getMealPlanForDate(userId: string, date: string): MealPlan | undefined {
  return getDb()
    .prepare(
      `SELECT id, user_id as userId, date, energy_forecast as energyForecast,
              breakfast_id as breakfastId, lunch_id as lunchId, dinner_id as dinnerId,
              created_at as createdAt
         FROM meal_plans WHERE user_id = ? AND date = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(userId, date) as MealPlan | undefined;
}

export function listMealPlans(userId: string, limit = 30): MealPlan[] {
  return getDb()
    .prepare(
      `SELECT id, user_id as userId, date, energy_forecast as energyForecast,
              breakfast_id as breakfastId, lunch_id as lunchId, dinner_id as dinnerId,
              created_at as createdAt
         FROM meal_plans WHERE user_id = ? ORDER BY date DESC LIMIT ?`
    )
    .all(userId, limit) as MealPlan[];
}

export function upsertMealLog(userId: string, log: MealLog) {
  getDb()
    .prepare(
      `INSERT INTO meal_logs (user_id, date, slot, ate_as_planned, delivery_ordered, logged_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date, slot) DO UPDATE SET
         ate_as_planned = excluded.ate_as_planned,
         delivery_ordered = excluded.delivery_ordered,
         logged_at = excluded.logged_at`
    )
    .run(
      userId,
      log.date,
      log.slot,
      log.ateAsPlanned == null ? null : log.ateAsPlanned ? 1 : 0,
      log.deliveryOrdered ? 1 : 0,
      log.loggedAt
    );
}

export function listMealLogs(userId: string, since?: string): MealLog[] {
  const rows = (since
    ? getDb()
        .prepare(
          `SELECT date, slot, ate_as_planned as ateAsPlanned, delivery_ordered as deliveryOrdered, logged_at as loggedAt
             FROM meal_logs WHERE user_id = ? AND date >= ? ORDER BY date DESC, slot`
        )
        .all(userId, since)
    : getDb()
        .prepare(
          `SELECT date, slot, ate_as_planned as ateAsPlanned, delivery_ordered as deliveryOrdered, logged_at as loggedAt
             FROM meal_logs WHERE user_id = ? ORDER BY date DESC, slot`
        )
        .all(userId)) as Array<{
    date: string;
    slot: string;
    ateAsPlanned: number | null;
    deliveryOrdered: number;
    loggedAt: string;
  }>;
  return rows.map((r) => ({
    date: r.date,
    slot: r.slot as MealLog["slot"],
    ateAsPlanned: r.ateAsPlanned == null ? null : r.ateAsPlanned === 1,
    deliveryOrdered: r.deliveryOrdered === 1,
    loggedAt: r.loggedAt,
  }));
}

export function insertShoppingList(s: ShoppingList) {
  getDb()
    .prepare(
      `INSERT INTO shopping_lists (id, user_id, plan_id, items, created_at, sent_to, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(s.id, s.userId, s.planId, JSON.stringify(s.items), s.createdAt, s.sentTo, s.sentAt);
}

export function getShoppingListForPlan(planId: string): ShoppingList | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, user_id as userId, plan_id as planId, items, created_at as createdAt,
              sent_to as sentTo, sent_at as sentAt
         FROM shopping_lists WHERE plan_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(planId) as
    | { id: string; userId: string; planId: string; items: string; createdAt: string; sentTo: string | null; sentAt: string | null }
    | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    items: JSON.parse(row.items),
    createdAt: row.createdAt,
    sentTo: row.sentTo as ShoppingList["sentTo"],
    sentAt: row.sentAt,
  };
}

export function updateShoppingListItems(id: string, items: ShoppingList["items"]) {
  getDb().prepare(`UPDATE shopping_lists SET items = ? WHERE id = ?`).run(JSON.stringify(items), id);
}

export function markShoppingListSent(id: string, sentTo: NonNullable<ShoppingList["sentTo"]>) {
  getDb()
    .prepare(`UPDATE shopping_lists SET sent_to = ?, sent_at = ? WHERE id = ?`)
    .run(sentTo, new Date().toISOString(), id);
}

export function addPantryItem(userId: string, name: string) {
  getDb()
    .prepare(`INSERT OR IGNORE INTO pantry (user_id, name, added_at) VALUES (?, ?, ?)`)
    .run(userId, name, new Date().toISOString());
}

export function removePantryItem(userId: string, name: string) {
  getDb().prepare(`DELETE FROM pantry WHERE user_id = ? AND name = ?`).run(userId, name);
}

export function listPantry(userId: string): PantryItem[] {
  return getDb()
    .prepare(`SELECT name, added_at as addedAt FROM pantry WHERE user_id = ? ORDER BY name`)
    .all(userId) as PantryItem[];
}

// ── Notifications ──────────────────────────────────────────────────

export function getNotificationPrefs(userId: string): NotificationPrefs {
  const row = getDb()
    .prepare(
      `SELECT anchor_enabled as anchorEnabled, anchor_time as anchorTimeHHMM,
              moments_enabled as momentsEnabled, surprises_enabled as surprisesEnabled,
              rescue_enabled as rescueEnabled
         FROM notification_prefs WHERE user_id = ?`
    )
    .get(userId) as
    | {
        anchorEnabled: number;
        anchorTimeHHMM: string;
        momentsEnabled: number;
        surprisesEnabled: number;
        rescueEnabled: number;
      }
    | undefined;
  if (!row) {
    return {
      anchorEnabled: true,
      anchorTimeHHMM: "08:30",
      momentsEnabled: true,
      surprisesEnabled: true,
      rescueEnabled: true,
    };
  }
  return {
    anchorEnabled: row.anchorEnabled === 1,
    anchorTimeHHMM: row.anchorTimeHHMM,
    momentsEnabled: row.momentsEnabled === 1,
    surprisesEnabled: row.surprisesEnabled === 1,
    rescueEnabled: row.rescueEnabled === 1,
  };
}

export function upsertNotificationPrefs(userId: string, p: NotificationPrefs) {
  getDb()
    .prepare(
      `INSERT INTO notification_prefs (user_id, anchor_enabled, anchor_time, moments_enabled, surprises_enabled, rescue_enabled)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         anchor_enabled = excluded.anchor_enabled,
         anchor_time = excluded.anchor_time,
         moments_enabled = excluded.moments_enabled,
         surprises_enabled = excluded.surprises_enabled,
         rescue_enabled = excluded.rescue_enabled`
    )
    .run(
      userId,
      p.anchorEnabled ? 1 : 0,
      p.anchorTimeHHMM,
      p.momentsEnabled ? 1 : 0,
      p.surprisesEnabled ? 1 : 0,
      p.rescueEnabled ? 1 : 0
    );
}

export function insertNotification(userId: string, n: NotificationRecord) {
  getDb()
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, sent_at, opened_at, dismissed_at, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      n.id,
      userId,
      n.type,
      n.title,
      n.body,
      n.sentAt,
      n.openedAt,
      n.dismissedAt,
      n.payload ? JSON.stringify(n.payload) : null
    );
}

export function listNotifications(userId: string, limit = 40): NotificationRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT id, type, title, body, sent_at as sentAt, opened_at as openedAt,
              dismissed_at as dismissedAt, payload
         FROM notifications WHERE user_id = ? ORDER BY sent_at DESC LIMIT ?`
    )
    .all(userId, limit) as Array<Omit<NotificationRecord, "payload"> & { payload: string | null }>;
  return rows.map((r) => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : null }));
}

export function countNotificationsInWindow(userId: string, type: NotificationType, sinceISO: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND type = ? AND sent_at >= ?`
    )
    .get(userId, type, sinceISO) as { c: number };
  return row.c;
}

export function lastNotificationAt(userId: string): string | undefined {
  const row = getDb()
    .prepare(`SELECT sent_at as sentAt FROM notifications WHERE user_id = ? ORDER BY sent_at DESC LIMIT 1`)
    .get(userId) as { sentAt: string } | undefined;
  return row?.sentAt;
}

export function markNotificationOpened(id: string) {
  getDb().prepare(`UPDATE notifications SET opened_at = ? WHERE id = ?`).run(new Date().toISOString(), id);
}

export function markNotificationDismissed(id: string) {
  getDb().prepare(`UPDATE notifications SET dismissed_at = ? WHERE id = ?`).run(new Date().toISOString(), id);
}

// ── Memory Gallery ─────────────────────────────────────────────────

export function insertMemoryCard(userId: string, m: MemoryCard) {
  getDb()
    .prepare(
      `INSERT INTO memory_gallery (id, user_id, item_id, title, caption, month_key, image_hint, redeemed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(m.id, userId, m.itemId, m.title, m.caption, m.monthKey, m.imageHint, m.redeemedAt);
}

export function listMemoryCards(userId: string): MemoryCard[] {
  return getDb()
    .prepare(
      `SELECT id, item_id as itemId, title, caption, month_key as monthKey,
              image_hint as imageHint, redeemed_at as redeemedAt
         FROM memory_gallery WHERE user_id = ? ORDER BY redeemed_at DESC`
    )
    .all(userId) as MemoryCard[];
}
