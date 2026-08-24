/**
 * api/agent.mjs — Strict rule agent endpoint.
 *
 * This is a SEPARATE, independent API endpoint designed for the exclusive
 * use of the strict rule agent. It operates completely independently from
 * the main api/index.mjs production handler to avoid any risk of breaking
 * production traffic.
 *
 * Auth: must be called with `Authorization: Bearer ${AGENT_SECRET}`.
 * The AGENT_SECRET is loaded from .env and should be kept confidential.
 *
 * Available actions (POST):
 *  - "status": Returns system health & stats for the agent to verify
 *  - "force-run": Manually trigger the cron automation for a specific tenant
 *  - "purge-stale": Purge stale data older than N days
 *
 * This endpoint is NOT registered in any public route and must be called
 * exclusively by the authorized rule agent process.
 */

import "dotenv/config";
import { getDb } from "../server/db.ts";
import { tenants, users, activityLogs, loginAttempts } from "../drizzle/schema.ts";
import { sql, count } from "drizzle-orm";
import { runProactiveAlerts, runScheduledJournalEntries } from "../server/automation.ts";

const AGENT_SECRET = process.env.AGENT_SECRET;
if (!AGENT_SECRET) {
  console.error("[agent] AGENT_SECRET is not defined in .env — endpoint disabled");
}

export default async function handler(req, res) {
  try {
    // --- Authentication ---
    if (!AGENT_SECRET) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "agent secret not configured" }));
      return;
    }
    const auth = req.headers["authorization"] || "";
    if (auth !== `Bearer ${AGENT_SECRET}`) {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }

    const { action } = req.query || {};
    const db = await getDb();
    if (!db && action !== "status") {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "database unavailable" }));
      return;
    }

    // --- /status ---
    if (action === "status" || !action) {
      const tenRows = await db
        .select({ id: tenants.id })
        .from(tenants)
        .orderBy(tenants.id);
      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .orderBy(users.id);
      const logRows = await db
        .select({ id: activityLogs.id })
        .from(activityLogs)
        .orderBy(activityLogs.createdAt desc)
        .limit(10);

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          agent: "strict-rule-v1",
          timestamp: new Date().toISOString(),
          tenants: tenRows.length,
          users: userRows.length,
          recentActivity: logRows.length,
          features: {
            proactiveAlerts: true,
            scheduledJournalEntries: true,
            featureFlagChecks: true,
            staleSessionCleanup: true,
            analyticsStats: true,
          },
        })
      );
      return;
    }

    // --- /force-run?tenantId=X --- 
    if (action === "force-run") {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) {
        res.statusCode = 400;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "tenantId required" }));
        return;
      }
      const alerts = await runProactiveAlerts(tenantId);
      const scheduled = await runScheduledJournalEntries(tenantId, null);

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          tenantId,
          alerts: alerts.total,
          processed: scheduled.processed,
          message: "Force-run completed for tenant",
        })
      );
      return;
    }

    // --- /purge-stale?days=90 ---
    if (action === "purge-stale") {
      const days = Number(req.query.days) || 30;
      if (days < 1 || days > 365) {
        res.statusCode = 400;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "days must be 1-365" }));
        return;
      }

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Purge stale login attempts
      const del1 = await db
        .delete(loginAttempts)
        .where(sql`${loginAttempts.createdAt} < ${cutoff}`);

      // Purge stale activity logs (older than days)
      const del2 = await db
        .delete(activityLogs)
        .where(sql`${activityLogs.createdAt} < ${cutoff}`);

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          deletedLoginAttempts: del1 ? 0 : 0, // count would need separate query
          deletedActivityLogs: del2 ? 0 : 0,
          message: `Purged data older than ${days} days`,
        })
      );
      return;
    }

    // Unknown action
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "unknown action" }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  }
}