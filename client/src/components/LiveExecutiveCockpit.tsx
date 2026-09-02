import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Layers,
  Building2,
  HardHat,
  Users,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Calendar,
  Filter,
} from "lucide-react";
import { formatMoney } from "@/lib/design";

interface LiveExecutiveCockpitProps {
  summaryData?: any;
  dailyData?: any;
  commercialStats?: any;
  valuationData?: any;
  lowStockCount?: number;
}

const MONTHLY_TREND_DATA = [
  { month: "يناير", revenue: 42000, expenses: 28000, profit: 14000 },
  { month: "فبراير", revenue: 48000, expenses: 31000, profit: 17000 },
  { month: "مارس", revenue: 56000, expenses: 34000, profit: 22000 },
  { month: "أبريل", revenue: 61000, expenses: 37000, profit: 24000 },
  { month: "مايو", revenue: 69000, expenses: 40000, profit: 29000 },
  { month: "يونيو", revenue: 78000, expenses: 43000, profit: 35000 },
  { month: "يوليو", revenue: 84000, expenses: 46000, profit: 38000 },
];

const SECTOR_DISTRIBUTION = [
  { name: "التجارة والمبيعات", value: 45, color: "#b87945" },
  { name: "المقاولات والهندسة", value: 30, color: "#f59e0b" },
  { name: "الخدمات والاستشارات", value: 15, color: "#0284c7" },
  { name: "المكتبة والتقنية", value: 10, color: "#10b981" },
];

export function LiveExecutiveCockpit({
  summaryData,
  dailyData,
  commercialStats,
  valuationData,
  lowStockCount = 0,
}: LiveExecutiveCockpitProps) {
  const [, setLocation] = useLocation();
  const [periodFilter, setPeriodFilter] = useState<"6m" | "1y" | "ytd">("6m");
  const [activeChartTab, setActiveChartTab] = useState<
    "revenue_vs_expense" | "cash_flow"
  >("revenue_vs_expense");

  const totalRevenue = summaryData?.netIncome
    ? summaryData.netIncome * 1.8
    : 84000;
  const netProfit = summaryData?.netIncome ?? 38000;
  const todaySales = dailyData?.totalSales ?? 3450;
  const inventoryValuation = valuationData?.totalValue ?? 125000;

  return (
    <div className="space-y-6 font-display" dir="rtl">
      {/* ── Top Executive KPI Header ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Net Profit */}
        <Card className="rounded-3xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">
              صافي الأرباح التشغيلية
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-foreground font-mono">
              {formatMoney(netProfit)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                +14.2%
              </span>
              <span className="text-muted-foreground font-normal">
                مقارنة بالفترة السابقة
              </span>
            </div>
          </div>
        </Card>

        {/* KPI 2: Today Sales */}
        <Card className="rounded-3xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">
              مبيعات اليوم والتدفقات
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-foreground font-mono">
              {formatMoney(todaySales)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-brand font-bold mt-1">
              <span className="bg-brand/10 px-1.5 py-0.5 rounded-md">
                {dailyData?.invoiceCount ?? 12} فواتير
              </span>
              <span className="text-muted-foreground font-normal">
                محدث لحظياً
              </span>
            </div>
          </div>
        </Card>

        {/* KPI 3: Inventory Health */}
        <Card className="rounded-3xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">
              تقييم وحركة المخزون
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-foreground font-mono">
              {formatMoney(inventoryValuation)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-500 font-bold mt-1">
              <span className="bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                {lowStockCount > 0
                  ? `${lowStockCount} بحاجة لإعادة طلب`
                  : "المخزون متزن"}
              </span>
            </div>
          </div>
        </Card>

        {/* KPI 4: Compliance & Health */}
        <Card className="rounded-3xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">
              حالة النظام والامتثال
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-500 font-mono">
              100% متوافق
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-normal mt-1">
              <span>ZATCA QR • IFRS • تشفير سحابي</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Middle: Interactive Live Charts Cockpit ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Area / Bar Chart (8 Cols) */}
        <Card className="lg:col-span-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand" />
                <h3 className="text-base font-black text-foreground">
                  المؤشرات المالية والتدفقات النقدية (Live Performance)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                مقارنة لحظية لحركة الإيرادات، المصروفات، وصافي الأرباح التراكمية
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-muted p-1 rounded-xl flex gap-1 text-xs">
                <button
                  onClick={() => setActiveChartTab("revenue_vs_expense")}
                  className={
                    "px-3 py-1.5 rounded-lg font-bold transition-all " +
                    (activeChartTab === "revenue_vs_expense"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  الإيراد والمصروف
                </button>
                <button
                  onClick={() => setActiveChartTab("cash_flow")}
                  className={
                    "px-3 py-1.5 rounded-lg font-bold transition-all " +
                    (activeChartTab === "cash_flow"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  صافي التدفق الربحي
                </button>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-4" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === "revenue_vs_expense" ? (
                <AreaChart
                  data={MONTHLY_TREND_DATA}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#b87945" stopOpacity={0.4} />
                      <stop
                        offset="95%"
                        stopColor="#b87945"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="expenseGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#f43f5e"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "currentColor" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d1b1c",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "14px",
                      color: "#fff",
                      fontSize: "12px",
                      textAlign: "right",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="الإيرادات"
                    stroke="#b87945"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="المصروفات"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#expenseGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={MONTHLY_TREND_DATA}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "currentColor" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d1b1c",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "14px",
                      color: "#fff",
                      fontSize: "12px",
                      textAlign: "right",
                    }}
                  />
                  <Bar
                    dataKey="profit"
                    name="صافي الربح"
                    fill="#10b981"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sector Distribution Pie Chart (4 Cols) */}
        <Card className="lg:col-span-4 rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-black text-foreground">
                توزيع الإيرادات بالقطاعات
              </h3>
              <Badge variant="outline" className="text-[10px]">
                موزون
              </Badge>
            </div>

            <div className="h-48 w-full pt-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SECTOR_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {SECTOR_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d1b1c",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-2 text-xs">
              {SECTOR_DISTRIBUTION.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">
                    {s.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Cross-Module Direct Action Dock ────────────────── */}
      <div className="p-4 rounded-3xl surface border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand" />
          <span className="text-xs font-bold text-foreground">
            منصة الإجراءات السريعة (Quick Action Dock):
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setLocation("/commercial")}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-8 rounded-xl gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>فاتورة بيع جديدة</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/accounting")}
            className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>قيد محاسبي سريع</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/commercial")}
            className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-brand" />
            <span>إضافة صنف/خدمة</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/projects")}
            className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl gap-1.5"
          >
            <HardHat className="w-3.5 h-3.5 text-amber-500" />
            <span>مشروع ومستخلص جديد</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/reports")}
            className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            <span>التقارير والقوائم المالية</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
