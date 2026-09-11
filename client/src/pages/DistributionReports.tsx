/**
 * client/src/pages/DistributionReports.tsx
 * شاشة تقارير التوزيع والمبيعات — Distribution Reports Center
 * IAS/IFRS 15, ASC 606, IFRS 9, Pareto 80/20
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  BarChart3,
  Download,
  RefreshCw,
  Sparkles,
  MapPin,
  Users,
  Package,
  Target,
  Award,
  TrendingUp,
  Wallet,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  Globe2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtYER } from "@/lib/format";

const DEMO_CUSTOMERS = [
  {
    name: "مؤسسة النور التجارية",
    city: "صنعاء",
    total: 18450000,
    orders: 24,
    share: 22,
  },
  {
    name: "شركة الفجر للتوزيع",
    city: "عدن",
    total: 14220000,
    orders: 18,
    share: 17,
  },
  { name: "متجر الإخاء", city: "تعز", total: 9350000, orders: 15, share: 11 },
  {
    name: "مكتبة البركة",
    city: "حضرموت",
    total: 7890000,
    orders: 12,
    share: 9,
  },
  { name: "سوبرماركت اليمن", city: "إب", total: 6120000, orders: 9, share: 7 },
  {
    name: "مؤسسة السلام",
    city: "الحديدة",
    total: 4750000,
    orders: 8,
    share: 6,
  },
  { name: "محلات الشامي", city: "صنعاء", total: 3900000, orders: 7, share: 5 },
  { name: "بقالة الخير", city: "لحج", total: 2800000, orders: 5, share: 3 },
];
const DEMO_PRODUCTS = [
  { name: "زيت السمسم 5 لتر", units: 1240, revenue: 7440000, growth: 18 },
  { name: "أرز بسمتي 25 كجم", units: 980, revenue: 9800000, growth: 12 },
  { name: "سكر أبيض 10 كجم", units: 1560, revenue: 5460000, growth: 8 },
  { name: "دقيق قمح 50 كجم", units: 720, revenue: 4320000, growth: -3 },
  { name: "شاي أحمد 1 كجم", units: 1100, revenue: 2750000, growth: 22 },
  { name: "حليب بودرة 2 كجم", units: 850, revenue: 2550000, growth: 5 },
];
const DEMO_REGIONS = [
  { region: "صنعاء", orders: 142, value: 22400000, share: 27, growth: 12 },
  { region: "عدن", orders: 118, value: 18900000, share: 23, growth: 18 },
  { region: "تعز", orders: 89, value: 12500000, share: 15, growth: 8 },
  { region: "حضرموت", orders: 67, value: 9800000, share: 12, growth: 22 },
  { region: "إب", orders: 54, value: 7200000, share: 9, growth: 4 },
  { region: "الحديدة", orders: 42, value: 5600000, share: 7, growth: -5 },
  { region: "لحج", orders: 31, value: 4100000, share: 5, growth: 11 },
  { region: "أخرى", orders: 19, value: 2500000, share: 3, growth: 6 },
];
const DEMO_REPS = [
  {
    name: "أحمد محمد",
    region: "صنعاء",
    orders: 38,
    target: 25000000,
    achieved: 28500000,
    rate: 114,
  },
  {
    name: "علي عبدالله",
    region: "عدن",
    orders: 32,
    target: 20000000,
    achieved: 22100000,
    rate: 110,
  },
  {
    name: "سالم الحضرمي",
    region: "حضرموت",
    orders: 24,
    target: 15000000,
    achieved: 14800000,
    rate: 98,
  },
  {
    name: "خالد ناجي",
    region: "تعز",
    orders: 28,
    target: 18000000,
    achieved: 16200000,
    rate: 90,
  },
  {
    name: "محمود سيف",
    region: "إب",
    orders: 18,
    target: 12000000,
    achieved: 8400000,
    rate: 70,
  },
];
const DEMO_COLLECTIONS = [
  { bucket: "تحت 30 يوم", amount: 18500000, count: 28 },
  { bucket: "31-60 يوم", amount: 8200000, count: 14 },
  { bucket: "61-90 يوم", amount: 4100000, count: 7 },
  { bucket: "91-180 يوم", amount: 2800000, count: 5 },
  { bucket: "أكثر من 180 يوم", amount: 1500000, count: 3 },
];

function fmtInt(v: number): string {
  return Math.round(v).toLocaleString("en-US");
}

export default function DistributionReportsPage() {
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("30d");

  const totalRevenue = DEMO_CUSTOMERS.reduce((s, c) => s + c.total, 0);
  const totalOrders = DEMO_CUSTOMERS.reduce((s, c) => s + c.orders, 0);
  const avgOrder = totalRevenue / totalOrders;
  const totalTarget = DEMO_REPS.reduce((s, r) => s + r.target, 0);
  const totalAchieved = DEMO_REPS.reduce((s, r) => s + r.achieved, 0);
  const achievement = (totalAchieved / totalTarget) * 100;
  const totalUnits = DEMO_PRODUCTS.reduce((s, p) => s + p.units, 0);
  const collections = DEMO_COLLECTIONS.reduce((s, c) => s + c.amount, 0);
  const overdue90 = DEMO_COLLECTIONS.slice(2).reduce((s, c) => s + c.amount, 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-info/20 to-brand/20 border border-info/30">
                <Truck className="w-5 h-5 text-info" />
              </div>
              <h1 className="text-2xl font-black">تقارير التوزيع والمبيعات</h1>
              <Badge className="bg-info/10 text-info border-info/25 text-[10px]">
                <Sparkles className="w-3 h-3" /> IFRS 15
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              تقارير شاملة لأداء المبيعات والتوزيع والتحصيلات والأهداف
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">آخر 7 أيام</SelectItem>
                <SelectItem value="30d">آخر 30 يوم</SelectItem>
                <SelectItem value="90d">آخر 90 يوم</SelectItem>
                <SelectItem value="ytd">منذ بداية السنة</SelectItem>
                <SelectItem value="1y">سنة كاملة</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </Button>
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1">
              <Download className="w-3.5 h-3.5" /> تصدير
            </Button>
          </div>
        </header>

        {/* KPI strip */}
        <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <KpiBox
            label="إجمالي المبيعات"
            value={fmtYER(totalRevenue)}
            icon={Wallet}
            color="emerald"
          />
          <KpiBox
            label="إجمالي الطلبات"
            value={fmtInt(totalOrders)}
            icon={Activity}
            color="sky"
          />
          <KpiBox
            label="متوسط الطلب"
            value={fmtYER(avgOrder)}
            icon={BarChart3}
            color="violet"
          />
          <KpiBox
            label="وحدات مباعة"
            value={fmtInt(totalUnits)}
            icon={Package}
            color="amber"
          />
          <KpiBox
            label="تحقيق الهدف"
            value={`${achievement.toFixed(0)}%`}
            icon={Target}
            color={achievement >= 100 ? "emerald" : "rose"}
          />
          <KpiBox
            label="مستحقات التحصيل"
            value={fmtYER(collections)}
            icon={Clock}
            color="orange"
          />
        </section>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-10 bg-card border">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <Globe2 className="w-3.5 h-3.5" /> نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-xs gap-1">
              <Users className="w-3.5 h-3.5" /> العملاء
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs gap-1">
              <Package className="w-3.5 h-3.5" /> المنتجات
            </TabsTrigger>
            <TabsTrigger value="regions" className="text-xs gap-1">
              <MapPin className="w-3.5 h-3.5" /> المناطق
            </TabsTrigger>
            <TabsTrigger value="targets" className="text-xs gap-1">
              <Target className="w-3.5 h-3.5" /> الأهداف
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Card className="rounded-2xl lg:col-span-2">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> التوزيع الجغرافي
                    <Badge variant="outline" className="text-[10px]">
                      8 مناطق
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {DEMO_REGIONS.map(r => (
                    <div key={r.region} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{r.region}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {r.orders} طلب
                          </Badge>
                          {r.growth >= 0 ? (
                            <Badge className="text-[9px] bg-success/10 text-success border-success/25">
                              +{r.growth}%
                            </Badge>
                          ) : (
                            <Badge className="text-[9px] bg-destructive/10 text-destructive border-destructive/25">
                              {r.growth}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-muted-foreground text-[10px]">
                            {r.share}%
                          </span>
                          <span className="font-bold">{fmtYER(r.value)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-info to-brand"
                          style={{ width: `${(r.share / 27) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="w-4 h-4" /> أداء مندوبي المبيعات
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {DEMO_REPS.map(rep => {
                    const col =
                      rep.rate >= 100
                        ? "emerald"
                        : rep.rate >= 90
                          ? "amber"
                          : "rose";
                    return (
                      <div
                        key={rep.name}
                        className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-panel/30"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-info/20 to-brand/20 flex items-center justify-center text-[10px] font-black">
                          {rep.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">{rep.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {rep.region} · {rep.orders} طلب
                          </div>
                        </div>
                        <div className="text-left">
                          <Badge
                            className={cn(
                              "text-[10px]",
                              col === "emerald"
                                ? "bg-success/10 text-success border-success/25"
                                : col === "amber"
                                  ? "bg-warning/10 text-warning border-warning/25"
                                  : "bg-destructive/10 text-destructive border-destructive/25"
                            )}
                          >
                            {rep.rate}%
                          </Badge>
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            {fmtYER(rep.achieved)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
            <Card className="rounded-2xl">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> أعمار التحصيلات (AR Aging)
                  <Badge variant="outline" className="text-[10px]">
                    IFRS 9
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  {DEMO_COLLECTIONS.map((b, i) => {
                    const colors = [
                      "emerald",
                      "sky",
                      "amber",
                      "orange",
                      "rose",
                    ];
                    const c = colors[i];
                    return (
                      <div
                        key={b.bucket}
                        className={cn(
                          "rounded-xl border p-3",
                          c === "emerald"
                            ? "bg-success/10 border-success/25"
                            : c === "sky"
                              ? "bg-info/10 border-info/25"
                              : c === "amber"
                                ? "bg-warning/10 border-warning/25"
                                : c === "orange"
                                  ? "bg-warning/10 border-warning/25"
                                  : "bg-destructive/10 border-destructive/25"
                        )}
                      >
                        <div
                          className={cn(
                            "text-[10px] font-bold",
                            c === "emerald"
                              ? "text-success"
                              : c === "sky"
                                ? "text-info"
                                : c === "amber"
                                  ? "text-warning"
                                  : c === "orange"
                                    ? "text-warning"
                                    : "text-destructive"
                          )}
                        >
                          {b.bucket}
                        </div>
                        <div className="text-lg font-black mt-1 tabular-nums">
                          {fmtYER(b.amount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {b.count} عميل
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 p-3 rounded-xl bg-warning/10 border border-warning/25 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                  <div className="text-[11px] text-warning">
                    <strong>تنبيه:</strong> نسبة التحصيل المتأخر (أكثر من 60
                    يوم) ={" "}
                    <span className="font-black">
                      {((overdue90 / collections) * 100).toFixed(1)}%
                    </span>
                    . يوصى بمراجعة سياسة التحصيل وتطبيق IFRS 9 — Expected Credit
                    Loss.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers */}
          <TabsContent value="customers" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" /> كبار العملاء
                  <Badge variant="outline" className="text-[10px]">
                    Pareto 80/20
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="text-right p-3 font-black">#</th>
                        <th className="text-right p-3 font-black">العميل</th>
                        <th className="text-right p-3 font-black">المدينة</th>
                        <th className="text-left p-3 font-black">
                          إجمالي المبيعات
                        </th>
                        <th className="text-left p-3 font-black">الطلبات</th>
                        <th className="text-left p-3 font-black">متوسط</th>
                        <th className="text-left p-3 font-black">الحصة</th>
                        <th className="text-center p-3 font-black">التصنيف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_CUSTOMERS.map((c, i) => (
                        <tr
                          key={c.name}
                          className="border-b border-border/50 hover:bg-panel/30"
                        >
                          <td className="p-3 text-muted-foreground font-mono">
                            {i + 1}
                          </td>
                          <td className="p-3 font-medium">{c.name}</td>
                          <td className="p-3 text-muted-foreground">
                            {c.city}
                          </td>
                          <td className="p-3 text-left tabular-nums font-bold">
                            {fmtYER(c.total)}
                          </td>
                          <td className="p-3 text-left tabular-nums">
                            {c.orders}
                          </td>
                          <td className="p-3 text-left tabular-nums text-muted-foreground">
                            {fmtYER(c.total / c.orders)}
                          </td>
                          <td className="p-3 text-left">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden max-w-[80px]">
                                <div
                                  className="h-full bg-success"
                                  style={{ width: `${(c.share / 22) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold">
                                {c.share}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {i < 2 ? (
                              <Badge className="text-[10px] bg-warning/10 text-warning border-warning/25 gap-1">
                                <Award className="w-3 h-3" /> VIP
                              </Badge>
                            ) : i < 5 ? (
                              <Badge className="text-[10px] bg-success/10 text-success border-success/25">
                                نشط
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                عادي
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <InsightCard
                title="تركّز العملاء"
                value="68%"
                desc="من 5 عملاء رئيسيين"
                color="amber"
                icon={Zap}
              />
              <InsightCard
                title="معدل الاحتفاظ"
                value="92%"
                desc="عملاء نشطون"
                color="emerald"
                icon={CheckCircle2}
              />
              <InsightCard
                title="متوسط دورة البيع"
                value="14 يوم"
                desc="من أول تواصل للإغلاق"
                color="sky"
                icon={Clock}
              />
            </div>
          </TabsContent>

          {/* Products */}
          <TabsContent value="products" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" /> المنتجات الأكثر مبيعاً
                  <Badge variant="outline" className="text-[10px]">
                    ABC Analysis
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="text-right p-3 font-black">المنتج</th>
                        <th className="text-left p-3 font-black">الوحدات</th>
                        <th className="text-left p-3 font-black">الإيرادات</th>
                        <th className="text-left p-3 font-black">
                          متوسط السعر
                        </th>
                        <th className="text-center p-3 font-black">النمو</th>
                        <th className="text-center p-3 font-black">التصنيف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_PRODUCTS.map((p, i) => {
                        const cls = i < 2 ? "A" : i < 4 ? "B" : "C";
                        return (
                          <tr
                            key={p.name}
                            className="border-b border-border/50 hover:bg-panel/30"
                          >
                            <td className="p-3 font-medium">{p.name}</td>
                            <td className="p-3 text-left tabular-nums font-bold">
                              {fmtInt(p.units)}
                            </td>
                            <td className="p-3 text-left tabular-nums font-bold">
                              {fmtYER(p.revenue)}
                            </td>
                            <td className="p-3 text-left tabular-nums text-muted-foreground">
                              {fmtYER(p.revenue / p.units)}
                            </td>
                            <td className="p-3 text-center">
                              {p.growth >= 0 ? (
                                <Badge className="text-[10px] bg-success/10 text-success border-success/25 gap-1">
                                  <TrendingUp className="w-3 h-3" />+{p.growth}%
                                </Badge>
                              ) : (
                                <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/25 gap-1">
                                  <TrendingUp className="w-3 h-3 rotate-180" />
                                  {p.growth}%
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                className={cn(
                                  "text-[10px] font-black",
                                  cls === "A"
                                    ? "bg-success/10 text-success border-success/25"
                                    : cls === "B"
                                      ? "bg-info/10 text-info border-info/25"
                                      : "bg-muted text-muted-foreground"
                                )}
                              >
                                الفئة {cls}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regions */}
          <TabsContent value="regions" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> تفصيل التوزيع الجغرافي
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="text-right p-3 font-black">المنطقة</th>
                        <th className="text-left p-3 font-black">الطلبات</th>
                        <th className="text-left p-3 font-black">القيمة</th>
                        <th className="text-left p-3 font-black">
                          متوسط الطلب
                        </th>
                        <th className="text-center p-3 font-black">الحصة</th>
                        <th className="text-center p-3 font-black">النمو</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_REGIONS.map(r => (
                        <tr
                          key={r.region}
                          className="border-b border-border/50 hover:bg-panel/30"
                        >
                          <td className="p-3 font-medium">
                            <MapPin className="w-3.5 h-3.5 inline ml-1 text-muted-foreground" />
                            {r.region}
                          </td>
                          <td className="p-3 text-left tabular-nums">
                            {r.orders}
                          </td>
                          <td className="p-3 text-left tabular-nums font-bold">
                            {fmtYER(r.value)}
                          </td>
                          <td className="p-3 text-left tabular-nums text-muted-foreground">
                            {fmtYER(r.value / r.orders)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px]">
                              {r.share}%
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {r.growth >= 0 ? (
                              <Badge className="text-[10px] bg-success/10 text-success border-success/25">
                                +{r.growth}%
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/25">
                                {r.growth}%
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Targets */}
          <TabsContent value="targets" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" /> تحقيق الأهداف
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {DEMO_REPS.map(rep => {
                  const pct = (rep.achieved / rep.target) * 100;
                  const status =
                    pct >= 100 ? "exceeded" : pct >= 90 ? "near" : "below";
                  return (
                    <div key={rep.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{rep.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {rep.region}
                          </Badge>
                          {status === "exceeded" && (
                            <Badge className="text-[10px] bg-success/10 text-success border-success/25">
                              متجاوز
                            </Badge>
                          )}
                          {status === "near" && (
                            <Badge className="text-[10px] bg-warning/10 text-warning border-warning/25">
                              قريب
                            </Badge>
                          )}
                          {status === "below" && (
                            <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/25">
                              متخلف
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 tabular-nums">
                          <span className="text-muted-foreground text-[10px]">
                            {fmtYER(rep.target)}
                          </span>
                          <span className="font-bold">
                            {fmtYER(rep.achieved)}
                          </span>
                          <span className="font-black text-sm">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            pct >= 100
                              ? "bg-gradient-to-l from-success to-success"
                              : pct >= 90
                                ? "bg-gradient-to-l from-warning to-warning"
                                : "bg-gradient-to-l from-destructive to-destructive"
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <InsightCard
                    title="إجمالي المستهدف"
                    value={fmtYER(totalTarget)}
                    desc="سنوي"
                    color="sky"
                    icon={Target}
                  />
                  <InsightCard
                    title="إجمالي المحقق"
                    value={fmtYER(totalAchieved)}
                    desc={`+${(achievement - 100).toFixed(1)}% من الهدف`}
                    color={achievement >= 100 ? "emerald" : "amber"}
                    icon={CheckCircle2}
                  />
                  <InsightCard
                    title="الفجوة"
                    value={fmtYER(Math.abs(totalTarget - totalAchieved))}
                    desc={achievement >= 100 ? "فائض" : "ينقص"}
                    color={achievement >= 100 ? "emerald" : "rose"}
                    icon={Zap}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Standards */}
        <Card className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-bold mb-2">
              <Sparkles className="w-4 h-4" /> المعايير المعتمدة
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px] text-muted-foreground">
              {[
                {
                  title: "IFRS 15",
                  desc: "إثبات الإيرادات من العقود مع العملاء",
                },
                { title: "ASC 606", desc: "إثبات الإيرادات — US GAAP" },
                { title: "IFRS 9", desc: "خسائر الائتمان المتوقعة (ECL)" },
                { title: "Pareto 80/20", desc: "تحليل تركّز العملاء" },
                { title: "ABC Analysis", desc: "تصنيف المنتجات حسب الأهمية" },
              ].map(s => (
                <div
                  key={s.title}
                  className="rounded-lg border border-border p-2 bg-card"
                >
                  <div className="font-bold text-foreground">{s.title}</div>
                  <div>{s.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// ─── Helpers ───
function KpiBox({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
}) {
  const colorClass =
    color === "emerald"
      ? "from-success/10 to-success/5 border-success/25 text-success"
      : color === "sky"
        ? "from-info/10 to-info/5 border-info/25 text-info"
        : color === "violet"
          ? "from-brand/10 to-brand/5 border-brand/25 text-brand"
          : color === "amber"
            ? "from-warning/10 to-warning/5 border-warning/25 text-warning"
            : color === "rose"
              ? "from-destructive/10 to-destructive/5 border-destructive/25 text-destructive"
              : "from-warning/10 to-warning/5 border-warning/25 text-warning";
  return (
    <Card className={cn("rounded-2xl border bg-gradient-to-br", colorClass)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <Icon className="w-4 h-4 opacity-70" />
        </div>
        <div className="text-lg font-black mt-1 tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  title,
  value,
  desc,
  color,
  icon: Icon,
}: {
  title: string;
  value: string;
  desc: string;
  color: string;
  icon: any;
}) {
  const colorClass =
    color === "emerald"
      ? "border-success/30 bg-success/5"
      : color === "sky"
        ? "border-info/30 bg-info/5"
        : color === "amber"
          ? "border-warning/30 bg-warning/5"
          : "border-destructive/30 bg-destructive/5";
  return (
    <Card className={cn("rounded-2xl border", colorClass)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-[10px] text-muted-foreground font-bold">
            {title}
          </span>
        </div>
        <div className="text-xl font-black mt-1 tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
      </CardContent>
    </Card>
  );
}
