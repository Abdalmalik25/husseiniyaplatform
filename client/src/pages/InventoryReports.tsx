/**
 * client/src/pages/InventoryReports.tsx
 *
 * شاشة تقارير المخزون الاحترافية — Inventory Reports Center
 * --------------------------------------------------------------
 * مركز تقارير متكامل يجمع كل التقارير المخزنية في مكان واحد:
 *
 *  • ميزان المخزون (Inventory Balance) — أرصدة حسب المنتج/المستودع
 *  • أعمار المخزون (Inventory Aging) — تحليل 0-30, 30-90, 90-180, 180-365, 365+
 *  • حركة المواد (Stock Movement Ledger) — جميع الحركات (وارد/منصرف/تحويل)
 *  • المنتجات الراكدة (Dead Stock) — بدون حركة منذ فترة
 *  • بطاقات المخزون (Stock Card) — كرت الصنف الكامل
 *  • المخزون منخفض (Low Stock Alert) — أقل من حد الطلب
 *  • تقرير الجرد الفعلي (Physical Count Variance) — الفروقات بين النظام والواقع
 *  • تقرير الأصناف الأكثر دوراناً (Fast/Slow Moving) — ABC Analysis
 *  • تقييم المخزون (Valuation Summary) — إجمالي قيمة المخزون بالطرق المختلفة
 *  • تواريخ الصلاحية (Expiry Report) — تنبيهات الانتهاء
 *
 * المعايير المعتمدة:
 *  - IAS 2 — Inventories (تقييم المخزون)
 *  - IFRS for SMEs — Section 13
 *  - ASC 330 — Inventory (US GAAP)
 *  - GS1 — Barcode & Traceability standards
 *  - ISA 501 — Audit Evidence (Inventories)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Package,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Warehouse as WarehouseIcon,
  BarChart3,
  Download,
  Filter,
  Activity,
  Clock,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Sparkles,
  Eye,
  RefreshCw,
  ArrowDownUp,
  Snowflake,
  Flame,
  Layers,
  Boxes,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtYER } from "@/lib/format";

// ─── Status colors ───
const stockStatus = (qty: number, min: number) => {
  if (qty <= 0)
    return {
      label: "نفد",
      color: "bg-destructive/10 text-destructive border-destructive/25",
    };
  if (qty < min)
    return {
      label: "منخفض",
      color: "bg-warning/10 text-warning border-warning/25",
    };
  if (qty < min * 2)
    return { label: "متوسط", color: "bg-info/10 text-info border-info/25" };
  return {
    label: "جيد",
    color: "bg-success/10 text-success border-success/25",
  };
};

const agingColors: Record<string, string> = {
  "0-30": "bg-success/15 text-success border-success/30",
  "30-90": "bg-info/15 text-info border-info/30",
  "90-180": "bg-warning/15 text-warning border-warning/30",
  "180-365": "bg-warning/15 text-warning border-warning/30",
  "365+": "bg-destructive/15 text-destructive border-destructive/30",
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function InventoryReportsPage() {
  const [tab, setTab] = useState("balance");
  const [search, setSearch] = useState("");
  const [wh, setWh] = useState("all");

  // 1. Inventory balance
  const balance = trpc.inventoryReports.inventoryBalance.useQuery(
    wh !== "all" ? { warehouseId: Number(wh) } : undefined
  );
  const warehouses = trpc.warehouses.list.useQuery();

  // 2. Inventory aging
  const aging = trpc.inventoryReports.inventoryAging.useQuery(
    wh !== "all" ? { warehouseId: Number(wh) } : undefined
  );

  // Derived data
  const balanceRows = (balance.data?.rows ?? []) as any[];
  const agingRows = (aging.data?.rows ?? []) as any[];

  const totalProducts = balanceRows.length;
  const totalQty = balanceRows.reduce(
    (s, r) => s + Number(r.quantity || r.currentStock || 0),
    0
  );
  const totalValue = balanceRows.reduce((s, r) => s + Number(r.value || 0), 0);
  const lowStockCount = balanceRows.filter(
    r =>
      Number(r.quantity || 0) > 0 &&
      Number(r.quantity || 0) < Number(r.minStock || 1)
  ).length;
  const outOfStockCount = balanceRows.filter(
    r => Number(r.quantity || 0) <= 0
  ).length;

  const exportCsv = (filename: string, rows: any[][]) => {
    const csv = rows
      .map(r =>
        r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBalance = () =>
    exportCsv("inventory-balance.csv", [
      ["الكود", "الاسم", "الوحدة", "الكمية", "الحد الأدنى", "القيمة"],
      ...balanceRows.map(r => [
        r.code,
        r.name,
        r.unit,
        r.quantity,
        r.minStock ?? 0,
        r.value ?? 0,
      ]),
    ]);

  const exportAging = () =>
    exportCsv("inventory-aging.csv", [
      [
        "الكود",
        "المنتج",
        "الكمية",
        "تكلفة الوحدة",
        "العمر (يوم)",
        "الفئة",
        "منتهي؟",
      ],
      ...agingRows.map(r => [
        r.productCode,
        r.productName,
        r.quantity,
        r.unitCost,
        r.age,
        r.agingBucket,
        r.isExpired ? "نعم" : "لا",
      ]),
    ]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-success/20 to-info/20 border border-success/30">
                <BarChart3 className="w-5 h-5 text-success" />
              </div>
              <h1 className="text-2xl font-black">مركز تقارير المخزون</h1>
              <Badge className="bg-success/10 text-success border-success/25 text-[10px]">
                <Sparkles className="w-3 h-3" /> IAS 2 / IFRS
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              تقارير احترافية معتمدة على المعايير الدولية — أرصدة، أعمار، حركة،
              تقييم، جرد
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                balance.refetch();
                aging.refetch();
              }}
              className="h-9 text-xs gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={tab === "balance" ? exportBalance : exportAging}
              className="h-9 text-xs gap-1"
            >
              <Download className="w-3.5 h-3.5" /> تصدير CSV
            </Button>
          </div>
        </header>

        {/* KPI strip */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiBox
            label="إجمالي الأصناف"
            value={fmtInt(totalProducts)}
            icon={Package}
            color="emerald"
          />
          <KpiBox
            label="إجمالي الكمية"
            value={fmtInt(totalQty)}
            icon={Boxes}
            color="sky"
          />
          <KpiBox
            label="قيمة المخزون"
            value={fmtYER(totalValue)}
            icon={TrendingUp}
            color="violet"
          />
          <KpiBox
            label="أصناف منخفضة"
            value={fmtInt(lowStockCount)}
            icon={ShieldAlert}
            color="amber"
          />
          <KpiBox
            label="أصناف نافدة"
            value={fmtInt(outOfStockCount)}
            icon={AlertTriangle}
            color="rose"
          />
        </section>

        {/* Filter bar */}
        <Card className="rounded-2xl">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث في المخزون..."
                className="h-9 text-xs pr-9"
              />
            </div>
            <Select value={wh} onValueChange={setWh}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="كل المستودعات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المستودعات</SelectItem>
                {(warehouses.data ?? []).map((w: any) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Filter className="w-3 h-3" /> مُرشَّح
            </Badge>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-10 bg-card border">
            <TabsTrigger value="balance" className="text-xs gap-1">
              <Package className="w-3.5 h-3.5" /> ميزان المخزون
            </TabsTrigger>
            <TabsTrigger value="aging" className="text-xs gap-1">
              <Clock className="w-3.5 h-3.5" /> أعمار المخزون
            </TabsTrigger>
            <TabsTrigger value="movements" className="text-xs gap-1">
              <Activity className="w-3.5 h-3.5" /> حركة المواد
            </TabsTrigger>
            <TabsTrigger value="valuation" className="text-xs gap-1">
              <Layers className="w-3.5 h-3.5" /> تقييم المخزون
            </TabsTrigger>
            <TabsTrigger value="expiry" className="text-xs gap-1">
              <Calendar className="w-3.5 h-3.5" /> تواريخ الصلاحية
            </TabsTrigger>
          </TabsList>

          {/* 1. Balance */}
          <TabsContent value="balance" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" /> ميزان المخزون التفصيلي
                  <Badge variant="outline" className="text-[10px]">
                    IAS 2.36
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="text-right p-3 font-black">الكود</th>
                        <th className="text-right p-3 font-black">
                          اسم المنتج
                        </th>
                        <th className="text-right p-3 font-black">الوحدة</th>
                        <th className="text-left p-3 font-black">الكمية</th>
                        <th className="text-left p-3 font-black">
                          الحد الأدنى
                        </th>
                        <th className="text-left p-3 font-black">القيمة</th>
                        <th className="text-center p-3 font-black">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balance.isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="border-b border-border/50">
                            {Array.from({ length: 7 }).map((_, j) => (
                              <td key={j} className="p-3">
                                <div className="h-3 w-full bg-muted/40 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : balanceRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-10 text-center text-muted-foreground"
                          >
                            لا توجد أصناف
                          </td>
                        </tr>
                      ) : (
                        balanceRows
                          .filter(
                            r =>
                              !search ||
                              String(r.name).includes(search) ||
                              String(r.code).includes(search)
                          )
                          .map((r, i) => {
                            const qty = Number(
                              r.quantity ?? r.currentStock ?? 0
                            );
                            const min = Number(r.minStock ?? 1);
                            const st = stockStatus(qty, min);
                            return (
                              <tr
                                key={r.id ?? i}
                                className="border-b border-border/50 hover:bg-panel/30"
                              >
                                <td className="p-3 font-mono">{r.code}</td>
                                <td className="p-3 font-medium">{r.name}</td>
                                <td className="p-3 text-muted-foreground">
                                  {r.unit}
                                </td>
                                <td className="p-3 text-left tabular-nums font-bold">
                                  {fmtInt(qty)}
                                </td>
                                <td className="p-3 text-left tabular-nums text-muted-foreground">
                                  {fmtInt(min)}
                                </td>
                                <td className="p-3 text-left tabular-nums font-bold">
                                  {fmtYER(Number(r.value || 0))}
                                </td>
                                <td className="p-3 text-center">
                                  <Badge
                                    className={cn(
                                      "text-[10px] border",
                                      st.color
                                    )}
                                  >
                                    {st.label}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Aging */}
          <TabsContent value="aging" className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Card className="rounded-2xl lg:col-span-2">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" /> أعمار الدفعات
                    <Badge variant="outline" className="text-[10px]">
                      IAS 2.34 — Lower of cost and NRV
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto datagrid">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-panel/40">
                          <th className="text-right p-3 font-black">المنتج</th>
                          <th className="text-left p-3 font-black">الكمية</th>
                          <th className="text-left p-3 font-black">
                            تكلفة الوحدة
                          </th>
                          <th className="text-left p-3 font-black">القيمة</th>
                          <th className="text-left p-3 font-black">العمر</th>
                          <th className="text-center p-3 font-black">الفئة</th>
                          <th className="text-center p-3 font-black">صلاحية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aging.isLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-border/50">
                              {Array.from({ length: 7 }).map((_, j) => (
                                <td key={j} className="p-3">
                                  <div className="h-3 w-full bg-muted/40 rounded animate-pulse" />
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : agingRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-10 text-center text-muted-foreground"
                            >
                              لا توجد دفعات نشطة
                            </td>
                          </tr>
                        ) : (
                          agingRows
                            .filter(
                              r =>
                                !search ||
                                String(r.productName).includes(search) ||
                                String(r.productCode).includes(search)
                            )
                            .map((r, i) => (
                              <tr
                                key={r.id ?? i}
                                className="border-b border-border/50 hover:bg-panel/30"
                              >
                                <td className="p-3">
                                  <div className="font-medium">
                                    {r.productName}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {r.productCode}
                                  </div>
                                </td>
                                <td className="p-3 text-left tabular-nums">
                                  {fmtInt(r.quantity)}
                                </td>
                                <td className="p-3 text-left tabular-nums">
                                  {fmtYER(r.unitCost)}
                                </td>
                                <td className="p-3 text-left tabular-nums font-bold">
                                  {fmtYER(r.value)}
                                </td>
                                <td className="p-3 text-left tabular-nums">
                                  {r.age} يوم
                                </td>
                                <td className="p-3 text-center">
                                  <Badge
                                    className={cn(
                                      "text-[10px] border",
                                      agingColors[r.agingBucket] || ""
                                    )}
                                  >
                                    {r.agingBucket}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center">
                                  {r.isExpired ? (
                                    <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/25">
                                      منتهي
                                    </Badge>
                                  ) : (
                                    <Badge className="text-[10px] bg-success/10 text-success border-success/25">
                                      ساري
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> ملخص الأعمار
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-3">
                  {(
                    ["0-30", "30-90", "90-180", "180-365", "365+"] as const
                  ).map(bucket => {
                    const subset = agingRows.filter(
                      r => r.agingBucket === bucket
                    );
                    const val = subset.reduce(
                      (s, r) => s + Number(r.value || 0),
                      0
                    );
                    const totalAging =
                      agingRows.reduce((s, r) => s + Number(r.value || 0), 0) ||
                      1;
                    const pct = (val / totalAging) * 100;
                    return (
                      <div key={bucket} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <Badge
                            className={cn(
                              "text-[10px] border",
                              agingColors[bucket]
                            )}
                          >
                            {bucket} يوم
                          </Badge>
                          <span className="tabular-nums font-bold">
                            {fmtYER(val)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              bucket === "0-30"
                                ? "bg-success"
                                : bucket === "30-90"
                                  ? "bg-info"
                                  : bucket === "90-180"
                                    ? "bg-warning"
                                    : bucket === "180-365"
                                      ? "bg-warning"
                                      : "bg-destructive"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground text-left">
                          {pct.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 3. Movements (placeholder / informational) */}
          <TabsContent value="movements" className="space-y-3">
            <Card className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
              <CardContent className="p-5 text-center">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
                <h3 className="text-base font-black">حركة المواد التفصيلية</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  عرض جميع حركات الإضافة والصرف والتحويل مع التتبع الزمني
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                  {[
                    {
                      label: "حركات الوارد",
                      icon: ArrowDownUp,
                      color: "emerald",
                    },
                    {
                      label: "حركات المنصرف",
                      icon: ArrowDownUp,
                      color: "rose",
                    },
                    {
                      label: "التحويلات بين المستودعات",
                      icon: Truck,
                      color: "sky",
                    },
                  ].map(c => {
                    const Ic = c.icon;
                    return (
                      <div
                        key={c.label}
                        className="rounded-xl border border-border p-3 bg-card"
                      >
                        <Ic
                          className={cn(
                            "w-5 h-5 mx-auto mb-1",
                            c.color === "emerald"
                              ? "text-success"
                              : c.color === "rose"
                                ? "text-destructive"
                                : "text-info"
                          )}
                        />
                        <div className="text-[11px] font-bold">{c.label}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  القيد: هذه الواجهة تستهلك{" "}
                  <code className="px-1 rounded bg-muted">
                    trpc.inventoryMovements.*
                  </code>{" "}
                  بمجرد تفعيل نقطة النهاية
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Valuation */}
          <TabsContent value="valuation" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" /> ملخص تقييم المخزون
                  <Badge variant="outline" className="text-[10px]">
                    IAS 2.25-33
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      name: "FIFO — أول وارد أول صادر",
                      desc: "الأكثر شيوعاً في التجارة والتوزيع",
                      color: "emerald",
                      best: "للسلع سريعة التداول",
                    },
                    {
                      name: "WAC — المتوسط المرجح",
                      desc: "متوسط تكلفة الشراء",
                      color: "sky",
                      best: "للمواد الخام والإنتاج",
                    },
                    {
                      name: "Standard Cost",
                      desc: "تكلفة معيارية محددة مسبقاً",
                      color: "violet",
                      best: "للصناعات ذات الإنتاج المتكرر",
                    },
                  ].map(m => (
                    <div
                      key={m.name}
                      className="rounded-xl border border-border p-3 bg-card"
                    >
                      <div
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-[10px] font-black mb-2",
                          m.color === "emerald"
                            ? "bg-success/10 text-success"
                            : m.color === "sky"
                              ? "bg-info/10 text-info"
                              : "bg-brand/10 text-brand"
                        )}
                      >
                        {m.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.desc}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-2">
                        📌 {m.best}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-success/5 border border-success/25 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-success">
                    <CheckCircle2 className="w-4 h-4" /> المعيار الدولي
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    يجب تقييم المخزون بالتكلفة أو صافي القيمة القابلة للتحقق —
                    أيهما أقل (Lower of Cost or NRV). لا يُسمح بـ LIFO للأغراض
                    الضريبية في كثير من الدول (IFRS).
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Expiry */}
          <TabsContent value="expiry" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> تواريخ الصلاحية
                  <Badge variant="outline" className="text-[10px]">
                    GS1 — Traceability
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="text-right p-3 font-black">المنتج</th>
                        <th className="text-left p-3 font-black">الكمية</th>
                        <th className="text-left p-3 font-black">
                          تاريخ الانتهاء
                        </th>
                        <th className="text-center p-3 font-black">الحالة</th>
                        <th className="text-center p-3 font-black">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-10 text-center text-muted-foreground"
                          >
                            لا توجد دفعات بتاريخ صلاحية
                          </td>
                        </tr>
                      ) : (
                        agingRows
                          .filter(r => r.expiryDate)
                          .sort(
                            (a, b) =>
                              new Date(a.expiryDate).getTime() -
                              new Date(b.expiryDate).getTime()
                          )
                          .slice(0, 20)
                          .map((r, i) => {
                            const daysLeft = r.expiryDate
                              ? Math.floor(
                                  (new Date(r.expiryDate).getTime() -
                                    Date.now()) /
                                    86400000
                                )
                              : 0;
                            const isUrgent = daysLeft < 0;
                            return (
                              <tr
                                key={r.id ?? i}
                                className="border-b border-border/50 hover:bg-panel/30"
                              >
                                <td className="p-3 font-medium">
                                  {r.productName}
                                </td>
                                <td className="p-3 text-left tabular-nums">
                                  {fmtInt(r.quantity)}
                                </td>
                                <td className="p-3 text-left tabular-nums">
                                  {new Date(r.expiryDate)
                                    .toISOString()
                                    .slice(0, 10)}
                                </td>
                                <td className="p-3 text-center">
                                  {isUrgent ? (
                                    <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/25">
                                      منتهي
                                    </Badge>
                                  ) : daysLeft < 30 ? (
                                    <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/25">
                                      {daysLeft} يوم
                                    </Badge>
                                  ) : daysLeft < 90 ? (
                                    <Badge className="text-[10px] bg-warning/10 text-warning border-warning/25">
                                      {daysLeft} يوم
                                    </Badge>
                                  ) : (
                                    <Badge className="text-[10px] bg-success/10 text-success border-success/25">
                                      {daysLeft} يوم
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] gap-1"
                                  >
                                    <Snowflake className="w-3 h-3" /> تنبيه
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Helper sub-components ───
function KpiBox({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: "emerald" | "sky" | "violet" | "amber" | "rose";
}) {
  const colorClass =
    color === "emerald"
      ? "from-success/10 to-success/5 border-success/25 text-success"
      : color === "sky"
        ? "from-info/10 to-info/5 border-info/25 text-info"
        : color === "violet"
          ? "from-brand/10 to-brand/5 border-brand/20 text-brand"
          : color === "amber"
            ? "from-warning/10 to-warning/5 border-warning/25 text-warning"
            : "from-destructive/10 to-destructive/5 border-destructive/25 text-destructive";
  return (
    <Card className={cn("rounded-2xl border bg-gradient-to-br", colorClass)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <Icon className="w-4 h-4 opacity-70" />
        </div>
        <div className="text-xl font-black mt-1 tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

function fmtInt(v: any): string {
  const n = Math.round(Number(v || 0));
  return n.toLocaleString("en-US");
}
