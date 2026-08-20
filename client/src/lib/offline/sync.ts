/**
 * Sync Engine for ALHUSAINIA Accounting.
 *
 * Handles:
 * - Queueing mutations offline
 * - Replaying to server when online
 * - Conflict resolution (last-writer-wins per record)
 * - Multi-branch sync
 * - Automatic retry with exponential backoff
 */

import {
  getPendingSyncs,
  removeSyncEntry,
  incrementRetry,
  getSyncMeta,
  setSyncMeta,
  getAll,
  bulkPut,
  removeLocalRow,
  type TableName,
  type SyncQueueEntry,
} from "./db";

const MAX_RETRIES = 5;
const SYNC_INTERVAL_MS = 30_000;

// ─── Server Sync API ──────────────────────────────────────────────

const SYNC_API = "/api/trpc";

async function trpcQuery<T>(procedure: string, input?: unknown): Promise<T> {
  const params: Record<string, string> = { batch: "1" };
  if (input !== undefined) {
    params.input = JSON.stringify({ "0": { json: input } });
  } else {
    params.input = JSON.stringify({ "0": { json: undefined } });
  }
  const url = `${SYNC_API}/${procedure}?${new URLSearchParams(params).toString()}`;
  const resp = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) throw new Error(`Sync API error: ${resp.status}`);
  const data = await resp.json();
  return data[0]?.result?.data as T;
}

async function trpcMutate<T>(procedure: string, input: unknown): Promise<T> {
  const params = new URLSearchParams({ batch: "1" });
  const url = `${SYNC_API}/${procedure}?${params.toString()}`;
  const resp = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: input } }),
  });
  if (!resp.ok) throw new Error(`Sync mutation error: ${resp.status}`);
  const data = await resp.json();
  return data[0]?.result?.data as T;
}

// ─── Conflict Resolution ──────────────────────────────────────────

function resolveConflict(
  serverRecord: any,
  clientRecord: any
): { winner: "server" | "client"; merged: any } {
  const serverVersion = serverRecord?._version || 0;
  const clientVersion = clientRecord?._version || 0;

  if (clientVersion > serverVersion) {
    return { winner: "client", merged: clientRecord };
  }
  if (serverVersion > clientVersion) {
    return { winner: "server", merged: serverRecord };
  }
  if ((clientRecord?._syncedAt || 0) > (serverRecord?._syncedAt || 0)) {
    return { winner: "client", merged: clientRecord };
  }
  return { winner: "server", merged: serverRecord };
}

// ─── Pull (Server → Client) ───────────────────────────────────────

export async function pullFromServer(tableName: TableName): Promise<{
  pulled: number;
  conflicts: Array<{ tableName: string; recordId: string; resolution: string }>;
}> {
  const meta = await getSyncMeta(tableName);
  try {
    // Use the full snapshot endpoint: covers every table in one request
    const snapshot = await trpcQuery<any>("sync.getFullSnapshot");
    if (!snapshot || typeof snapshot !== "object")
      return { pulled: 0, conflicts: [] };

    let serverRecords: any[] = [];
    if (Array.isArray(snapshot[tableName])) {
      serverRecords = snapshot[tableName];
    } else if (tableName === "settings" && snapshot.settings) {
      serverRecords = [snapshot.settings];
    } else if (tableName === "tenants" && Array.isArray(snapshot.tenants)) {
      serverRecords = snapshot.tenants;
    } else if (tableName === "branches" && Array.isArray(snapshot.branches)) {
      serverRecords = snapshot.branches;
    } else if (tableName === "users" && snapshot.users) {
      serverRecords = [snapshot.users];
    } else if (
      tableName === "branchPermissions" &&
      Array.isArray(snapshot.branchPermissions)
    ) {
      serverRecords = snapshot.branchPermissions;
    } else if (
      tableName === "activityLogs" &&
      Array.isArray(snapshot.activityLogs)
    ) {
      serverRecords = snapshot.activityLogs;
    } else {
      return { pulled: 0, conflicts: [] };
    }

    const localRecords = await getAll(tableName);
    const localMap = new Map(localRecords.map((r: any) => [String(r.id), r]));
    // Deduplicate by business code for chart-of-accounts style tables
    const localByCode = new Map<string, any>(
      tableName === "accounts"
        ? localRecords
            .map((r: any): [string, any] => [String(r.code), r])
            .filter(([, v]) => v?.code != null)
        : []
    );
    const conflicts: Array<{
      tableName: string;
      recordId: string;
      resolution: string;
    }> = [];
    const toUpsert: any[] = [];

    for (const srvRec of serverRecords) {
      if (srvRec == null || srvRec.id == null) continue;
      const id = String(srvRec.id);
      const localRec = localMap.get(id);

      // Skip records that already exist locally under the same business code
      if (tableName === "accounts" && srvRec.code != null) {
        const codeMatch = localByCode.get(String(srvRec.code));
        if (codeMatch && String(codeMatch.id) !== id) {
          continue;
        }
      }

      if (!localRec) {
        toUpsert.push({
          ...srvRec,
          _syncId: `server-${id}`,
          _version: srvRec._version || 0,
          _syncedAt: Date.now(),
          _status: "synced",
          _deviceId: "server",
        });
      } else if (localRec._status === "pending") {
        const { winner } = resolveConflict(srvRec, localRec);
        conflicts.push({
          tableName,
          recordId: id,
          resolution: winner === "server" ? "server-wins" : "client-wins",
        });
        toUpsert.push({
          ...(winner === "server" ? srvRec : localRec),
          _syncedAt: Date.now(),
          _status: "synced",
        });
      } else {
        toUpsert.push({
          ...srvRec,
          _syncId: localRec._syncId,
          _version: Math.max(localRec._version || 0, srvRec._version || 0),
          _syncedAt: Date.now(),
          _status: "synced",
          _deviceId: localRec._deviceId,
        });
      }
    }

    if (toUpsert.length > 0) {
      await bulkPut(tableName, toUpsert);
    }
    await setSyncMeta(tableName, (meta?.lastSyncVersion || 0) + 1);
    return { pulled: toUpsert.length, conflicts };
  } catch (error) {
    console.warn(`[Sync] Pull failed for ${tableName}:`, error);
    return { pulled: 0, conflicts: [] };
  }
}

