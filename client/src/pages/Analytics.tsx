import { useMemo, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  Building2,
  Activity,
  Calendar,
  Shield,
  Flag,
  Settings,
  HelpCircle,
  Eye,
  Download,
  Mail,
  Phone,
  Users as UsersIcon,
  LogOut,
  Sparkles,
  MapPin,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from "recharts";

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return `${AR_MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}

const PIE_COLORS = [
  "#0e2a2b",
  "#b87945",
  "#1f7a6d",
  "#d99a5b",
  "#3a8f7f",
  "#8a5a2b",
  "#56b3a3",
  "#e879f9",
];

function fmt(n: number) {
  return new Intl.NumberFormat("ar-YE", {
    maximumFractionDigits: 0,
  }).format(n);
}

function ChartCard({
  title,
  icon: Icon,
  hint,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="surface p-4 rounded-2xl flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-brand/10 text-brand">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="flex-1 min-h-[240px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

interface TimeFilterOption {
  label: string;
  value: string;
}

const TIME_FILTERS: TimeFilterOption[] = [
  { label: "آخر 3 أشهر", value: "3m" },
  { label: "السنة الحالية", value: "ytd" },
  { label: "السنة المالية", value: "fy" },
  { label: "آخر 12 شهراً", value: "12m" },
  { label: "كل الأوقات", value: "all" },
];

export default function Analytics() {
  const { data, isPending } = trpc.modules.analytics.summary.useQuery();

  const chartData = useMemo(
    () =>
      (data?.months ?? []).map(m => ({
        ...m,
        label: fmtMonth(m.month),
      })),
    [data]
  );

  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>(
    TIME_FILTERS.find(f => f.value === "12m") || TIME_FILTERS[0]
  );

  const filteredData = useMemo(() => {
    if (timeFilter.value === "all") return chartData;
    if (timeFilter.value === "3m") {
      return chartData.slice(-3);
    }
    if (timeFilter.value === "ytd") {
      const now = new Date();
      return chartData.filter(
        m =>
          new Date(m.month + "-01") <=
          new Date(now.getFullYear(), now.getMonth() + 1, 0)
      );
    }
    if (timeFilter.value === "fy") {
      // Financial year starting October
      return chartData.filter(m => {
        const [y, mo] = m.month.split("-");
        const month = Number(mo);
        return month >= 10 || month <= 3; // Oct-Mar spans two fiscal years
      });
    }
    return chartData;
  }, [chartData, timeFilter.value]);

  const summary = useMemo(() => {
    if (!data) return null;
    const months = data?.months ?? [];
    if (months.length === 0) return null;
    const lastMonth = months[months.length - 1];
    return {
      revenue: lastMonth.revenue ?? 0,
      expense: lastMonth.expense ?? 0,
      profit: (lastMonth.revenue ?? 0) - (lastMonth.expense ?? 0),
      totalRevenue: data?.totals?.revenue ?? 0,
      totalExpense: data?.totals?.expense ?? 0,
      totalProfit: data?.totals?.profit ?? 0,
    };
  }, [data]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 px-4 py-6 md:px-8 max-w-[1600px] mx-auto w-full">
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand" />
            <h1 className="text-2xl font-black text-foreground">
              التحليلات الذكية
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            لوحة بيانات تحليلية متقدمة لأداء مؤسستك.
          </p>
        </header>

        <section className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4 p-1.5 rounded-xl bg-muted/40 border border-border w-fit">
            {TIME_FILTERS.map(filter => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter)}
                className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                  timeFilter.value === filter.value
                    ? "bg-brand text-ink shadow"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            الفترة النشطة:{" "}
            <span className="font-bold text-foreground">
              {timeFilter.label}
            </span>{" "}
            · {filteredData.length} شهراً معروضة
          </p>
        </section>

        {isPending ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {summary && (
                <>
                  <StatCard
                    label="إجمالي الإيرادات"
                    value={fmt(summary.totalRevenue)}
                    tone="positive"
                    icon={TrendingUp}
                    hint="إجمالي الإيرادات للسنة"
                  />
                  <StatCard
                    label="إجمالي المصروفات"
                    value={fmt(summary.totalExpense)}
                    tone="negative"
                    icon={TrendingDown}
                    hint="إجمالي المصروفات للسنة"
                  />
                  <StatCard
                    label="صافي الربح"
                    value={fmt(summary.totalProfit)}
                    tone="info"
                    icon={Wallet}
                    hint="الصافي بعد المصاريف"
                  />
                  {summary.revenue > 0 && (
                    <StatCard
                      label="هامش الربح"
                      value={
                        summary.totalProfit > 0
                          ? `${((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)}%`
                          : "0%"
                      }
                      tone="warning"
                      icon={Eye}
                      hint="نسبة الربح إلى الإيرادات"
                    />
                  )}
                  {summary.totalExpense > 0 && (
                    <StatCard
                      label="كفاءة المصاريف"
                      value={
                        summary.totalProfit >= 0
                          ? `${(((summary.totalRevenue - summary.totalExpense) / summary.totalExpense) * 100).toFixed(1)}%`
                          : "–"
                      }
                      tone="info"
                      icon={Sparkles}
                      hint="كفاءة تشغيل المصاريف"
                    />
                  )}
                </>
              )}
            </section>

            {data?.note && (
              <p className="text-[10px] text-muted-foreground mb-4 bg-muted/50 rounded-lg p-2 border border-border">
                ملاحظة: {data.note}
              </p>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard
                title="الإيرادات مقابل المصروفات"
                icon={TrendingUp}
                hint="آخر 12 شهراً (شهري)"
              >
                <LineChart
                  data={filteredData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e8" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="الإيرادات"
                    stroke="#1f7a6d"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="المصروفات"
                    stroke="#d1495b"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ChartCard>

              <ChartCard
                title="صافي الربح الشهري"
                icon={Wallet}
                hint="ربح كل شهر"
              >
                <BarChart
                  data={filteredData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e8" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Bar
                    dataKey="profit"
                    name="صافي الربح"
                    fill="#0e2a2b"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="أعلى المنتجات مبيعاً"
                icon={Package}
                hint="حسب قيمة المبيعات"
              >
                <BarChart
                  data={[...(data?.topProducts ?? [])].reverse()}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8e8"
                    horizontal={false}
                  />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Bar
                    dataKey="total"
                    name="المبيعات"
                    fill="#b87945"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="المبيعات حسب الفرع"
                icon={Building2}
                hint="توزيع الإيرادات"
              >
                <PieChart>
                  <Pie
                    data={data?.salesByBranch ?? []}
                    dataKey="total"
                    nameKey="branch"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(e: any) => e.branch}
                  >
                    {(data?.salesByBranch ?? []).map(
                      (_: unknown, i: number) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ChartCard>

              <ChartCard
                title="مسار الإيرادات عبر الزمن"
                icon={TrendingUp}
                hint="اتجاه الإيرادات مع متوسط متحرك"
              >
                <ComposedChart
                  data={filteredData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e8" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="revenue"
                    name="الإيرادات"
                    fill="#b87945"
                    radius={[6, 6, 0, 0]}
                    barSize={18}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="اتجاه"
                    stroke="#0e2a2b"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ChartCard>

              <ChartCard
                title="التدفق النقدي التراكمي"
                icon={Activity}
                hint="صافي الربح المتراكم — مستوحى من بياناتك الحية"
              >
                <AreaChart
                  data={
                    filteredData.length
                      ? filteredData.map((d: any, i: number, arr: any[]) => ({
                          ...d,
                          cashflow: arr
                            .slice(0, i + 1)
                            .reduce(
                              (s: number, x: any) =>
                                s + (x.revenue - x.expense),
                              0
                            ),
                        }))
                      : filteredData
                  }
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1f7a6d" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#1f7a6d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e8" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cashflow"
                    name="التدفق النقدي"
                    stroke="#1f7a6d"
                    strokeWidth={2.5}
                    fill="url(#cf)"
                  />
                </AreaChart>
              </ChartCard>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
