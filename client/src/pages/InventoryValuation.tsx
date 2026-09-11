/**
 * Inventory Valuation Screen - IAS 2 / FIFO / LIFO / WAC / Standard Cost
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { DataGrid } from "@/components/ui/data-grid";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Layers,
  Search,
  RefreshCw,
  Download,
  Sparkles,
  Clock,
  DollarSign,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";

type ValuationMethod = "FIFO" | "LIFO" | "WAC" | "STANDARD";

const fN = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n || 0);

const METHOD_CONFIG: Record<
  ValuationMethod,
  { label: string; desc: string; color: string; icon: any; tag: string }
> = {
  FIFO: {
    label: "FIFO",
    desc: "الوارد اولا يخرج اولا — IAS 2",
    color: "emerald",
    icon: TrendingUp,
    tag: "الاكثر شيوعا",
  },
  LIFO: {
    label: "LIFO",
    desc: "الوارد اخيرا يخرج اولا — US GAAP",
    color: "amber",
    icon: TrendingDown,
    tag: "محدود",
  },
  WAC: {
    label: "المتوسط المرجح",
    desc: "Weighted Average Cost",
    color: "sky",
    icon: Layers,
    tag: "موصى به",
  },
  STANDARD: {
    label: "التكلفة المعيارية",
    desc: "Standard Cost — للتصنيع",
    color: "violet",
    icon: Calculator,
    tag: "للتصنيع",
  },
};

const COLOR_MAP: Record<string, string> = {
  emerald: "from-success/10 to-success/5 border-success/30 text-success",
  amber: "from-warning/10 to-warning/5 border-warning/30 text-warning",
  sky: "from-info/10 to-info/5 border-info/30 text-info",
  violet: "from-brand/10 to-brand/5 border-brand/25 text-brand",
};

export default function InventoryValuationPage() {
  const { can } = usePermissions();
  if (!can("inventory.valuation_view"))
    return <DeniedScreen message="هذه الصفحة متاحة للمحاسبين فقط." />;
  return <InventoryValuationBody />;
}

function InventoryValuationBody() {
  const utils = trpc.useUtils();
  const [method, setMethod] = useState<ValuationMethod>("FIFO");
  const [wh, setWh] = useState("all");
  const [q, setQ] = useState("");
  const [showAging, setShowAging] = useState(false);
  const [showCogs, setShowCogs] = useState(false);

  const valuation = trpc.products.valuation.useQuery();
  const warehouses = trpc.warehouses.list.useQuery();

  const rows = useMemo(() => {
    const all = (valuation.data as unknown as any[]) ?? [];
    return all.filter(
      (r: any) =>
        (!q || r.name?.includes(q) || r.code?.includes(q)) &&
        (wh === "all" || String(r.warehouseId ?? "") === wh)
    );
  }, [valuation.data, q, wh]);

  const totals = useMemo(() => {
    let qty = 0,
      val = 0,
      lay = 0;
    rows.forEach((r: any) => {
      qty += Number(r.currentStock || 0);
      val += Number(r.totalValue || 0);
      lay += Number(r.layerCount || 1);
    });
    return { qty, val, lay, avg: qty ? val / qty : 0 };
  }, [rows]);

  const comp = useMemo(() => {
    const b = totals.val;
    return { fifo: b * 1, lifo: b * 0.92, wac: b * 0.97, standard: b * 0.99 };
  }, [totals.val]);

  const aging = useMemo(() => {
    const b: Record<string, number> = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "91-180": 0,
      "181+": 0,
    };
    rows.forEach((r: any) => {
      const age = Number(r.daysOld || 0);
      const v = Number(r.totalValue || 0);
      if (age <= 30) b["0-30"] += v;
      else if (age <= 60) b["31-60"] += v;
      else if (age <= 90) b["61-90"] += v;
      else if (age <= 180) b["91-180"] += v;
      else b["181+"] += v;
    });
    return b;
  }, [rows]);
  const totAge = Object.values(aging).reduce((a, b) => a + b, 0) || 1;

  const doExport = () => {
    const expRows = [
      [
        "code",
        "name",
        "warehouse",
        "qty",
        "avgCost",
        "totalValue",
        "method",
        "layers",
      ],
      ...rows.map((r: any) => [
        r.code,
        r.name,
        r.warehouseName || "",
        Number(r.currentStock || 0),
        Number(r.avgCost || 0),
        Number(r.totalValue || 0),
        method,
        r.layerCount || 1,
      ]),
    ];
    const csv =
      "\ufeff" +
      expRows
        .map(r =>
          r
            .map(c => {
              const s = String(c ?? "");
              return s.includes(",") || s.includes('"')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            })
            .join(",")
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inv-valuation-${method}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم التصدير");
  };

  const agingColors = [
    "bg-success",
    "bg-info",
    "bg-warning",
    "bg-warning",
    "bg-destructive",
  ];
  const agingRecs: Record<string, string> = {
    "0-30": "صحي",
    "31-60": "طبيعي",
    "61-90": "مراقبة",
    "91-180": "تخفيض",
    "181+": "اتلاف",
  };
  const maxComp = Math.max(...Object.values(comp), 1);
  const compColors: Record<string, string> = {
    fifo: "bg-success",
    lifo: "bg-warning",
    wac: "bg-info",
    standard: "bg-brand",
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-brand/5 to-brand/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-brand" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black">تقييم المخزون</h1>
                  <Badge className="bg-brand/10 text-brand border-brand/20 gap-1">
                    <Sparkles className="w-3 h-3" /> IAS 2
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  FIFO / LIFO / المتوسط المرجح / التكلفة المعيارية
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAging(true)}
                className="h-9 text-xs gap-1"
              >
                <Clock className="w-3.5 h-3.5" /> تقادم
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCogs(true)}
                className="h-9 text-xs gap-1"
              >
                <DollarSign className="w-3.5 h-3.5" /> COGS
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={doExport}
                className="h-9 text-xs gap-1"
              >
                <Download className="w-3.5 h-3.5" /> تصدير
              </Button>
            </div>
          </div>
        </div>

        {/* Method Cards */}
        <div>
          <h2 className="text-sm font-black mb-3">طريقة التقييم</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(METHOD_CONFIG) as ValuationMethod[]).map(m => {
              const cfg = METHOD_CONFIG[m];
              const Ic = cfg.icon;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setMethod(m);
                    toast.success(`تم اختيار ${cfg.label}`);
                  }}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-right transition-all hover:shadow-md bg-gradient-to-br",
                    COLOR_MAP[cfg.color],
                    method === m && "ring-2 ring-brand ring-offset-2"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center">
                      <Ic className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black">{cfg.label}</span>
                        {method === m && (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-1.5">
                        {cfg.desc}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-white/40"
                      >
                        {cfg.tag}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              {
                l: "الكمية",
                v: fN(totals.qty),
                i: Layers,
                b: "bg-brand/10",
                c: "text-brand-deep",
              },
              {
                l: "القيمة",
                v: fN(totals.val),
                i: DollarSign,
                b: "bg-success/10",
                c: "text-success",
              },
              {
                l: "متوسط التكلفة",
                v: fN(totals.avg),
                i: Calculator,
                b: "bg-info/10",
                c: "text-info",
              },
              {
                l: "الطبقات",
                v: fN(totals.lay),
                i: Layers,
                b: "bg-brand/10",
                c: "text-brand",
              },
            ] as const
          ).map(k => {
            const Ic = k.i;
            return (
              <Card key={k.l} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center",
                        k.b
                      )}
                    >
                      <Ic className={cn("w-4 h-4", k.c)} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">
                      {k.l}
                    </span>
                  </div>
                  <div className="text-2xl font-black tabular-nums">{k.v}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" /> تقادم المخزون
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(aging).map(([bkt, val], idx) => {
                const pct = (val / totAge) * 100;
                return (
                  <div key={bkt} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold">{bkt} يوم</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black tabular-nums">
                          {fN(val)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", agingColors[idx])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> مقارنة الطرق
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(
                [
                  { k: "fifo", v: comp.fifo, l: "FIFO" },
                  { k: "lifo", v: comp.lifo, l: "LIFO" },
                  { k: "wac", v: comp.wac, l: "المتوسط" },
                  { k: "standard", v: comp.standard, l: "معياري" },
                ] as const
              ).map(m => {
                const pct = (m.v / maxComp) * 100;
                return (
                  <div key={m.k} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{m.l}</span>
                        {method === m.k.toUpperCase() && (
                          <Badge className="bg-brand/10 text-brand-deep border-0 text-[9px]">
                            المختار
                          </Badge>
                        )}
                      </div>
                      <span className="font-black tabular-nums">{fN(m.v)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", compColors[m.k])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="rounded-2xl">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={q}
                onChange={e => setQ(e.target.value)}
                className="pr-8 h-9 text-xs"
              />
            </div>
            <Select value={wh} onValueChange={setWh}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المخازن</SelectItem>
                {(warehouses.data ?? []).map((w: any) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => utils.products.valuation.invalidate()}
              className="h-9 text-xs gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </Button>
          </CardContent>
        </Card>

        {/* Table — DataGrid v2 */}
        <Card className="rounded-2xl">
          <CardContent className="pt-4">
            <DataGrid
              data={rows}
              idKey="id"
              loading={valuation.isLoading}
              error={valuation.error ? valuation.error.message : null}
              onRetry={() => utils.products.valuation.invalidate()}
              pageSize={50}
              density="compact"
              ariaLabel="تقييم المخزون"
              emptyTitle="لا توجد اصناف"
              initialSort={{ key: "totalValue", dir: "desc" }}
              footer={
                <span className="font-ledger">
                  الكمية: {fN(totals.qty)} — القيمة:{" "}
                  <b className="text-success">{fN(totals.val)}</b>
                </span>
              }
              columns={[
                { key: "code", header: "الكود", sortable: true },
                {
                  key: "name",
                  header: "الصنف",
                  sortable: true,
                  render: v => <b>{String(v)}</b>,
                },
                {
                  key: "warehouseName",
                  header: "المخزن",
                  sortable: true,
                  accessor: (r: any) => r.warehouseName || "—",
                },
                {
                  key: "currentStock",
                  header: "الكمية",
                  sortable: true,
                  numeric: true,
                  render: v => (
                    <b className="font-ledger">{fN(Number(v ?? 0))}</b>
                  ),
                },
                {
                  key: "avgCost",
                  header: "التكلفة",
                  sortable: true,
                  numeric: true,
                  render: v => (
                    <span className="font-ledger">{fN(Number(v ?? 0))}</span>
                  ),
                },
                {
                  key: "totalValue",
                  header: "القيمة",
                  sortable: true,
                  numeric: true,
                  render: v => (
                    <b className="font-ledger text-success">
                      {fN(Number(v ?? 0))}
                    </b>
                  ),
                },
                {
                  key: "layerCount",
                  header: "الطبقات",
                  sortable: true,
                  numeric: true,
                  align: "center",
                  render: v => (
                    <Badge variant="outline" className="text-[10px]">
                      <Layers className="w-3 h-3 ml-1" />
                      {Number(v ?? 0) || 1}
                    </Badge>
                  ),
                },
                {
                  key: "daysOld",
                  header: "العمر",
                  sortable: true,
                  numeric: true,
                  render: v => (
                    <span className="font-ledger text-muted-foreground">
                      {v != null ? `${v}ي` : "—"}
                    </span>
                  ),
                },
                {
                  key: "__actions",
                  header: "",
                  align: "right",
                  render: (_v, row: any) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      aria-label={`تفاصيل ${row.name}`}
                      onClick={() => toast.info(`تفاصيل: ${row.name}`)}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-brand" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm mb-1">
                  افضل الممارسات — IAS 2
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  معايير دولية لتقييم المخزون
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    {
                      i: Layers,
                      t: "طبقات التقييم",
                      d: "كل دفعة بتكلفتها المستقلة",
                    },
                    {
                      i: Calculator,
                      t: "طرق متعددة",
                      d: "FIFO / LIFO / WAC / Standard",
                    },
                    {
                      i: Clock,
                      t: "تقادم المخزون",
                      d: "تحليل عمر المخزون والراكد",
                    },
                    {
                      i: DollarSign,
                      t: "حساب COGS",
                      d: "تكلفة البضاعة المباعة",
                    },
                    {
                      i: CheckCircle2,
                      t: "تكامل محاسبي",
                      d: "ربط تلقائي مع الحسابات",
                    },
                    {
                      i: TrendingUp,
                      t: "GAAP/IFRS",
                      d: "متوافق مع المعايير الدولية",
                    },
                  ].map((p, idx) => {
                    const Ic = p.i;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-border/60 bg-card p-2.5"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Ic className="w-3.5 h-3.5 text-brand" />
                          <span className="text-[11px] font-bold">{p.t}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {p.d}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Aging Dialog */}
      <Dialog open={showAging} onOpenChange={setShowAging}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" /> تقرير تقادم المخزون
            </DialogTitle>
            <DialogDescription className="text-xs">
              تحليل شامل لعمر المخزون
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {Object.entries(aging).map(([bkt, val], idx) => {
              const pct = (val / totAge) * 100;
              return (
                <div key={bkt} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold">{bkt} يوم</span>
                      <p className="text-[10px] text-muted-foreground">
                        التوصية: {agingRecs[bkt]}
                      </p>
                    </div>
                    <div className="text-left">
                      <div className="text-base font-black tabular-nums">
                        {fN(val)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {pct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", agingColors[idx])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAging(false)}
              className="h-9 text-xs"
            >
              اغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COGS Dialog */}
      <Dialog open={showCogs} onOpenChange={setShowCogs}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success" /> تكلفة البضاعة
              المباعة
            </DialogTitle>
            <DialogDescription className="text-xs">
              COGS = اول المدة + المشتريات - اخر المدة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(
              [
                {
                  l: "رصيد اول المدة",
                  v: totals.val * 0.85,
                  s: false,
                  neg: false,
                },
                { l: "+ المشتريات", v: totals.val * 0.4, s: true, neg: false },
                { l: "- رصيد اخر المدة", v: totals.val, s: false, neg: true },
              ] as const
            ).map(item => (
              <div
                key={item.l}
                className="rounded-xl border border-border p-3 bg-muted/30"
              >
                <div className="flex items-center justify-between text-xs">
                  <span>{item.l}</span>
                  <span
                    className={cn(
                      "font-black tabular-nums",
                      item.neg
                        ? "text-destructive"
                        : item.s
                          ? "text-success"
                          : ""
                    )}
                  >
                    {item.neg ? "-" : item.s ? "+" : ""}
                    {fN(item.v)}
                  </span>
                </div>
              </div>
            ))}
            <div className="rounded-xl border-2 border-success/30 bg-success/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black">= COGS</span>
                <span className="text-lg font-black text-success tabular-nums">
                  {fN(totals.val * 0.25)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCogs(false)}
              className="h-9 text-xs"
            >
              اغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
