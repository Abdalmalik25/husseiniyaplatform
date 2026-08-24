import { useState, useCallback, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { POSSession, POSDevice, POSConfig, SalesPolicy, PaymentMethodConfig } from "@/modules/pos/types";

interface UsePOSSessionOptions {
  autoOpen?: boolean;
  openingFloat?: number;
  branchId?: number;
  deviceId?: number;
}

function mapServerSessionToClient(s: any): POSSession {
  return {
    id: s.id,
    code: s.code,
    userId: s.openedById || 0,
    userName: s.openedByName || "مستخدم",
    branchId: s.branchId || 0,
    branchName: s.branchName || "الفرع الرئيسي",
    deviceId: s.deviceId || undefined,
    deviceName: s.deviceName || undefined,
    openingFloat: parseFloat(s.openingFloat || "0"),
    closingFloat: s.closingFloat ? parseFloat(s.closingFloat) : undefined,
    expectedFloat: 0,
    status: s.status as "open" | "closed" | "suspended",
    openedAt: s.openedAt?.toString() || new Date().toISOString(),
    closedAt: s.closedAt?.toString() || undefined,
    totalSales: parseFloat(s.totalSales || "0"),
    totalRefunds: parseFloat(s.totalRefunds || "0"),
    totalDiscounts: parseFloat(s.totalDiscounts || "0"),
    totalTax: parseFloat(s.totalTax || "0"),
    invoiceCount: s.invoiceCount || 0,
    paymentBreakdown: {
      cash: 0,
      card: 0,
      transfer: 0,
      credit: 0,
      online: 0,
      cash_yer: 0,
      cash_sar: 0,
      hawala: 0,
      shabab: 0,
      mobile_money: 0,
      bank_transfer: 0,
    },
    discrepancies: [],
    notes: s.notes,
  };
}

export function usePOSSession(options: UsePOSSessionOptions = {}) {
  const { autoOpen = false, openingFloat = 0, branchId, deviceId } = options;
  const utils = trpc.useUtils();

  const [session, setSession] = useState<POSSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<POSConfig | null>(null);
  const [salesPolicy, setSalesPolicy] = useState<SalesPolicy | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [devices, setDevices] = useState<POSDevice[]>([]);

  const { data: sessionsData, refetch: refetchSessions } = trpc.modules.pos.listSessions.useQuery(
    undefined,
    { staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const { data: branchesData } = trpc.modules.branches.list.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  const { data: devicesData } = trpc.devices.list.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  const { data: settingsData } = trpc.accounting.getSettings.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  const openSessionMutation = trpc.modules.pos.openSession.useMutation({
    onSuccess: (newSession) => {
      setSession(mapServerSessionToClient(newSession));
      setError(null);
      refetchSessions();
      utils.modules.pos.listSessions.invalidate();
    },
    onError: (err) => {
      setError(err.message || "فشل فتح الوردية");
    },
  });

  const closeSessionMutation = trpc.modules.pos.closeSession.useMutation({
    onSuccess: () => {
      setSession(null);
      refetchSessions();
      utils.modules.pos.listSessions.invalidate();
    },
    onError: (err) => {
      setError(err.message || "فشل إغلاق الوردية");
    },
  });

  const activeSession = useMemo(() => {
    if (session) return session;
    const mapped = sessionsData?.map(mapServerSessionToClient);
    return mapped?.find((s: POSSession) => s.status === "open") || null;
  }, [session, sessionsData]);

  useEffect(() => {
    if (settingsData) {
      setConfig(settingsData.posConfig || null);
      setSalesPolicy(settingsData.salesPolicy || null);
      setPaymentMethods(settingsData.paymentMethods || []);
    }
  }, [settingsData]);

  useEffect(() => {
    if (devicesData) {
      const mappedDevices: POSDevice[] = devicesData
        .filter((d: any) => d.isActive && d.type === "pos")
        .map((d: any) => ({
          ...d,
          type: d.type as POSDevice["type"],
          workSiteName: d.workSiteName || d.workSiteId?.toString(),
          location: d.location || d.workSiteId?.toString(),
          fingerprint: d.fingerprint || undefined,
          os: d.os || undefined,
          appVersion: d.appVersion || undefined,
          settings: d.settings || undefined,
        }));
      setDevices(mappedDevices);
    }
  }, [devicesData]);

  const openSession = useCallback(async (customOpeningFloat?: number, customBranchId?: number, customDeviceId?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await openSessionMutation.mutateAsync({
        openingFloat: (customOpeningFloat ?? openingFloat).toString(),
        branchId: customBranchId ?? branchId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل فتح الوردية");
    } finally {
      setIsLoading(false);
    }
  }, [openSessionMutation, openingFloat, branchId, deviceId]);

  const closeSession = useCallback(async () => {
    if (!activeSession) return;
    setIsLoading(true);
    setError(null);
    try {
      await closeSessionMutation.mutateAsync({ id: activeSession.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إغلاق الوردية");
    } finally {
      setIsLoading(false);
    }
  }, [closeSessionMutation, activeSession]);

  const suspendSession = useCallback(async () => {
    if (!activeSession) return;
    setIsLoading(true);
    setError(null);
    try {
      await closeSessionMutation.mutateAsync({ id: activeSession.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تعليق الوردية");
    } finally {
      setIsLoading(false);
    }
  }, [closeSessionMutation, activeSession]);

  const resumeSession = useCallback(async () => {
    const mapped = sessionsData?.map(mapServerSessionToClient);
    const suspended = mapped?.find((s: POSSession) => s.status === "suspended");
    if (!suspended) return;
    setIsLoading(true);
    setError(null);
    try {
      await openSessionMutation.mutateAsync({
        openingFloat: "0",
        branchId: suspended.branchId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل استئناف الوردية");
    } finally {
      setIsLoading(false);
    }
  }, [openSessionMutation, sessionsData]);

  const updateFloat = useCallback(async () => {
    // Not implemented in server yet
  }, []);

  const getSessionSummary = useCallback(() => {
    if (!activeSession) return null;
    return {
      session: activeSession,
      duration: Date.now() - new Date(activeSession.openedAt).getTime(),
      expectedFloat: activeSession.openingFloat + activeSession.totalSales - activeSession.totalRefunds,
      discrepancy: 0,
    };
  }, [activeSession]);

  const isSessionOpen = !!activeSession && activeSession.status === "open";
  const isSessionSuspended = !!activeSession && activeSession.status === "suspended";

  useEffect(() => {
    if (autoOpen && !activeSession && !isLoading) {
      openSession();
    }
  }, [autoOpen, activeSession, isLoading, openSession]);

  return {
    session: activeSession,
    sessions: (sessionsData || []).map(mapServerSessionToClient),
    branches: branchesData || [],
    devices,
    config,
    salesPolicy,
    paymentMethods,
    isLoading,
    error,
    isSessionOpen,
    isSessionSuspended,
    openSession,
    closeSession,
    suspendSession,
    resumeSession,
    updateFloat,
    getSessionSummary,
    refetchSessions,
  };
}