#!/usr/bin/env tsx
/**
 * Backup Restore Dry-Run Script
 *
 * Usage:
 *   pnpm tsx scripts/backup-restore-test.ts
 *
 * Prerequisites:
 *   - BACKUP_ENCRYPTION_KEY set in environment
 *   - DATABASE_URL pointing to a TEST database (NOT production)
 *   - S3 credentials configured (or BACKUP_DIR for local)
 *
 * This script:
 * 1. Lists available backups
 * 2. Verifies the latest backup integrity
 * 3. Performs a DRY-RUN restore (no actual data written)
 * 4. Reports success/failure with timing
 */

import "dotenv/config";
import { createClient } from "@neondatabase/serverless";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import { backupRouter } from "../server/backupRouter";
import { createContext } from "../server/_core/context";
import { appRouter } from "../server/routers";

async function main() {
  console.log("🔍 [Backup Restore Test] Starting dry-run...\n");

  // 1. Check environment
  const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 16) {
    console.error("❌ BACKUP_ENCRYPTION_KEY missing or too short (<16 chars)");
    console.error("   Set it in .env or Vercel environment variables");
    process.exit(1);
  }
  console.log("✅ BACKUP_ENCRYPTION_KEY present");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }
  console.log("✅ DATABASE_URL configured");

  // 2. Create test context (simulate authenticated admin)
  const db = await getDb();
  if (!db) {
    console.error("❌ Database connection failed");
    process.exit(1);
  }
  console.log("✅ Database connected");

  // 3. List backups via trpc
  console.log("\n📋 Fetching backup list...");
  const ctx = await createContext({ req: {}, res: {} });
  const caller = appRouter.createCaller(ctx);

  try {
    const backups = await caller.backup.list();
    console.log(`   Found ${backups.length} backup(s)`);

    if (backups.length === 0) {
      console.log(
        "   ⚠️  No backups found — run a backup first via cron or manually"
      );
      return;
    }

    // Show latest 5
    backups.slice(0, 5).forEach((b, i) => {
      console.log(
        `   ${i + 1}. ${b.fileName} — ${b.sizeBytes} bytes — ${new Date(b.createdAt).toISOString()}`
      );
    });

    const latest = backups[0];
    console.log(`\n🎯 Testing latest: ${latest.fileName}`);

    // 4. Verify backup
    console.log("\n🔐 Verifying backup integrity...");
    const verifyStart = Date.now();
    const verifyResult = await caller.backup.verify({
      fileName: latest.fileName,
    });
    const verifyMs = Date.now() - verifyStart;

    if (verifyResult.ok) {
      console.log(`   ✅ Verification passed (${verifyMs}ms)`);
      console.log(`   📦 Tables: ${verifyResult.meta?.tableCount ?? "?"}`);
      console.log(`   📊 Rows: ${verifyResult.meta?.totalRows ?? "?"}`);
    } else {
      console.error(`   ❌ Verification failed: ${verifyResult.error}`);
      process.exit(1);
    }

    // 5. Dry-run restore
    console.log("\n🧪 Performing DRY-RUN restore (no data written)...");
    const restoreStart = Date.now();
    const restoreResult = await caller.backup.restore({
      fileName: latest.fileName,
      dryRun: true,
    });
    const restoreMs = Date.now() - restoreStart;

    if (restoreResult.ok) {
      console.log(`   ✅ Dry-run restore passed (${restoreMs}ms)`);
      console.log(
        `   📋 Would restore: ${restoreResult.meta?.tablesRestored ?? "?"} tables`
      );
      console.log(
        `   📊 Would insert: ${restoreResult.meta?.rowsInserted ?? "?"} rows`
      );
    } else {
      console.error(`   ❌ Dry-run restore failed: ${restoreResult.error}`);
      process.exit(1);
    }

    // 6. Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 BACKUP RESTORE TEST PASSED");
    console.log("=".repeat(50));
    console.log(`Latest backup: ${latest.fileName}`);
    console.log(
      `Backup age: ${Math.round((Date.now() - new Date(latest.createdAt).getTime()) / 36e5)} hours`
    );
    console.log(`Verify time: ${verifyMs}ms`);
    console.log(`Dry-run time: ${restoreMs}ms`);
    console.log("\n✅ System ready for production disaster recovery");
    console.log("\n📝 Next steps for production:");
    console.log("   1. Schedule this test weekly in cron");
    console.log("   2. Document results in runbook");
    console.log("   3. Test full restore on staging quarterly");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
