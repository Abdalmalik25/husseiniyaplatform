/**
 * server/backupRouter.ts — admin-only encrypted backup endpoints.
 *
 * Surface:
 *  - run     : trigger an on-demand backup (all tenants or one).
 *  - list    : backup index (manifests only — never the blobs themselves).
 *  - verify  : integrity check (checksum + key fingerprint + decrypt probe).
 *  - restore : dry-run by default; real restore requires confirm:true.
 *
 * Every endpoint is adminProcedure — backups expose the whole tenant estate
 * and must never be callable by regular users.
 */

import { z } from "zod";
import { router, adminProcedure } from "./_core/trpc";
import {
  runBackup,
  listBackups,
  verifyBackup,
  restoreBackup,
} from "./_core/backup";

export const backupRouter = router({
  run: adminProcedure
    .input(z.object({ tenantId: z.number().int().positive().nullable().default(null) }))
    .mutation(async ({ input }) => {
      const manifest = await runBackup(input.tenantId);
      return {
        id: manifest.id,
        scope: manifest.scope,
        totalRows: manifest.totalRows,
        sha256: manifest.sha256,
        storage: manifest.storage,
        createdAt: manifest.createdAt,
      };
    }),

  list: adminProcedure.query(async () => {
    const manifests = await listBackups();
    // Strip storage paths (may contain absolute filesystem paths).
    return manifests.map(m => ({
      id: m.id,
      createdAt: m.createdAt,
      scope: m.scope,
      totalRows: m.totalRows,
      encryptedSize: m.encryptedSize,
      sha256: m.sha256,
      hasRemote: Boolean(m.storage.remoteKey),
      tableCounts: m.tableCounts,
    }));
  }),

  verify: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => verifyBackup(input.id)),

  restore: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        dryRun: z.boolean().default(true),
        /** Must be explicitly true when dryRun is false. */
        confirm: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.dryRun && input.confirm !== true) {
        throw new Error(
          "Real restore requires confirm:true — refusing destructive operation without explicit confirmation"
        );
      }
      return restoreBackup(input.id, { dryRun: input.dryRun });
    }),
});
