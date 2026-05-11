import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type {
  BrainDump,
  BrainDumpCategorization,
  DailyPlan,
  EveningLog,
  LoggedBehavior,
  MonthlyState,
  StakeTier,
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
      created_at TEXT NOT NULL
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
    `INSERT INTO users (id, name, tier, stake_sek, charity, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, "Saeed", "Standard", 1000, "Läkare Utan Gränser", now);

  const monthKey = now.slice(0, 7);
  db.prepare(
    `INSERT INTO monthly_state (user_id, month_key, stake_sek, tier, charity)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, monthKey, 1000, "Standard", "Läkare Utan Gränser");
}

export const DEMO_USER_ID = "user_demo";

export interface UserRow {
  id: string;
  name: string;
  tier: StakeTier;
  stake_sek: number;
  charity: string;
  created_at: string;
}

export function getUser(userId: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;
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
