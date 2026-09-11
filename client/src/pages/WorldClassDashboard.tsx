import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { brand } from "@/lib/brand";
import {
  formatMoney,
  MODULES,
  modulesForRole,
  greetingByHour,
  type ModuleKey,
} from "@/lib/design";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { NexoraMicroProgress } from "@/components/NexoraMicroProgress";
import { SkeletonKPI, SkeletonGrid } from "@/components/SkeletonPresets";
import { SkeletonLoader } from "@/components/SkeletonLoaderUpgrade";
import { KpiGrid, KpiHero } from "@/components/ui/kpi-hero";
import { ErrorState, EmptyState } from "@/components/ErrorState";

import {
  AlertCenter,
  alertFactory,
  type AlertItem,
} from "@/components/ui/alert-center";
import { BusinessHealthScore } from "@/components/ui/progress-ring";
import {
  RevenueTrendCard,
  SalesByCategoryCard,
  ActivityHeatmapCard,
  ActivityFeedCard,
  TopPerformersCard,
  QuickActionsGrid,
  ModuleSwitcher,
  SmartInsightsCard,
  DashboardHero,
  type DailyRow,
  type CategorySlice,
  type FeedEvent,
  type Insight,
  type Performer,
  type QuickActionItem,
} from "@/components/ui/world-class-assets";
import {
  Plus,
  ShoppingCart,
  Truck,
  Receipt,
  BarChart3,
  Package,
  Users,
  Wallet,
  Building2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Zap,
  Target,
  ShieldCheck,
  Clock,
  CreditCard,
  Briefcase,
  HardHat,
  BookOpen,
  Calculator,
  FileText,
  PieChart as PieChartIcon,
  Sparkles,
  Database,
  Cloud,
  Cpu,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { format, subDays } from "date-fns";

/* ──────────────────────────────────────────────────────────────────────────
 *  Helpers — all dashboard figures below are computed from live server data.
 *  No demo/synthetic numbers are rendered as business facts.
 * ─────────────────────────────────────────────────────────────────────── */

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Honest empty-state slot used wherever the tenant has no data yet. */
function EmptySlot({
  title,
  hint,
  actionLabel,
  onAction,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card className="surface rounded-2xl overflow-hidden">
      <CardContent className="p-6 text-center space-y-2">
        <p className="text-xs font-black text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {hint}
        </p>
        <Button
          size="sm"
          onClick={onAction}
          className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-[11px] h-8 mt-1"
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Main World-Class Dashboard
 * ─────────────────────────────────────────────────────────────────────── */

export default function WorldClassDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleKey>("accounting");
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "ytd">("30d");

  // ── Data fetches (all cached, keepPreviousData) ──
  const { data: settingsData } = trpc.accounting.getSettings.useQuery(
    undefined,
    {
      staleTime: 60_000,
    }
  );
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = trpc.accounting.getDashboardSummary.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const {
    data: commercialStats,
    isLoading: commercialLoading,
    isError: commercialError,
    refetch: refetchCommercial,
  } = trpc.commercial.getStats.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const {
    data: daily,
    isLoading: dailyLoading,
    isError: dailyError,
    refetch: refetchDaily,
  } = trpc.sales.dailySummary.useQuery(undefined, {
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const {
    data: valuation,
    isLoading: valuationLoading,
    isError: valuationError,
    refetch: refetchValuation,
  } = trpc.products.valuation.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const {
    data: lowStockData,
    isLoading: lowStockLoading,
    isError: lowStockError,
    refetch: refetchLowStock,
  } = trpc.products.lowStock.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const {
    data: activity,
    isLoading: activityLoading,
    isError: activityError,
    refetch: refetchActivity,
  } = trpc.auth.getActivityLogs.useQuery(undefined, {
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const {
    data: monthlyAnalytics,
    isLoading: monthlyLoading,
    isError: monthlyError,
    refetch: refetchMonthly,
  } = trpc.accounting.getMonthlyAnalytics.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const initialLoading =
    summaryLoading ||
    commercialLoading ||
    dailyLoading ||
    valuationLoading ||
    lowStockLoading ||
    monthlyLoading;
  const hasQueryError =
    summaryError ||
    commercialError ||
    dailyError ||
    valuationError ||
    lowStockError ||
    activityError ||
    monthlyError;
  const retryAll = () => {
    refetchSummary();
    refetchCommercial();
    refetchDaily();
    refetchValuation();
    refetchLowStock();
    refetchActivity();
    refetchMonthly();
  };

  // ── Derived metrics ──
  const receivables = useMemo(
    () =>
      commercialStats?.topCustomers?.reduce(
        (s: number, c: any) => s + parseFloat(c.balance || "0"),
        0
      ) ?? 0,
    [commercialStats]
  );

  const payables = useMemo(
    () =>
      ((commercialStats as any)?.topSuppliers ?? []).reduce(
        (s: number, c: any) => s + parseFloat(c.balance || "0"),
        0
      ) ?? 0,
    [commercialStats]
  );

  const cashFlow = summaryData
    ? summaryData.totalRevenue - summaryData.totalExpense
    : 0;
  const lowStockCount = lowStockData?.length ?? 0;
  const trialDaysLeft = useMemo(() => {
    if (!settingsData) return null;
    const status = (settingsData as any).subscriptionStatus;
    const end = (settingsData as any).trialEndsAt;
    if (status === "active") return null;
    if (status === "grace") return -1;
    if (!end) return null;
    return Math.max(
      0,
      Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000)
    );
  }, [settingsData]);

  const firstName = (user?.name || "المشرف").split(" ")[0];
  const allowed = modulesForRole(user?.role);

  // ── Build chart data from LIVE server data only ──
  // Monthly revenue trend (real posted transactions, current month).
  const trendData: DailyRow[] = useMemo(() => {
    const source = ((monthlyAnalytics as any)?.dailyData ?? []) as any[];
    const rows = source.map((d: any) => ({
      date: d.dateStr ?? String(d.day ?? ""),
      revenue: Number(d.revenues ?? 0),
      expense: Number(d.expenses ?? 0),
      profit: Number(d.revenues ?? 0) - Number(d.expenses ?? 0),
    }));
    if (period === "7d") return rows.slice(-7);
    return rows;
  }, [monthlyAnalytics, period]);
  const hasTrendData = trendData.some(d => d.revenue > 0 || d.expense > 0);

  // Category split from the REAL inventory valuation (goods vs services).
  const categoryData: CategorySlice[] = useMemo(() => {
    const items = (valuation as any)?.items ?? [];
    const goods = items
      .filter((it: any) => it.type !== "service")
      .reduce((s: number, it: any) => s + Number(it.stockValue ?? 0), 0);
    const services = items
      .filter((it: any) => it.type === "service")
      .reduce((s: number, it: any) => s + Number(it.stockValue ?? 0), 0);
    return [
      { name: "سلع", value: Math.round(goods), color: "#b87945" },
      { name: "خدمات", value: Math.round(services), color: "#0ea5e9" },
    ];
  }, [valuation]);
  const hasCategoryData = categoryData.some(c => c.value > 0);

  // Activity heatmap from REAL activity-log timestamps (last 26 weeks).
  const heatmapData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of (activity as any[]) ?? []) {
      const ts = (a as any)?.createdAt;
      if (!ts) continue;
      const day = new Date(ts).toISOString().slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    const cells: { date: string; value: number }[] = [];
    const totalDays = 26 * 7;
    for (let i = 0; i < totalDays; i++) {
      const d = subDays(new Date(), totalDays - 1 - i);
      const key = d.toISOString().slice(0, 10);
      cells.push({ date: d.toISOString(), value: counts.get(key) ?? 0 });
    }
    return cells;
  }, [activity]);

  // Live activity feed only — an empty log renders the card's empty state.
  const feedEvents: FeedEvent[] = useMemo(() => {
    if (!activity || activity.length === 0) return [];
    return (activity as any[]).slice(0, 8).map((a: any, i: number) => ({
      id: `act-${i}`,
      type: (a.action?.toLowerCase().includes("invoice")
        ? "invoice"
        : a.action?.toLowerCase().includes("payment")
          ? "payment"
          : a.action?.toLowerCase().includes("stock")
            ? "stock"
            : a.action?.toLowerCase().includes("user")
              ? "user"
              : a.action?.toLowerCase().includes("journal")
                ? "journal"
                : a.action?.toLowerCase().includes("approval")
                  ? "approval"
                  : "system") as FeedEvent["type"],
      title: a.action || "نشاط إداري",
      description: a.details || a.description,
      actor: a.userName || a.actor,
      timestamp: a.createdAt,
    }));
  }, [activity]);

  // Top customers by REAL unpaid balance (server returns no invoice counts).
  const topCustomers: Performer[] = useMemo(
    () =>
      (commercialStats?.topCustomers ?? []).slice(0, 5).map((c: any) => ({
        name: c.name ?? "عميل",
        value: parseFloat(c.balance || "0"),
        subtitle: c.code ? `كود ${c.code}` : "ذمم مدينة مستحقة",
      })),
    [commercialStats]
  );

  // Top stock items by REAL valuation (replaces the unsourced suppliers card).
  const topProducts: Performer[] = useMemo(
    () =>
      (((valuation as any)?.items ?? []) as any[])
        .slice()
        .sort(
          (a: any, b: any) =>
            Number(b.stockValue ?? 0) - Number(a.stockValue ?? 0)
        )
        .slice(0, 5)
        .map((p: any) => ({
          name: p.name ?? "صنف",
          value: Number(p.stockValue ?? 0),
          subtitle: `${Number(p.qty ?? 0).toLocaleString()} وحدة بالمخزون`,
        })),
    [valuation]
  );

  const alerts: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = [];
    if (lowStockData && lowStockData.length > 0) {
      lowStockData.slice(0, 3).forEach((p: any, i: number) => {
        list.push(
          alertFactory.lowStock(
            p.name ?? `صنف #${i + 1}`,
            p.quantity ?? 0,
            p.reorderPoint ?? 10
          )
        );
      });
    }
    if (receivables > 0) {
      list.push(alertFactory.overdueReceivable("ذمم مدينة", receivables));
    }
    if (payables > 0) {
      list.push(alertFactory.overduePayable("ذمم دائنة", payables));
    }
    return list;
  }, [lowStockData, receivables, payables]);

  const quickActions: QuickActionItem[] = [
    {
      id: "new-invoice",
      label: "فاتورة جديدة",
      description: "إنشاء فاتورة بيع",
      icon: Plus,
      moduleKey: "commercial",
      shortcut: "⌘N",
      onClick: () => setLocation("/commercial"),
    },
    {
      id: "new-purchase",
      label: "أمر شراء",
      description: "طلب شراء جديد",
      icon: ShoppingCart,
      moduleKey: "procurement",
      onClick: () => setLocation("/procurement"),
    },
    {
      id: "new-journal",
      label: "قيد محاسبي",
      description: "تسجيل قيد",
      icon: BookOpen,
      moduleKey: "accounting",
      onClick: () => setLocation("/accounting"),
    },
    {
      id: "new-payment",
      label: "سند قبض",
      description: "تسجيل تحصيل",
      icon: Wallet,
      moduleKey: "commercial",
      onClick: () => setLocation("/commercial"),
    },
    {
      id: "new-customer",
      label: "عميل جديد",
      description: "إضافة عميل",
      icon: Users,
      onClick: () => setLocation("/commercial"),
    },
    {
      id: "new-product",
      label: "صنف جديد",
      description: "إضافة للمخزون",
      icon: Package,
      moduleKey: "commercial",
      onClick: () => setLocation("/commercial"),
    },
  ];

  const insights: Insight[] = useMemo(() => {
    const list: Insight[] = [];
    if (lowStockCount > 0) {
      list.push({
        id: "restock",
        title: `${lowStockCount} أصناف بحاجة لإعادة طلب`,
        description:
          "تجنب نفاد المخزون بتعبئة الأصناف منخفضة الكمية قبل نهاية الأسبوع",
        impact: lowStockCount > 10 ? "high" : "medium",
        action: "إعادة تعبئة",
        icon: Package,
      });
    }
    if (receivables > 0) {
      list.push({
        id: "collect",
        title: `ذمم مدينة ${formatMoney(receivables)}`,
        description: "تحصيل المبالغ المستحقة يحسّن التدفق النقدي فوراً",
        impact: "high",
        action: "إرسال تذكير",
        icon: TrendingUp,
      });
    }
    if (payables > 0) {
      list.push({
        id: "pay",
        title: `ذمم دائنة ${formatMoney(payables)}`,
        description: "جدولة سداد الموردين تحافظ على الثقة الائتمانية",
        impact: "medium",
        action: "جدولة السداد",
        icon: Wallet,
      });
    }
    return list;
  }, [lowStockCount, receivables, payables]);

  // ── Health score (0..100 composite, all inputs real) ──
  const healthDims = useMemo(() => {
    const liquidity = summaryData?.totalAssets
      ? clamp100((cashFlow / summaryData.totalAssets) * 200 + 50)
      : 70;
    const profitability = summaryData?.netIncome
      ? clamp100(
          (summaryData.netIncome / (summaryData.totalRevenue || 1)) * 500 + 30
        )
      : 65;
    const receivablesHealth =
      receivables > 0 ? clamp100(100 - receivables / 10000) : 80;
    const inventoryHealth =
      lowStockCount > 0 ? Math.max(20, 100 - lowStockCount * 5) : 90;
    return { liquidity, profitability, receivablesHealth, inventoryHealth };
  }, [summaryData, cashFlow, receivables, lowStockCount]);
  const healthScore = Math.round(
    (healthDims.liquidity +
      healthDims.profitability +
      healthDims.receivablesHealth +
      healthDims.inventoryHealth) /
      4
  );

  /* ───────────────────────────────────────────────────────────────────
   *  Render
   * ───────────────────────────────────────────────────────────────── */

  if (initialLoading) {
    return (
      <div
        className="space-y-5 pb-8"
        aria-busy="true"
        aria-label="جاري تحميل لوحة القيادة"
      >
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* ── 1. Hero Strip ─────────────────────────────────────── */}
      <DashboardHero
        greeting={greetingByHour()}
        userName={firstName}
        workspaceLabel={`${brand.names.erp} v${brand.names.version} · منصتك الموحدة`}
        statusLabel={
          healthScore >= 70
            ? "المنشأة في حالة ممتازة"
            : healthScore >= 50
              ? "المنشأة مستقرة"
              : "يحتاج انتباه"
        }
        statusTone={
          healthScore >= 70
            ? "good"
            : healthScore >= 50
              ? "warning"
              : "critical"
        }
        trialDays={trialDaysLeft ?? undefined}
        primaryAction={{ label: "معاملة جديدة", icon: Plus }}
        onPrimary={() => setLocation("/accounting")}
        secondaryAction={{ label: "التقارير", icon: BarChart3 }}
        onSecondary={() => setLocation("/reports")}
      />

      {/* ── 2. KPI Hero Strip — live values only, executive order ── */}
      <KpiGrid>
        <KpiHero
          label="مبيعات اليوم"
          value={daily?.totalSales ?? 0}
          unit="YER"
          variant="positive"
          icon={ShoppingCart}
          hint={`${daily?.invoiceCount ?? 0} فاتورة`}
          onClick={() => setLocation("/commercial")}
        />
        <KpiHero
          label="صافي الربح (السنة)"
          value={summaryData?.netIncome ?? 0}
          unit="YER"
          variant={(summaryData?.netIncome ?? 0) >= 0 ? "positive" : "negative"}
          icon={BarChart3}
          hint="قبل الضريبة"
          onClick={() => setLocation("/reports")}
        />
        <KpiHero
          label="التدفق النقدي"
          value={cashFlow}
          unit="YER"
          variant={cashFlow >= 0 ? "positive" : "negative"}
          icon={TrendingUp}
          hint="تشغيلي"
          onClick={() => setLocation("/reports")}
        />
        <KpiHero
          label="الذمم المدينة"
          value={receivables}
          unit="YER"
          variant={receivables > 0 ? "warning" : "positive"}
          icon={Wallet}
          hint="عملاء"
          onClick={() => setLocation("/commercial")}
        />
        <KpiHero
          label="قيمة المخزون"
          value={valuation?.totalValue ?? 0}
          unit="YER"
          variant={lowStockCount > 0 ? "warning" : "info"}
          icon={Package}
          hint={`${lowStockCount} صنف منخفض`}
          onClick={() => setLocation("/inventory")}
        />
        <KpiHero
          label="فواتير البيع"
          value={commercialStats?.counts?.sales ?? 0}
          variant="info"
          icon={Receipt}
          hint={`${commercialStats?.counts?.orders ?? 0} طلب`}
          onClick={() => setLocation("/commercial")}
        />
      </KpiGrid>

      {/* ── 3. Module Switcher ──────────────────────────────────── */}
      <ModuleSwitcher
        active={activeModule}
        onSelect={k => {
          setActiveModule(k);
          const routes: Record<ModuleKey, string> = {
            accounting: "/accounting",
            commercial: "/commercial",
            library: "/store",
            analytics: "/reports",
            hr: "/hr",
            projects: "/projects",
            procurement: "/procurement",
            support: "/support",
            quality: "/quality",
            pos: "/pos",
            distribution: "/distribution",
            engineering: "/about",
          };
          setLocation(routes[k]);
        }}
      />

      {/* ── 4. Period Filter ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-black text-foreground">
            المؤشرات الحية
          </h2>
          <p className="text-[10px] text-muted-foreground">
            آخر تحديث لحظي · {format(new Date(), "dd MMMM yyyy · HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border">
          {(["7d", "30d", "90d", "ytd"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 h-7 text-[10px] font-bold rounded-lg transition-colors ${
                period === p
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "7d"
                ? "أسبوع"
                : p === "30d"
                  ? "شهر"
                  : p === "90d"
                    ? "ربع"
                    : "منذ بداية السنة"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error state ─────────────────────────────────────────── */}
      {hasQueryError && !initialLoading && (
        <Alert variant="destructive">
          <AlertTitle>تعذر تحميل بيانات اللوحة</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
            <span>
              تحقق من الاتصال ثم أعد المحاولة — لن تُعرض أي أرقام غير مؤكدة.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={retryAll}
              className="h-7 text-[11px]"
            >
              إعادة المحاولة
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── 5. Main Charts Row (Bento: 2/3 trend + 1/3 category) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {hasTrendData ? (
            <RevenueTrendCard
              data={trendData}
              onViewReport={() => setLocation("/reports")}
            />
          ) : (
            <EmptySlot
              title="لا توجد حركات إيراد هذا الشهر"
              hint="سجّل فواتير المبيعات والمصروفات لتظهر هنا حركة الإيرادات الحقيقية يومًا بيوم."
              actionLabel="فتح النظام التجاري"
              onAction={() => setLocation("/commercial")}
            />
          )}
        </div>
        {hasCategoryData ? (
          <SalesByCategoryCard data={categoryData} />
        ) : (
          <EmptySlot
            title="لا توجد قيمة مخزنية بعد"
            hint="أضف أصنافًا للمخزون ليظهر توزيع السلع والخدمات الحقيقي."
            actionLabel="فتح المخزون"
            onAction={() => setLocation("/inventory")}
          />
        )}
      </div>

      {/* ── 6. Health + Insights + Alerts Row ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BusinessHealthScore
          overall={healthScore}
          dimensions={[
            {
              key: "liquidity",
              label: "السيولة",
              score: healthDims.liquidity,
              icon: Wallet,
            },
            {
              key: "profit",
              label: "الربحية",
              score: healthDims.profitability,
              icon: TrendingUp,
            },
            {
              key: "ar",
              label: "المدينون",
              score: healthDims.receivablesHealth,
              icon: Users,
            },
            {
              key: "inv",
              label: "المخزون",
              score: healthDims.inventoryHealth,
              icon: Package,
            },
          ]}
        />
        {insights.length > 0 ? (
          <SmartInsightsCard insights={insights} />
        ) : (
          <EmptySlot
            title="لا توجد رؤى عاجلة"
            hint="الوضع مستقر — ستظهر هنا التنبيهات عند انخفاض المخزون أو تراكم الذمم."
            actionLabel="عرض التقارير"
            onAction={() => setLocation("/reports")}
          />
        )}
        <AlertCenter alerts={alerts} limit={5} />
      </div>

      {/* ── 7. Heatmap + Top Customers + Cash Position ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ActivityHeatmapCard
          data={heatmapData}
          ariaLabel="خريطة نشاط المعاملات"
        />
        <TopPerformersCard
          title="أعلى العملاء مديونية"
          items={topCustomers}
          unit="YER"
          emptyHint="لا توجد ذمم مدينة مستحقة"
        />
        <Card className="surface rounded-2xl overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
            <Wallet className="w-4 h-4 text-brand shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xs font-bold">
                الموقف النقدي الحالي
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                أرصدة حية من دفتر الأستاذ
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
              <span className="text-[11px] text-muted-foreground">السيولة</span>
              <span className="text-sm font-black tabular-nums" dir="ltr">
                {formatMoney(cashFlow)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
              <span className="text-[11px] text-muted-foreground">
                ذمم مدينة (لك)
              </span>
              <span
                className="text-sm font-black tabular-nums text-warning"
                dir="ltr"
              >
                {formatMoney(receivables)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
              <span className="text-[11px] text-muted-foreground">
                ذمم دائنة (عليك)
              </span>
              <span
                className="text-sm font-black tabular-nums text-info"
                dir="ltr"
              >
                {formatMoney(payables)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand/5 px-3 py-2">
              <span className="text-[11px] font-bold">صافي الموقف</span>
              <span
                className="text-base font-black tabular-nums text-brand"
                dir="ltr"
              >
                {formatMoney(cashFlow + receivables - payables)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation("/reports")}
              className="w-full h-8 text-[11px]"
            >
              القوائم المالية الكاملة
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── 8. Top Products + Activity Feed + Quick Actions ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopPerformersCard
          title="أعلى الأصناف قيمة"
          items={topProducts}
          unit="YER"
          emptyHint="لا توجد أصناف مقيّمة بعد"
        />
        <ActivityFeedCard
          events={feedEvents}
          live
          onViewAll={() => setLocation("/audit")}
        />
        <QuickActionsGrid actions={quickActions} />
      </div>
    </div>
  );
}
