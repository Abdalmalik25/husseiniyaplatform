import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import type { OfflineQueueItem } from "@/modules/pos/types";

const STORAGE_KEY = "pos_offline_queue";
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;
const SYNC_INTERVAL = 30000;

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (!isSyncing && !processingRef.current) {
          processQueue();
        }
      }, SYNC_INTERVAL);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    }
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, queue.length]);

  const addToQueue = useCallback((item: Omit<OfflineQueueItem, "id" | "timestamp" | "retries">) => {
    const newItem: OfflineQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
      maxRetries: item.maxRetries || MAX_RETRIES,
    };
    setQueue(prev => [...prev, newItem]);
    return newItem.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const retryItem = useCallback((id: string) => {
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, retries: 0 } : item
    ));
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queue.length === 0 || !isOnline) return;

    processingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    const itemsToProcess = [...queue].sort((a, b) => a.timestamp - b.timestamp);

    for (const item of itemsToProcess) {
      if (item.retries >= item.maxRetries) {
        console.warn(`Item ${item.id} exceeded max retries, removing from queue`);
        removeFromQueue(item.id);
        continue;
      }

      try {
        await processItem(item);
        removeFromQueue(item.id);
      } catch (error) {
        const newRetries = item.retries + 1;
        setQueue(prev => prev.map(i =>
          i.id === item.id ? { ...i, retries: newRetries } : i
        ));

        if (newRetries >= item.maxRetries) {
          console.error(`Item ${item.id} failed after ${newRetries} retries:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * newRetries));
      }
    }

    setLastSync(Date.now());
    setIsSyncing(false);
    processingRef.current = false;
  }, [queue, isOnline, removeFromQueue]);

  const processItem = async (item: OfflineQueueItem): Promise<void> => {
    switch (item.type) {
      case "sale":
        // For offline queue, we can't use fetch for mutations, so we'll just log
        console.log("Processing offline sale:", item.payload);
        break;
      case "return":
        console.warn("Returns not yet supported in offline queue");
        break;
      case "payment":
        console.warn("Payments not yet supported in offline queue");
        break;
      case "stock_adjustment":
        console.warn("Stock adjustments not yet supported in offline queue");
        break;
      default:
        throw new Error(`Unknown queue item type: ${(item as any).type}`);
    }
  };

  const forceSync = useCallback(() => {
    if (isOnline && !isSyncing) {
      processQueue();
    }
  }, [isOnline, isSyncing, processQueue]);

  const getQueueStats = useCallback(() => {
    const byType = queue.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pendingRetries = queue.filter(item => item.retries > 0).length;
    const failedItems = queue.filter(item => item.retries >= item.maxRetries).length;

    return {
      total: queue.length,
      byType,
      pendingRetries,
      failedItems,
      oldestItem: queue.length > 0 ? Math.min(...queue.map(i => i.timestamp)) : null,
    };
  }, [queue]);

  return {
    queue,
    isOnline,
    isSyncing,
    lastSync,
    syncError,
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryItem,
    forceSync,
    getQueueStats,
  };
}

export function useOfflineSupport() {
  const { queue, isOnline, isSyncing, addToQueue, removeFromQueue, clearQueue, retryItem, forceSync, getQueueStats } = useOfflineQueue();

  const queueSale = useCallback((saleData: any) => {
    return addToQueue({ type: "sale", payload: saleData, maxRetries: 5 });
  }, [addToQueue]);

  const queueReturn = useCallback((returnData: any) => {
    return addToQueue({ type: "return", payload: returnData, maxRetries: 5 });
  }, [addToQueue]);

  const queuePayment = useCallback((paymentData: any) => {
    return addToQueue({ type: "payment", payload: paymentData, maxRetries: 5 });
  }, [addToQueue]);

  const queueStockAdjustment = useCallback((adjustmentData: any) => {
    return addToQueue({ type: "stock_adjustment", payload: adjustmentData, maxRetries: 5 });
  }, [addToQueue]);

  return {
    queue,
    isOnline,
    isSyncing,
    lastSync: null,
    syncError: null,
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryItem,
    forceSync,
    getQueueStats,
    queueSale,
    queueReturn,
    queuePayment,
    queueStockAdjustment,
    pendingCount: queue.length,
  };
}