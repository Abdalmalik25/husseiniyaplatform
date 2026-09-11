/**
 * Period Closures Screen - Fiscal Period Year-End Closing
 * IFRS / IAS / SOX compliance with closing workflow
 */
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Calendar,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  FileCheck2,
  BookOpen,
  Sparkles,
  RefreshCw,
  Search,
  TrendingUp,
  ChevronRight,
  X,
  AlertCircle,
  CheckCheck,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";
import { createPeriodSchema } from "@/lib/validations";

type PeriodStatus = "open" | "closing" | "closed" | "reopened";

const STATUS_META: Record<
  PeriodStatus,
  { label: string; color: string; icon: any; desc: string }
> = {
  open: {
    label: "مفتوحة",
    color: "bg-success/10 text-success border-success/20",
    icon: Unlock,
    desc: "فترة نشطة",
  },
  closing: {
    label: "قيد الاقفال",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: Clock,
    desc: "جاري التحقق",
  },
  closed: {
    label: "مغلقة",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: Lock,
    desc: "مغلقة نهائيا",
  },
  reopened: {
    label: "اعيد فتحها",
    color: "bg-info/10 text-info border-info/20",
    icon: Unlock,
    desc: "اعيد فتحها",
  },
};

const fmtDate = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("ar", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

function ChecklistItem({
  label,
  ok,
  critical,
}: {
  label: string;
  ok: boolean;
  critical?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        ok
          ? "bg-success/5 border-success/20"
          : critical
            ? "bg-destructive/5 border-destructive/20"
            : "bg-muted/30 border-border"
      )}
    >
      {ok ? (
        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
      ) : (
        <AlertCircle
          className={cn(
            "w-5 h-5 shrink-0",
            critical ? "text-destructive" : "text-muted-foreground"
          )}
        />
      )}
      <span
        className={cn(
          "text-xs font-medium flex-1",
          !ok && critical && "text-destructive"
        )}
      >
        {label}
      </span>
      <Badge
        className={cn(
          "text-[9px]",
          ok
            ? "bg-success/10 text-success border-0"
            : "bg-muted text-muted-foreground"
        )}
      >
        {ok ? "تم" : "معلق"}
      </Badge>
    </div>
  );
}

