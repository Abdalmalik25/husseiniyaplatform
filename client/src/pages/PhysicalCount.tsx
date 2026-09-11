/**
 * Physical Count / Cycle Count Screen
 * Inventory verification with variance analysis and approval workflow
 */
import { useState, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  ClipboardCheck,
  Package,
  Plus,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  X,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  Calendar,
  Warehouse,
  Eye,
  ArrowRight,
  ArrowLeft,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";

type CountStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "approved"
  | "cancelled";

const STATUS_META: Record<
  CountStatus,
  { label: string; color: string; icon: any }
> = {
  planned: {
    label: "مخطط",
    color: "bg-info/10 text-info border-info/20",
    icon: Calendar,
  },
  in_progress: {
    label: "جاري",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: Clock,
  },
  completed: {
    label: "مكتمل",
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle2,
  },
  approved: {
    label: "معتمد",
    color: "bg-brand/10 text-brand border-brand/20",
    icon: ShieldCheck,
  },
  cancelled: {
    label: "ملغي",
    color: "bg-muted text-muted-foreground border-border",
    icon: X,
  },
};

const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n || 0);

function VarianceBar({ variance, qty }: { variance: number; qty: number }) {
  const pct = qty ? Math.abs(variance / qty) * 100 : 0;
  const isOver = variance > 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className={cn(isOver ? "text-success" : "text-destructive")}>
          {isOver ? "+" : ""}
          {fmtNum(variance)} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOver ? "bg-success" : "bg-destructive"
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function PhysicalCountPage() {
  const { can } = usePermissions();
  if (!can("inventory.physical_count"))
    return <DeniedScreen message="هذه الصفحة متاحة لموظفي المخزون فقط." />;
  return <PhysicalCountBody />;
}

function PhysicalCountBody() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("counts");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<CountStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [newForm, setNewForm] = useState({
    countNumber: "",
    warehouseId: "",
    plannedDate: "",
    notes: "",
  });

  // Demo counts — memoized so dependent memos keep stable references
  const counts = useMemo(
    () => [
      {
        id: 1,
        countNumber: "CC-2026-001",
        warehouseName: "المخزن الرئيسي",
        plannedDate: "2026-01-15",
        status: "approved" as CountStatus,
        totalItems: 245,
        varianceItems: 12,
        varianceValue: -3500,
        approvedBy: "أحمد محمد",
      },
      {
        id: 2,
        countNumber: "CC-2026-002",
        warehouseName: "مستودع الفرعي",
        plannedDate: "2026-02-20",
        status: "completed" as CountStatus,
        totalItems: 120,
        varianceItems: 5,
        varianceValue: 1200,
        approvedBy: null,
      },
      {
        id: 3,
        countNumber: "CC-2026-003",
        warehouseName: "المخزن الرئيسي",
        plannedDate: "2026-03-10",
        status: "in_progress" as CountStatus,
        totalItems: 180,
        varianceItems: 0,
        varianceValue: 0,
        approvedBy: null,
      },
      {
        id: 4,
        countNumber: "CC-2026-004",
        warehouseName: "مستودع الفرعي",
        plannedDate: "2026-03-25",
        status: "planned" as CountStatus,
        totalItems: 90,
        varianceItems: 0,
        varianceValue: 0,
        approvedBy: null,
      },
    ],
    []
  );

  const warehouses = trpc.warehouses?.list?.useQuery() ?? null;

  const filtered = useMemo(() => {
    return counts
      .filter(
        c =>
          !search ||
          c.countNumber.includes(search) ||
          c.warehouseName.includes(search)
      )
      .filter(c => filterStatus === "all" || c.status === filterStatus);
  }, [counts, search, filterStatus]);

  const stats = useMemo(() => {
    const all = counts;
    return {
      total: all.length,
      planned: all.filter(c => c.status === "planned").length,
      inProgress: all.filter(c => c.status === "in_progress").length,
      completed: all.filter(c => c.status === "completed").length,
      approved: all.filter(c => c.status === "approved").length,
      totalVariance: all.reduce((a, c) => a + c.varianceValue, 0),
    };
  }, [counts]);

  const handleCreate = () => {
    if (!newForm.countNumber || !newForm.warehouseId)
      return toast.error("املا الحقول المطلوبة");
    toast.success(`تم انشاء عملية الجرد ${newForm.countNumber}`);
    setShowCreate(false);
    setNewForm({
      countNumber: "",
      warehouseId: "",
      plannedDate: "",
      notes: "",
    });
  };

  const handleApprove = (count: any) => {
    toast.success(`تم اعتماد جرد ${count.countNumber}`);
    setShowDetails(false);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Hero */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-warning/5 via-background to-success/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-6 h-6 text-warning" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black">الجرد الفعلي</h1>
                  <Badge className="bg-success/10 text-success border-success/20 gap-1">
                    <Sparkles className="w-3 h-3" /> GS1
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  جرد دوري / جرد كامل مع تحليل الفروقات واعتماد管理层
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="h-9 text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> عملية جرد جديدة
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {(
            [
              {
                l: "اجمالي عمليات الجرد",
                v: stats.total,
                i: ClipboardCheck,
                b: "bg-brand/10",
                c: "text-brand-deep",
              },
              {
                l: "مخطط",
                v: stats.planned,
                i: Calendar,
                b: "bg-info/10",
                c: "text-info",
              },
              {
                l: "جاري",
                v: stats.inProgress,
                i: Clock,
                b: "bg-warning/10",
                c: "text-warning",
              },
              {
                l: "معتمد",
                v: stats.approved,
                i: ShieldCheck,
                b: "bg-brand/10",
                c: "text-brand",
              },
              {
                l: "اجمالي الفروقات",
                v: fmtNum(Math.abs(stats.totalVariance)),
                i: BarChart3,
                b:
                  stats.totalVariance >= 0
                    ? "bg-success/10"
                    : "bg-destructive/10",
                c:
                  stats.totalVariance >= 0
                    ? "text-success"
                    : "text-destructive",
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

        {/* Filters */}
        <Card className="rounded-2xl">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-8 h-9 text-xs"
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(v: any) => setFilterStatus(v)}
            >
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="planned">مخطط</SelectItem>
                <SelectItem value="in_progress">جاري</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Counts Table */}
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto datagrid">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-panel/40">
                    <th className="text-right p-3 font-bold">رقم الجرد</th>
                    <th className="text-right p-3 font-bold">المخزن</th>
                    <th className="text-right p-3 font-bold">التاريخ</th>
                    <th className="text-right p-3 font-bold">الحالة</th>
                    <th className="text-right p-3 font-bold">اجمالي الاصناف</th>
                    <th className="text-right p-3 font-bold">فروقات</th>
                    <th className="text-right p-3 font-bold">قيمة الفروقات</th>
                    <th className="text-right p-3 font-bold">اعتمدها</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center">
                        <ClipboardCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          لا توجد عمليات جرد
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c: any, i: number) => {
                      const statusKey = (c.status as CountStatus) || "planned";
                      const meta =
                        STATUS_META[statusKey] || STATUS_META.planned;
                      const Ic = meta.icon;
                      return (
                        <tr
                          key={c.id ?? i}
                          className="border-b border-border/50 hover:bg-panel/30"
                        >
                          <td className="p-3 font-black">{c.countNumber}</td>
                          <td className="p-3 text-muted-foreground">
                            {c.warehouseName}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {c.plannedDate}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] gap-1", meta.color)}
                            >
                              <Ic className="w-3 h-3" />
                              {meta.label}
                            </Badge>
                          </td>
                          <td className="p-3 tabular-nums font-bold">
                            {c.totalItems}
                          </td>
                          <td className="p-3">
                            <VarianceBar
                              variance={c.varianceItems}
                              qty={c.totalItems}
                            />
                          </td>
                          <td
                            className={cn(
                              "p-3 tabular-nums font-black",
                              c.varianceValue >= 0
                                ? "text-success"
                                : "text-destructive"
                            )}
                          >
                            {c.varianceValue >= 0 ? "+" : ""}
                            {fmtNum(c.varianceValue)}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {c.approvedBy || "—"}
                          </td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setSelectedCount(c);
                                setShowDetails(true);
                              }}
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
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

        {/* Variance Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" /> فروقات زائدة (+)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {counts.filter(c => c.varianceValue > 0).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  لا توجد فروقات زائدة
                </p>
              ) : (
                counts
                  .filter(c => c.varianceValue > 0)
                  .map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-success/5 border border-success/20"
                    >
                      <div>
                        <div className="text-xs font-bold">{c.countNumber}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.warehouseName}
                        </div>
                      </div>
                      <div className="text-success font-black tabular-nums">
                        +{fmtNum(c.varianceValue)}
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" /> فروقات
                ناقصة (-)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {counts.filter(c => c.varianceValue < 0).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  لا توجد فروقات ناقصة
                </p>
              ) : (
                counts
                  .filter(c => c.varianceValue < 0)
                  .map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div>
                        <div className="text-xs font-bold">{c.countNumber}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.warehouseName}
                        </div>
                      </div>
                      <div className="text-destructive font-black tabular-nums">
                        {fmtNum(c.varianceValue)}
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-deep" /> عملية جرد جديدة
            </DialogTitle>
            <DialogDescription className="text-xs">
              انشاء عملية جرد دوري او كامل
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] mb-1 block">رقم الجرد *</Label>
              <Input
                value={newForm.countNumber}
                onChange={e =>
                  setNewForm({ ...newForm, countNumber: e.target.value })
                }
                className="h-9 text-xs"
                placeholder="CC-2026-005"
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block">المخزن *</Label>
              <Select
                value={newForm.warehouseId}
                onValueChange={v => setNewForm({ ...newForm, warehouseId: v })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر المخزن" />
                </SelectTrigger>
                <SelectContent>
                  {(warehouses?.data ?? []).map((w: any) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] mb-1 block">التاريخ المخطط</Label>
              <Input
                type="date"
                value={newForm.plannedDate}
                onChange={e =>
                  setNewForm({ ...newForm, plannedDate: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block">ملاحظات</Label>
              <Input
                value={newForm.notes}
                onChange={e =>
                  setNewForm({ ...newForm, notes: e.target.value })
                }
                className="h-9 text-xs"
                placeholder="اختياري"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="h-9 text-xs"
            >
              إلغاء
            </Button>
            <Button onClick={handleCreate} className="h-9 text-xs gap-1">
              <Plus className="w-3.5 h-3.5" />
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-warning" /> تفاصيل جرد:{" "}
              {selectedCount?.countNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              تحليل الفروقات والاعتماد
            </DialogDescription>
          </DialogHeader>
          {selectedCount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[10px] text-muted-foreground uppercase">
                    المخزن
                  </div>
                  <div className="text-sm font-bold">
                    {selectedCount.warehouseName}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[10px] text-muted-foreground uppercase">
                    التاريخ
                  </div>
                  <div className="text-sm font-bold">
                    {selectedCount.plannedDate}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[10px] text-muted-foreground uppercase">
                    اجمالي الاصناف
                  </div>
                  <div className="text-sm font-black">
                    {selectedCount.totalItems}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[10px] text-muted-foreground uppercase">
                    اصناف بها فروقات
                  </div>
                  <div className="text-sm font-black text-warning">
                    {selectedCount.varianceItems}
                  </div>
                </div>
              </div>
              {selectedCount.varianceValue !== 0 && (
                <div
                  className={cn(
                    "rounded-xl border-2 p-4 text-center",
                    selectedCount.varianceValue >= 0
                      ? "border-success/30 bg-success/5"
                      : "border-destructive/30 bg-destructive/5"
                  )}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    اجمالي قيمة الفروقات
                  </div>
                  <div
                    className={cn(
                      "text-2xl font-black",
                      selectedCount.varianceValue >= 0
                        ? "text-success"
                        : "text-destructive"
                    )}
                  >
                    {selectedCount.varianceValue >= 0 ? "+" : ""}
                    {fmtNum(selectedCount.varianceValue)}
                  </div>
                </div>
              )}
              {selectedCount.approvedBy && (
                <div className="rounded-xl border border-brand/20 bg-brand/5 p-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand" />
                  <div>
                    <div className="text-xs font-bold text-brand">معتمد</div>
                    <div className="text-[10px] text-muted-foreground">
                      بواسطة: {selectedCount.approvedBy}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDetails(false)}
              className="h-9 text-xs"
            >
              إغلاق
            </Button>
            {selectedCount?.status === "completed" &&
              !selectedCount.approvedBy && (
                <Button
                  onClick={() => handleApprove(selectedCount)}
                  className="h-9 text-xs gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  اعتماد
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
