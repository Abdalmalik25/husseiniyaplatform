/**
 * ScreenLifecycle — Lifecycle management for dashboard screens
 *
 * Manages: initial-loading, data-loading, error, empty, ready states
 * Provides unified API surface for screens.
 *
 * Phases:
 *   idle        — no query in flight
 *   loading     — initial data fetch
 *   ready       — data available
 *   error       — fetch failed (recoverable)
 *   empty       — data empty (business empty, not error)
 *   stale       — data present but stale (background refresh)
 */

import React from "react";
import { trpc } from "@/lib/trpc";

export type ScreenPhase = "idle" | "loading" | "ready" | "error" | "empty" | "stale";

export interface ScreenLifecycleProps<TData> {
  /** Query result from trpc */
  query: ReturnType<typeof trpc.accounting.getDashboardSummary.useQuery>;
  /** Whether this is the initial load (first paint) */
  isInitial?: boolean;
  /** Override phase for testing */
  phase?: ScreenPhase;
  /** Render when loading */
  children: (phase: ScreenPhase, data: TData | undefined) => React.ReactNode;
  /** Render when error */
  onError?: (error: unknown, retry: () => void) => React.ReactNode;
  /** Render when empty */
  onEmpty?: () => React.ReactNode;
  /** Render when stale (background refresh) */
  onStale?: () => React.ReactNode;
  /** Custom error mapping */
  mapError?: (error: unknown) => { isBusinessError: boolean; message: string };
}

/**
 * Hook version: returns phase + helpers
 */
export function useScreenLifecycle<TData>({
  query,
  isInitial = false,
  phase: forcedPhase,
  mapError,
}: {
  query: ReturnType<typeof trpc.accounting.getDashboardSummary.useQuery>;
  isInitial?: boolean;
  phase?: ScreenPhase;
  mapError?: (error: unknown) => { isBusinessError: boolean; message: string };
}) {
  const phase: ScreenPhase =
    forcedPhase ??
    ((() => {
      if (isInitial) return "loading";
      if (query.isError) return "error";
      if (query.isPending) return "loading";
      if (!query.data) return "empty";
      return "ready";
    })());

  const retry = React.useCallback(() => {
    query.refetch();
  }, [query]);

  const mapErrorResult = React.useMemo(() => {
    if (!mapError) return { isBusinessError: false, message: "حدث خطأ غير متوقع" };
    try {
      return mapError(query.error);
    } catch {
      return { isBusinessError: false, message: "حدث خطأ غير متوقع" };
    }
  }, [query.error, mapError]);

  return {
    phase,
    data: query.data as TData | undefined,
    isLoading: query.isPending,
    isError: query.isError,
    isEmpty: !query.data && !query.isError && !query.isPending,
    retry,
    error: query.error,
    errorInfo: mapErrorResult,
  };
}
export function ScreenLifecycle<TData>({
  query,
  isInitial,
  phase: forcedPhase,
  children,
  onError,
  onEmpty,
  onStale,
  mapError,
}: ScreenLifecycleProps<TData>) {
  const lifecycle = useScreenLifecycle<TData>({
    query,
    isInitial,
    phase: forcedPhase,
    mapError,
  });

  if (lifecycle.phase === "loading") {
    return children(lifecycle.phase, lifecycle.data);
  }
  if (lifecycle.phase === "error" && onError) {
    return onError(lifecycle.error, lifecycle.retry);
  }
  if (lifecycle.phase === "empty" && onEmpty) {
    return onEmpty();
  }
  if (lifecycle.phase === "stale" && onStale) {
    return onStale();
  }
  return children(lifecycle.phase, lifecycle.data);
}

export default ScreenLifecycle;