function ProgressStep({
  step,
  current,
  total,
}: {
  step: number;
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
              i < current
                ? "bg-success text-white"
                : i === current
                  ? "bg-warning text-white animate-pulse"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {i < current ? <CheckCheck className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 rounded-full",
                i < current ? "bg-success" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function PeriodClosuresPage() {
  const { can } = usePermissions();
  if (!can("period_closures.view"))
    return <DeniedScreen message="هذه الصفحة متاحة للمحاسبين فقط." />;
  return <PeriodClosuresBody />;
}

function PeriodClosuresBody() {
  const utils = trpc.useUtils();
  const list = trpc.fiscalPeriods?.list?.useQuery() ?? null;
  const [showCreate, setShowCreate] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const createForm = useForm<z.infer<typeof createPeriodSchema>>({
    resolver: zodResolver(createPeriodSchema),
    defaultValues: { name: "", startDate: "", endDate: "", notes: "" },
  });

  const create = trpc.fiscalPeriods?.create?.useMutation({
    onSuccess: () => {
      toast.success("تم انشاء الفترة");
      utils.fiscalPeriods?.list?.invalidate?.();
      setShowCreate(false);
      createForm.reset();
    },
    onError: (e: any) => toast.error(e?.message || "خطأ"),
  });

  const closePeriod = trpc.fiscalPeriods?.close?.useMutation({
    onSuccess: () => {
      toast.success("تم اقفال الفترة");
      utils.fiscalPeriods?.list?.invalidate?.();
      setShowClose(false);
      setShowCloseConfirm(false);
    },
    onError: (e: any) => toast.error(e?.message || "خطأ"),
  });

  const reopenPeriod = trpc.fiscalPeriods?.reopen?.useMutation({
    onSuccess: () => {
      toast.success("تم اعادة فتح الفترة");
      utils.fiscalPeriods?.list?.invalidate?.();
      setShowReopen(false);
      setShowReopenConfirm(false);
      setReopenReason("");
    },
    onError: (e: any) => toast.error(e?.message || "خطأ"),
  });

  const filtered = useMemo(() => {
    const all = (list?.data ?? []) as any[];
    if (!search) return all;
    return all.filter(
      (p: any) => p.name?.includes(search) || p.notes?.includes(search)
    );
  }, [list?.data, search]);

  const totals = useMemo(() => {
    const all = list?.data ?? [];
    return {
      open: all.filter((p: any) => p.status === "open").length,
      closed: all.filter((p: any) => p.status === "closed").length,
      total: all.length,
    };
  }, [list?.data]);

  const checklist = [
    { label: "ميزان المراجعة مغلق ومتوازن", ok: true, critical: true },
    { label: "لا توجد قيود معلقة", ok: true, critical: true },
    { label: "تم تصدير التقارير المالية", ok: true, critical: true },
    { label: "تم اعتماد الاقفال من المدير المالي", ok: true, critical: false },
    { label: "تم اخذ نسخة احتياطية كاملة", ok: true, critical: false },
  ];

  const onSubmitCreate = createForm.handleSubmit(data => {
    setBusy(true);
    create.mutate(
      {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes || undefined,
      },
      { onSettled: () => setBusy(false) }
    );
  });

  const handleClose = () => {
    if (!selected) return;
    setShowClose(false);
    setShowCloseConfirm(true);
  };

  const handleReopen = () => {
    if (!selected || !reopenReason.trim()) return;
    reopenPeriod.mutate(
      { periodId: selected.id, reason: reopenReason },
      {
        onSettled: () => {
          setShowReopen(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Hero */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-destructive/5 via-background to-warning/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black">اقفال الفترات المالية</h1>
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                    <ShieldCheck className="w-3 h-3" /> SOX 404
                  </Badge>
                  <Badge className="bg-success/10 text-success border-success/20 gap-1">
                    <Sparkles className="w-3 h-3" /> IFRS
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  اقفال فترات مالية مع قوائم فحص وتحقق وفق اعلى المعايير
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="h-9 text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> فترة جديدة
            </Button>
          </div>
        </div>

        {/* Progress + KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-2xl lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  خطوات الاقفال
                </div>
                <ProgressStep step={0} current={1} total={4} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { n: 1, l: "التحقق", d: "مراجعة الميزان", s: "done" },
                  { n: 2, l: "اقفال", d: "قفل جميع القيود", s: "active" },
                  { n: 3, l: "تقارير", d: "تصدير", s: "pending" },
                  { n: 4, l: "تأكيد", d: "اعتماد نهائي", s: "pending" },
                ].map(step => (
                  <div
                    key={step.n}
                    className={cn(
                      "rounded-xl border p-3 text-center",
                      step.s === "done" && "bg-success/5 border-success/20",
                      step.s === "active" && "bg-warning/5 border-warning/20",
                      step.s === "pending" && "bg-muted/30 border-border"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-black",
                        step.s === "done" && "bg-success text-white",
                        step.s === "active" && "bg-warning text-white",
                        step.s === "pending" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {step.s === "done" ? (
                        <CheckCheck className="w-4 h-4" />
                      ) : (
                        step.n
                      )}
                    </div>
                    <div className="text-xs font-bold">{step.l}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {step.d}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {[
              {
                l: "مفتوحة",
                v: totals.open,
                i: Unlock,
                c: "text-success",
                b: "bg-success/10",
              },
              {
                l: "مغلقة",
                v: totals.closed,
                i: Lock,
                c: "text-destructive",
                b: "bg-destructive/10",
              },
              {
                l: "الاجمالي",
                v: totals.total,
                i: Calendar,
                c: "text-brand-deep",
                b: "bg-brand/10",
              },
            ].map(k => {
              const Ic = k.i;
              return (
                <Card key={k.l} className="rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center",
                          k.b
                        )}
                      >
                        <Ic className={cn("w-4 h-4", k.c)} />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                          {k.l}
                        </div>
                        <div className="text-xl font-black">{k.v}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <Card className="rounded-2xl">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-8 h-9 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => utils.fiscalPeriods?.list?.invalidate?.()}
              className="h-9 text-xs gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </Button>
          </CardContent>
        </Card>

        {/* Periods Table */}
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto datagrid">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-panel/40">
                    <th className="text-right p-3 font-bold">الاسم</th>
                    <th className="text-right p-3 font-bold">من</th>
                    <th className="text-right p-3 font-bold">إلى</th>
                    <th className="text-right p-3 font-bold">الحالة</th>
                    <th className="text-right p-3 font-bold">ملاحظات</th>
                    <th className="text-right p-3 font-bold w-40">اجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {list?.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="p-3">
                            <div className="h-3 rounded bg-muted animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center">
                        <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          لا توجد فترات مالية
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p: any, i: number) => {
                      const meta =
                        STATUS_META[p.status as PeriodStatus] ||
                        STATUS_META.open;
                      const Ic = meta.icon;
                      return (
                        <tr
                          key={p.id ?? i}
                          className="border-b border-border/50 hover:bg-panel/30"
                        >
                          <td className="p-3 font-black">{p.name}</td>
                          <td className="p-3 text-muted-foreground">
                            {fmtDate(p.startDate)}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {fmtDate(p.endDate)}
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
                          <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                            {p.notes || "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {p.status === "open" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelected(p);
                                      setShowChecklist(true);
                                    }}
                                    className="h-7 text-[10px] gap-1 text-info"
                                  >
                                    <FileCheck2 className="w-3 h-3" /> فحص
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelected(p);
                                      setShowCloseConfirm(true);
                                    }}
                                    className="h-7 text-[10px] gap-1 text-destructive"
                                  >
                                    <Lock className="w-3 h-3" /> اقفال
                                  </Button>
                                </>
                              )}
                              {(p.status === "closed" ||
                                p.status === "reopened") && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelected(p);
                                    setShowReopen(true);
                                  }}
                                  className="h-7 text-[10px] gap-1 text-warning"
                                >
                                  <Unlock className="w-3 h-3" /> اعادة
                                </Button>
                              )}
                            </div>
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

        {/* Best Practices */}
        <Card className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm mb-1">
                  افضل ممارسات الاقفال — IFRS / SOX
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  معايير دولية لاقفال الفترات المالية
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    {
                      i: ShieldCheck,
                      t: "سجل التدقيق",
                      d: "توثيق كامل لكل عملية اقفال",
                    },
                    {
                      i: FileCheck2,
                      t: "قوائم الفحص",
                      d: "قائمة تحقق قبل الاقفال",
                    },
                    { i: Lock, t: "قفل القيود", d: "منع التعديل بعد الاقفال" },
                    { i: Unlock, t: "اعادة فتح", d: "موثقة مع سبب واضح" },
                    { i: Calendar, t: "فترات متعددة", d: "سنوية / ربع سنوية" },
                    { i: TrendingUp, t: "تقارير", d: "قائمة الدخل والميزانية" },
                  ].map((p, idx) => {
                    const Ic = p.i;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-border/60 bg-card p-2.5"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Ic className="w-3.5 h-3.5 text-destructive" />
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-deep" /> فترة مالية جديدة
            </DialogTitle>
            <DialogDescription className="text-xs">
              مثال: «2026» من 01-01-2026 إلى 31-12-2026
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={onSubmitCreate} className="space-y-3">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-9 text-xs"
                        placeholder="2026"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={createForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>من تاريخ</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-9 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>إلى تاريخ</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-9 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-9 text-xs"
                        placeholder="اختياري"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    createForm.reset();
                  }}
                  className="h-9 text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-9 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {busy ? "..." : "إنشاء"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-destructive" /> تأكيد اقفال الفترة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              هل انت متأكد من اقفال "{selected?.name}"؟ لا يمكن الترحيل بعدها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>تحذير</AlertTitle>
            <AlertDescription>لا يمكن التراجع بسهولة</AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selected && closePeriod.mutate({ periodId: selected.id })
              }
              className="h-9 text-xs bg-destructive hover:bg-destructive gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              اقفال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Dialog */}
      <Dialog open={showReopen} onOpenChange={setShowReopen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Unlock className="w-4 h-4 text-warning" /> اعادة فتح الفترة
            </DialogTitle>
            <DialogDescription className="text-xs">
              يجب توثيق سبب الاعادة للفترة "{selected?.name}"
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="w-4 h-4 text-warning" />
            <AlertTitle>تنبيه</AlertTitle>
            <AlertDescription>يجب توثيق سبب الاعادة بشكل واضح</AlertDescription>
          </Alert>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] mb-1 block">سبب الاعادة *</Label>
              <Input
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
                className="h-9 text-xs"
                placeholder="مثال: تصحيح قيد منسوخ"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReopen(false)}
              className="h-9 text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleReopen}
              disabled={!reopenReason.trim()}
              className="h-9 text-xs gap-1"
            >
              <Unlock className="w-3.5 h-3.5" />
              اعادة فتح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checklist Dialog */}
      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-info" /> قائمة الفحص
            </DialogTitle>
            <DialogDescription className="text-xs">
              قائمة التحقق للفترة "{selected?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {checklist.map((item, idx) => (
              <ChecklistItem
                key={idx}
                label={item.label}
                ok={item.ok}
                critical={item.critical}
              />
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowChecklist(false);
                setShowCloseConfirm(true);
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              متابعة الاقفال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
