/**
 * server/serverless/cron.ts — Cron trigger source.
 * Bundled by scripts/build-server.cjs → api/cron.mjs (single-file serverless
 * function). Source lives OUTSIDE api/ so Vercel does not try to compile it
 * itself (that broke at runtime: ERR_MODULE_NOT_FOUND for ../server/*).
 *
 * Runs the shared automation engine for every tenant on a schedule
 * (declared in vercel.json → /api/cron/tick, hourly). It does NOT touch the
 * main api/index.mjs handler; it is fully independent.
 *
 * Auth: must be called with `Authorization: Bearer ${CRON_SECRET}` (defaults to
 * "dev-cron" when CRON_SECRET is unset). Any other value → 401.
 */

import "dotenv/config";
import { getDb } from "../db";
import {
  runProactiveAlerts,
  runScheduledJournalEntries,
  runRecurringExpenses,
} from "../automation";
import {
  tenants,
  featureFlags,
  loginAttempts,
  users,
} from "../../drizzle/schema";
import { sql, count } from "drizzle-orm";
import { runNightlyBackupIfDue } from "../_core/backup";

export default async function handler(req: any, res: any) {
  try {
    // SECURITY: fail closed in production — the cron surface must never be
    // callable with a well-known default secret. Vercel Cron automatically
    // sends `Authorization: Bearer ${CRON_SECRET}` when the env var is set.
    const secret = process.env.CRON_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({ ok: false, error: "CRON_SECRET not configured" })
      );
      return;
    }
    const auth = req.headers["authorization"] || "";
    const expected = `Bearer ${secret || "dev-cron"}`;
    if (auth !== expected) {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }

    const db = await getDb();
    if (!db) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "database unavailable" }));
      return;
    }

    const rows = await db
      .select({ id: tenants.id })
      .from(tenants)
      .orderBy(tenants.id);

    let ran = 0;
    const perTenant = [];
    for (const t of rows) {
      // 1. Proactive alerts (reorder points, overdue invoices)
      const alerts = await runProactiveAlerts(t.id);

      // 2. Scheduled journal entries
      const scheduled = await runScheduledJournalEntries(t.id, null);

      // 3. Recurring expenses processing
      const recurring = await runRecurringExpenses(t.id, null);

      // 4. Feature-flag health check — confirm no stale flags for this tenant
      await db
        .select()
        .from(featureFlags)
        .where(sql`${featureFlags.tenantId} = ${t.id}`)
        .limit(100);

      // 5. Stale-session cleanup — remove login attempts older than 90 days
      await db
        .delete(loginAttempts)
        .where(sql`${loginAttempts.createdAt} < now() - interval '90 days'`);

      // 6. Aggregate analytics stats for BI dashboard (denormalized snapshot)
      const stats = await db
        .select({
          totalUsers: count(users.id),
          totalTenants: count(tenants.id),
          activeSessions: sql<number>`(SELECT count(*) FROM users WHERE lastSignedIn > now() - interval '24 hours')`,
        })
        .from(users);

      perTenant.push({
        tenantId: t.id,
        alerts: alerts.total,
        scheduledProcessed: scheduled.processed,
        recurringProcessed: recurring.processed,
        recurringFailed: recurring.failed,
        stats: {
          totalUsers: stats[0]?.totalUsers ?? 0,
          activeSessions: stats[0]?.activeSessions ?? 0,
        },
      });
      ran++;
    }

    // 7. Nightly encrypted backup — at most once/day, never fails the tick.
    const backup = await runNightlyBackupIfDue();

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        ran,
        perTenant,
        backup,
      })
    );
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    );
  }
}