// ─── Push (Client → Server) ───────────────────────────────────────

export async function pushPendingChanges(): Promise<{
  pushed: number;
  failed: number;
}> {
  const pending = await getPendingSyncs();
  let pushed = 0;
  let failed = 0;

  for (const entry of pending) {
    if (entry.retries >= MAX_RETRIES) {
      await removeSyncEntry(entry.id!);
      continue;
    }

    try {
      const table = entry.tableName as TableName;
      const rpcMap: Record<string, string> = {
        accounts:
          entry.operation === "create"
            ? "accounting.addAccount"
            : "accounting.updateAccount",
        transactions:
          entry.operation === "create"
            ? "accounting.addTransaction"
            : "accounting.updateTransaction",
        settings: "accounting.updateSettings",
        budgets: "accounting.saveBudget",
        openingBalances: "accounting.saveOpeningBalances",
        branches: "accounting.createBranch",
        products:
          entry.operation === "create" ? "products.create" : "products.update",
        customers:
          entry.operation === "create"
            ? "customers.create"
            : "customers.update",
        suppliers:
          entry.operation === "create"
            ? "suppliers.create"
            : "suppliers.update",
        orders:
          entry.operation === "create"
            ? "orders.create"
            : "orders.updateStatus",
      };

      const rpcName = rpcMap[table];
      if (!rpcName || entry.operation === "delete") {
        await removeSyncEntry(entry.id!);
        continue;
      }

      await trpcMutate(rpcName, entry.payload);
      await removeSyncEntry(entry.id!);
      if (
        entry.operation === "create" &&
        (table === "transactions" || table === "budgets")
      ) {
        await removeLocalRow(
          table,
          (entry.payload as any)?.id ?? entry.recordId
        );
      }
      pushed++;
    } catch (error) {
      console.warn(`[Sync] Push failed for entry ${entry.id}:`, error);
      await incrementRetry(entry.id!);
      failed++;
    }
  }

  return { pushed, failed };
}

// ─── Full Sync Cycle ──────────────────────────────────────────────

export interface SyncResult {
  pushed: number;
  pulled: number;
  failed: number;
  conflicts: Array<{ tableName: string; recordId: string; resolution: string }>;
  timestamp: number;
}

export async function performFullSync(): Promise<SyncResult> {
  const pushResult = await pushPendingChanges();

  const tables: TableName[] = [
    "accounts",
    "transactions",
    "settings",
    "budgets",
    "openingBalances",
    "branches",
    "tenants",
    "activityLogs",
    "products",
    "warehouses",
    "inventoryMovements",
    "customers",
    "suppliers",
    "salesInvoices",
    "salesInvoiceItems",
    "purchaseInvoices",
    "purchaseInvoiceItems",
    "orders",
    "orderItems",
    "payments",
  ];

  let totalPulled = 0;
  const allConflicts: SyncResult["conflicts"] = [];

  for (const table of tables) {
    const result = await pullFromServer(table);
    totalPulled += result.pulled;
    allConflicts.push(...result.conflicts);
  }

  return {
    pushed: pushResult.pushed,
    pulled: totalPulled,
    failed: pushResult.failed,
    conflicts: allConflicts,
    timestamp: Date.now(),
  };
}

// ─── Sync Manager (Singleton) ─────────────────────────────────────

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastResult: SyncResult | null;
}

export class SyncManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isOnline = false;
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private lastResult: SyncResult | null = null;

  private handleOnline = () => {
    this.isOnline = true;
    this.notify();
    this.syncNow();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notify();
  };

  get status(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastResult: this.lastResult,
    };
  }

  start() {
    this.isOnline = navigator.onLine;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    this.intervalId = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncNow();
      }
    }, SYNC_INTERVAL_MS);

    if (this.isOnline) {
      this.syncNow();
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  async syncNow(): Promise<SyncResult | null> {
    if (this.isSyncing) return null;
    this.isSyncing = true;
    this.notify();

    try {
      this.lastResult = await performFullSync();
      return this.lastResult;
    } catch (error) {
      console.error("[SyncManager] Sync failed:", error);
      return null;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.status;
    this.listeners.forEach(l => l(status));
  }
}

export const syncManager = new SyncManager();
