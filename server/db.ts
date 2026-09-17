import { eq, sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
let _warmed = false;

export function getPool(): Pool {
  if (!_pool && process.env.DATABASE_URL) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return _pool as Pool;
}

export function getSql() {
  return getPool();
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(getPool());
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Get the DB instance or throw a clear, typed error.
 * Used by routers that cannot degrade silently (financial/clinical writes).
 */
export async function dbOrThrow() {
  const db = await getDb();
  if (!db) {
    throw new Error(
      "DATABASE_UNAVAILABLE: قاعدة البيانات غير متاحة حالياً، حاول مرة أخرى لاحقاً"
    );
  }
  return db;
}

/**
 * Warm-up the serverless DB layer so the FIRST real query after a cold start
 * does not pay the full round-trip latency (Neon cold start can take ~10s).
 * Idempotent and fail-safe: it never throws — the pool remains usable.
 */
export async function warmDatabase(): Promise<void> {
  if (_warmed) return;
  try {
    const db = await getDb();
    if (db) {
      await db.execute(sql`select 1`);
      _warmed = true;
    }
  } catch (error) {
    console.warn("[Database] Warm-up failed (will retry in 5s):", error);
    setTimeout(() => warmDatabase().catch(() => {}), 5000);
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    // Session & security tracking: must persist (sdk session-limit + activity).
    // Previously silently dropped — sessionCount never incremented.
    if (user.lastActivity !== undefined) {
      values.lastActivity = user.lastActivity;
      updateSet.lastActivity = user.lastActivity;
    }
    if (user.sessionCount !== undefined) {
      values.sessionCount = user.sessionCount;
      updateSet.sessionCount = user.sessionCount;
    }
    if (user.currentSessionId !== undefined) {
      values.currentSessionId = user.currentSessionId;
      updateSet.currentSessionId = user.currentSessionId;
    }
    if (user.passwordChangedAt !== undefined) {
      values.passwordChangedAt = user.passwordChangedAt;
      updateSet.passwordChangedAt = user.passwordChangedAt;
    }
    if (user.failedLoginAttempts !== undefined) {
      values.failedLoginAttempts = user.failedLoginAttempts;
      updateSet.failedLoginAttempts = user.failedLoginAttempts;
    }
    if (user.lockedUntil !== undefined) {
      values.lockedUntil = user.lockedUntil;
      updateSet.lockedUntil = user.lockedUntil;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}