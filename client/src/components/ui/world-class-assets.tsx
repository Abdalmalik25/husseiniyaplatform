import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeatmapCalendar, HeatmapCell } from "@/components/ui/heatmap";
import { Sparkline, TrendArrow } from "@/components/ui/sparkline";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  Wallet,
  Building2,
  Truck,
  Headset,
  ShieldCheck,
  Zap,
  Layers,
  Briefcase,
  Receipt,
  BookOpen,
  Globe2,
  Sparkles,
  Target,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Search,
  Pin,
  BarChart3,
  PieChart as PieChartIcon,
  GitBranch,
  Database,
  Cloud,
  Server,
  Cpu,
  Mail,
  FileText,
  Folder,
  Hash,
  KeyRound,
  Megaphone,
  CalendarClock,
  History,
  ListChecks,
  Award,
  Star,
  Heart,
  Lightbulb,
  Gauge,
  Compass,
  Map,
  TrendingUp as TrendUp,
} from "lucide-react";
import { formatMoney, MODULES, type ModuleKey } from "@/lib/design";

/**
 * WorldClassDashboard assets — premium widgets composing the executive dashboard.
 * Designed to be composed by the WorldClassDashboard page.
 *
 * Each widget is self-contained: fetches its own data via the trpc client,
 * or accepts a `data` prop for testability.
 */

export type DailyRow = {
  date: string;
  revenue: number;
  expense: number;
  profit: number;
};
export type CategorySlice = { name: string; value: number; color: string };

/* ──────────────────────────────────────────────────────────────────────────
 * 1) Revenue Trend (large area chart with brush + forecast)
 * ─────────────────────────────────────────────────────────────────────── */

