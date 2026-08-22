/**
 * Offline Context for ALHUSAINIA Accounting.
 *
 * Provides:
 * - Online/offline status
 * - Sync state and progress
 * - Sync trigger functions
 * - Offline data statistics
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { syncManager, type SyncResult } from "./sync";
import { getOfflineStats, seedDefaultData, type TableName } from "./db";
import { useAuth } from "@/_core/hooks/useAuth";

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  syncNow: () => Promise<SyncResult | null>;
  offlineStats: Record<
    TableName,
    { total: number; pending: number; synced: number }
  > | null;
  refreshStats: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  lastSyncResult: null,
  syncNow: async () => null,
  offlineStats: null,
  refreshStats: async () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [offlineStats, setOfflineStats] = useState<Record<
    TableName,
    { total: number; pending: number; synced: number }
  > | null>(null);

  // Local (IndexedDB) seed runs for every visitor so the app shell has data to
  // render; the server sync loop only runs for authenticated subscribers so we
  // never fire unauthenticated /api/trpc/sync.* calls (which would 401 on the
  // public marketing site).
  useEffect(() => {
    seedDefaultData().then(() => getOfflineStats().then(setOfflineStats));
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let unsub = () => {};
    if (isAuthenticated) {
      syncManager.start();
      unsub = syncManager.subscribe(status => {
        setIsOnline(status.isOnline);
        setIsSyncing(status.isSyncing);
        if (status.lastResult) {
          setLastSyncResult(status.lastResult);
        }
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsub();
      syncManager.stop();
    };
  }, [isAuthenticated]);

  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    const result = await syncManager.syncNow();
    if (result) setLastSyncResult(result);
    const stats = await getOfflineStats();
    setOfflineStats(stats);
    return result;
  }, []);

  const refreshStats = useCallback(async () => {
    const stats = await getOfflineStats();
    setOfflineStats(stats);
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        lastSyncResult,
        syncNow,
        offlineStats,
        refreshStats,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