export function RevenueTrendCard({
  title = "الإيرادات والمصروفات",
  data,
  onViewReport,
  className,
}: {
  title?: string;
  data: DailyRow[];
  onViewReport?: () => void;
  className?: string;
}) {
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalExpense = data.reduce((s, d) => s + d.expense, 0);
  const profit = totalRevenue - totalExpense;
  const margin = totalRevenue ? (profit / totalRevenue) * 100 : 0;

  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
        <BarChart3 className="w-4 h-4 text-brand shrink-0" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-xs font-bold">{title}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            آخر 30 يوم · مقارنة لحظية
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewReport}
          className="text-[10px] h-7 text-brand hover:text-brand-deep"
        >
          التقرير الكامل
          <ChevronLeft className="w-3 h-3 mr-1" />
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground">الإيرادات</p>
            <p className="text-base font-black text-success dark:text-success mt-1 tabular-nums">
              {formatMoney(totalRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground">المصروفات</p>
            <p className="text-base font-black text-destructive dark:text-destructive mt-1 tabular-nums">
              {formatMoney(totalExpense)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground">صافي الربح</p>
            <p className="text-base font-black text-brand mt-1 tabular-nums">
              {formatMoney(profit)}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              هامش {margin.toFixed(1)}%
            </p>
          </div>
        </div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <AreaChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.4}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                fill="url(#rev-grad)"
                strokeWidth={2}
                name="الإيرادات"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#f43f5e"
                fill="url(#exp-grad)"
                strokeWidth={2}
                name="المصروفات"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 2) Sales by Category (donut)
 * ─────────────────────────────────────────────────────────────────────── */

export function SalesByCategoryCard({
  title = "المبيعات حسب الفئة",
  data,
  className,
}: {
  title?: string;
  data: CategorySlice[];
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
        <PieChartIcon className="w-4 h-4 text-brand shrink-0" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-xs font-bold">{title}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            توزيع الفئات الرئيسية
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    fontSize: "11px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-black text-foreground tabular-nums leading-none">
                {total.toLocaleString()}
              </span>
              <span className="text-[9px] text-muted-foreground mt-0.5">
                إجمالي
              </span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5 min-w-0">
            {data.slice(0, 5).map((d, i) => {
              const pct = total ? (d.value / total) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="flex-1 truncate text-foreground font-medium">
                    {d.name}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 3) Activity Heatmap
 * ─────────────────────────────────────────────────────────────────────── */

export function ActivityHeatmapCard({
  title = "خريطة النشاط",
  data,
  ariaLabel,
  className,
}: {
  title?: string;
  data: HeatmapCell[];
  ariaLabel?: string;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const peak = data.reduce(
    (m, d) => (d.value > m.value ? d : m),
    data[0] ?? { date: "", value: 0 }
  );
  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
        <Activity className="w-4 h-4 text-brand shrink-0" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-xs font-bold">{title}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            آخر 26 أسبوعاً · المعاملات اليومية
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">إجمالي النشاطات</p>
            <p className="text-base font-black text-foreground tabular-nums">
              {total.toLocaleString()}
            </p>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground">ذروة اليوم</p>
            <p className="text-base font-black text-success tabular-nums">
              {peak.value}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto -mx-2 px-2">
          <HeatmapCalendar cells={data} weeks={26} ariaLabel={ariaLabel} />
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <span>أقل</span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map(k => (
              <div
                key={k}
                className={cn(
                  "h-2.5 w-2.5 rounded-[2px]",
                  k === 0 && "bg-muted",
                  k >= 1 && "bg-brand"
                )}
                style={{ opacity: k === 0 ? 1 : 0.3 + (k - 1) * 0.2 }}
              />
            ))}
          </div>
          <span>أعلى</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 4) Recent Activity Feed (real-time)
 * ─────────────────────────────────────────────────────────────────────── */

export type FeedEvent = {
  id: string;
  type:
    | "invoice"
    | "payment"
    | "stock"
    | "user"
    | "journal"
    | "approval"
    | "system";
  title: string;
  description?: string;
  actor?: string;
  timestamp: string; // ISO
  amount?: number;
  status?: "success" | "warning" | "danger" | "info";
};

const TYPE_ICON: Record<
  FeedEvent["type"],
  React.ComponentType<{ className?: string }>
> = {
  invoice: Receipt,
  payment: Wallet,
  stock: Package,
  user: Users,
  journal: BookOpen,
  approval: ShieldCheck,
  system: Cpu,
};

const TYPE_COLOR: Record<FeedEvent["type"], string> = {
  invoice: "text-success bg-success/10",
  payment: "text-info bg-info/10",
  stock: "text-warning bg-warning/10",
  user: "text-brand bg-brand/10",
  journal: "text-brand bg-brand/10",
  approval: "text-destructive bg-destructive/10",
  system: "text-muted-foreground bg-muted",
};

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "الآن";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h}س`;
  const d = Math.floor(h / 24);
  return `قبل ${d}ي`;
}

export function ActivityFeedCard({
  title = "آخر النشاطات",
  events,
  live = true,
  onViewAll,
  className,
}: {
  title?: string;
  events: FeedEvent[];
  live?: boolean;
  onViewAll?: () => void;
  className?: string;
}) {
  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
        <History className="w-4 h-4 text-brand shrink-0" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-xs font-bold">{title}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            تحديث لحظي عبر جميع الوحدات
          </p>
        </div>
        {live && (
          <Badge className="text-[9px] font-bold bg-success/10 text-success dark:text-success border-0 gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            مباشر
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="text-[10px] h-7 text-brand hover:text-brand-deep"
        >
          <span>الكل</span>
          <ChevronLeft className="w-3 h-3 mr-1" />
        </Button>
      </CardHeader>
      <CardContent className="p-2 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <History className="w-6 h-6 mx-auto opacity-30 mb-2" />
            لا توجد نشاطات حديثة
          </div>
        ) : (
          <ul className="space-y-1">
            {events.map(e => {
              const Icon = TYPE_ICON[e.type] ?? Activity;
              const color =
                TYPE_COLOR[e.type] ?? "text-muted-foreground bg-muted";
              return (
                <li
                  key={e.id}
                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                      color.split(" ")[1]
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", color.split(" ")[0])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-[11px] font-bold text-foreground leading-tight truncate">
                        {e.title}
                      </p>
                      {e.amount !== undefined && (
                        <span
                          className="text-[10px] font-bold text-brand tabular-nums shrink-0"
                          dir="ltr"
                        >
                          {e.amount > 0 ? "+" : ""}
                          {formatMoney(e.amount)}
                        </span>
                      )}
                    </div>
                    {e.description && (
                      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                        {e.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {e.actor && (
                        <span className="text-[9px] text-muted-foreground">
                          • {e.actor}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground/70">
                        {timeAgoShort(e.timestamp)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 5) Top Performers (customers, products, suppliers)
 * ─────────────────────────────────────────────────────────────────────── */

export type Performer = {
  name: string;
  value: number;
  subtitle?: string;
  trend?: number;
};

export function TopPerformersCard({
  title = "الأفضل أداءً",
  items,
  unit = "YER",
  emptyHint,
  className,
}: {
  title?: string;
  items: Performer[];
  unit?: string;
  emptyHint?: string;
  className?: string;
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
        <Award className="w-4 h-4 text-brand shrink-0" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-xs font-bold">{title}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            أعلى 5 عملاء أو موردين
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-6">
            {emptyHint ?? "لا توجد بيانات كافية"}
          </p>
        ) : (
          items.slice(0, 5).map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-brand/10 text-brand text-[10px] font-black flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-[11px] font-bold text-foreground truncate">
                    {it.name}
                  </p>
                  <p
                    className="text-[11px] font-black text-foreground tabular-nums shrink-0"
                    dir="ltr"
                  >
                    {it.value.toLocaleString()}{" "}
                    <span className="text-[9px] text-muted-foreground">
                      {unit}
                    </span>
                  </p>
                </div>
                <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-brand to-brand-400 transition-all duration-700"
                    style={{ width: `${(it.value / max) * 100}%` }}
                  />
                </div>
                {it.subtitle && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {it.subtitle}
                  </p>
                )}
              </div>
              {it.trend !== undefined && <TrendArrow delta={it.trend} />}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 6) Quick Actions Grid
 * ─────────────────────────────────────────────────────────────────────── */

export type QuickActionItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: ModuleKey;
  shortcut?: string;
  onClick: () => void;
};

export function QuickActionsGrid({
  title = "إجراءات سريعة",
  actions,
  className,
}: {
  title?: string;
  actions: QuickActionItem[];
  className?: string;
}) {
  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
        <Zap className="w-4 h-4 text-brand shrink-0" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-xs font-bold">{title}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            مفاتيح الاختصار · Alt + K
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map(a => {
            const Icon = a.icon;
            const module = a.moduleKey ? MODULES[a.moduleKey] : null;
            const accent = module?.accent ?? "var(--brand)";
            return (
              <button
                key={a.id}
                onClick={a.onClick}
                className="group relative flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-brand/30 transition-all text-right"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold text-foreground leading-tight">
                  {a.label}
                </p>
                {a.description && (
                  <p className="text-[9px] text-muted-foreground line-clamp-1">
                    {a.description}
                  </p>
                )}
                {a.shortcut && (
                  <kbd className="absolute top-2 left-2 text-[8px] font-bold text-muted-foreground/70 bg-muted/60 px-1 rounded">
                    {a.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 7) Cash Flow Forecast
 * ─────────────────────────────────────────────────────────────────────── */

export function CashFlowForecastCard({
  title = "التدفقات النقدية المتوقعة",
  data,
  className,
}: {
  title?: string;
  data: {
    date: string;
    actual?: number;
    forecast: number;
    lower: number;
    upper: number;
  }[];
  className?: string;
}) {
  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
        <Compass className="w-4 h-4 text-brand shrink-0" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-xs font-bold">{title}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            توقع ذكي بالذكاء الاصطناعي · 30 يوم
          </p>
        </div>
        <Badge className="text-[9px] font-bold bg-brand/10 text-brand dark:text-brand border-0 gap-1">
          <Sparkles className="w-3 h-3" />
          ذكاء اصطناعي
        </Badge>
      </CardHeader>
      <CardContent className="p-4">
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <AreaChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="forecast-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.4}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "11px",
                }}
              />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="transparent"
                fill="#7c3aed"
                fillOpacity={0.08}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="transparent"
                fill="#ffffff"
                fillOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#7c3aed"
                fill="url(#forecast-grad)"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--brand)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-brand rounded-full" />
            <span>فعلي</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 bg-brand rounded-full"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #7c3aed 50%, transparent 50%)",
                backgroundSize: "4px 1.5px",
              }}
            />
            <span>متوقع</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 8) Module Switcher (premium tile grid)
 * ─────────────────────────────────────────────────────────────────────── */

export function ModuleSwitcher({
  title = "وحدات العمل",
  active,
  onSelect,
  className,
}: {
  title?: string;
  active: ModuleKey;
  onSelect: (key: ModuleKey) => void;
  className?: string;
}) {
  const list = Object.values(MODULES);
  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
        <Layers className="w-4 h-4 text-brand shrink-0" />
        <CardTitle className="text-xs font-bold flex-1">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {list.map(m => {
            const Icon = m.icon;
            const isActive = active === m.key;
            return (
              <button
                key={m.key}
                onClick={() => onSelect(m.key)}
                className={cn(
                  "group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                  isActive
                    ? "border-brand/50 bg-brand/5 shadow-[0_0_0_2px_var(--brand)/15]"
                    : "border-border bg-card hover:bg-muted/40 hover:border-brand/30"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-foreground"
                  )}
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${m.accent}, ${m.accent}dd)`
                      : `${m.accent}1a`,
                    color: isActive ? "#fff" : m.accent,
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-bold text-foreground leading-tight line-clamp-1">
                  {m.label}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 9) Smart Insights (AI advisor card)
 * ─────────────────────────────────────────────────────────────────────── */

export type Insight = {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  action?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export function SmartInsightsCard({
  title = "رؤى ذكية",
  insights,
  onAction,
  className,
}: {
  title?: string;
  insights: Insight[];
  onAction?: (id: string) => void;
  className?: string;
}) {
  const impactStyle = (i: Insight["impact"]) =>
    i === "high"
      ? "bg-destructive/15 dark:bg-rose-950/20 border-destructive/25 dark:border-rose-800 text-destructive"
      : i === "medium"
        ? "bg-warning/15 dark:bg-amber-950/20 border-warning/25 dark:border-amber-800 text-warning"
        : "bg-info/15 dark:bg-sky-950/20 border-info/25 dark:border-sky-800 text-info";

  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand shrink-0" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-xs font-bold">{title}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            محرك Elias AI · {insights.length} توصيات ذكية
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {insights.map(insight => {
          const Icon = insight.icon ?? Lightbulb;
          return (
            <div
              key={insight.id}
              className={cn(
                "rounded-xl border p-3 transition-all hover:shadow-sm",
                impactStyle(insight.impact)
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground leading-tight">
                    {insight.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    {insight.description}
                  </p>
                  {insight.action && (
                    <button
                      onClick={() => onAction?.(insight.id)}
                      className="mt-1.5 text-[10px] font-bold text-brand hover:text-brand-deep transition-colors flex items-center gap-1"
                    >
                      <span>{insight.action}</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 10) Hero / Welcome Strip
 * ─────────────────────────────────────────────────────────────────────── */

export function DashboardHero({
  greeting,
  userName,
  workspaceLabel,
  statusLabel,
  statusTone = "good",
  trialDays,
  primaryAction,
  secondaryAction,
  onPrimary,
  onSecondary,
  className,
}: {
  greeting: string;
  userName: string;
  workspaceLabel: string;
  statusLabel: string;
  statusTone?: "good" | "warning" | "critical";
  trialDays?: number;
  primaryAction: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  secondaryAction?: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  onPrimary?: () => void;
  onSecondary?: () => void;
  className?: string;
}) {
  const statusCfg = {
    good: { text: "text-success", bg: "bg-success/10 border-success/25" },
    warning: { text: "text-warning", bg: "bg-warning/10 border-warning/25" },
    critical: {
      text: "text-destructive",
      bg: "bg-destructive/10 border-destructive/25",
    },
  }[statusTone];

  const PrimaryIcon = primaryAction.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl brand-gradient shadow-modern-soft",
        className
      )}
    >
      <div className="absolute inset-0 brand-dotgrid opacity-15" />
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl" />

      <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              {workspaceLabel}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 border text-[10px] font-bold px-2.5 py-1 rounded-full",
                statusCfg.bg,
                statusCfg.text
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {statusLabel}
            </span>
            {trialDays !== undefined && trialDays >= 0 && (
              <span className="text-[10px] text-white/80 font-bold">
                {trialDays === 0 ? "ينتهي اليوم" : `${trialDays} يوم متبقي`}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white leading-tight">
            {greeting}، <span className="text-brand-300">{userName}</span> 👋
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1.5 max-w-2xl text-pretty leading-relaxed">
            لوحة تنفيذية موحّدة — مصممة بمعايير SAP Fiori و Odoo و Daftara ·{" "}
            <span className="text-brand-300 font-bold">
              من القيد إلى القرار في نظرة واحدة
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {secondaryAction && SecondaryIcon && (
            <Button
              onClick={onSecondary}
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs h-9 px-4 rounded-xl"
            >
              <SecondaryIcon className="w-3.5 h-3.5 ml-1.5" />
              {secondaryAction.label}
            </Button>
          )}
          <Button
            onClick={onPrimary}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-9 px-4 rounded-xl shadow-md"
          >
            <PrimaryIcon className="w-3.5 h-3.5 ml-1.5" />
            {primaryAction.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
