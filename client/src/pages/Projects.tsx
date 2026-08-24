import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { toast } from "sonner";
import {
  FolderKanban,
  ListTodo,
  Plus,
  Search,
  Trash2,
  Pencil,
  Users,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const PROJ_STATUS_LABEL: Record<string, string> = {
  planning: "تخطيط",
  active: "نشط",
  on_hold: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغى",
};
const PROJ_STATUS_TONE: Record<string, string> = {
  planning: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-sky-100 text-sky-700",
  cancelled: "bg-rose-100 text-rose-700",
};
const TASK_STATUS_LABEL: Record<string, string> = {
  todo: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  review: "قيد المراجعة",
  done: "مكتملة",
};
const TASK_STATUS_TONE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-100 text-sky-700",
  review: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};
const PRIORITY_LABEL: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};
const PRIORITY_TONE: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
};

const fmt = (v?: string | number) => {
  const n = parseFloat(v == null ? "0" : String(v));
  return (isNaN(n) ? 0 : n).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
const fmtDate = (v?: string | Date) =>
  v ? new Date(v).toLocaleDateString("ar-EG") : "—";
const toDateInput = (v?: string | Date) =>
  v ? new Date(v).toISOString().slice(0, 10) : "";

export default function Projects() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const projectsQ = trpc.erp.listProjects.useQuery(undefined, { staleTime: 30_000 });
  const tasksQ = trpc.erp.listTasks.useQuery(undefined, { staleTime: 30_000 });
  const performanceQ = trpc.erp.projectPerformance.useQuery(undefined, {
    staleTime: 30_000,
  });
  const projects = (projectsQ.data ?? []) as any[];
  const tasks = (tasksQ.data ?? []) as any[];

  const total = projects.length;
  const active = projects.filter((p) => p.status === "active").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + parseFloat(p.budget || "0"), 0);
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const progressPct = tasks.length ? Math.round((tasksDone / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-display flex">
      <AppSidebar />
      <div className="brand-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => setLocation("/app")}
            className="flex items-center gap-1.5 text-xs text-brand-300 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            العودة للوحة التحكم
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand text-ink flex items-center justify-center font-bold shadow-lg">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display">مساحة المشاريع</h1>
              <p className="text-xs text-white/70 mt-0.5">
                تخطيط وإدارة المشاريع ومهامها — مع تتبع الحالة والأولوية والإنجاز.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="overview">
          <TabsList className="bg-muted p-1 rounded-xl flex gap-1 w-full sm:w-auto">
            <TabsTrigger value="overview" className="text-xs">
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs">
              المشاريع
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">
              المهام
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">
              تقرير الأداء
            </TabsTrigger>
          </TabsList>

          {/* ───────── Overview ───────── */}
          <TabsContent value="overview" className="space-y-5 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="إجمالي المشاريع"
                value={total}
                tone="info"
                icon={FolderKanban}
                hint={`${active} نشط الآن`}
              />
              <StatCard
                label="مشاريع مكتملة"
                value={completed}
                tone="positive"
                icon={CheckCircle2}
                hint="سُلّمت بنجاح"
              />
              <StatCard
                label="إجمالي الميزانيات"
                value={`${fmt(totalBudget)} ر.ي`}
                tone="warning"
                icon={Wallet}
                hint="موزّعة على المشاريع"
              />
              <StatCard
                label="إنجاز المهام"
                value={`${progressPct}%`}
                tone="neutral"
                icon={Clock}
                hint={`${tasksDone} من ${tasks.length} مهمة`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="surface rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">أحدث المشاريع</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">الكود</TableHead>
                        <TableHead className="text-[11px]">الاسم</TableHead>
                        <TableHead className="text-[11px]">الحالة</TableHead>
                        <TableHead className="text-[11px]">الميزانية</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.slice(0, 6).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-[11px] font-mono text-muted-foreground">
                            {p.code}
                          </TableCell>
                          <TableCell className="text-[11px] font-medium">{p.name}</TableCell>
                          <TableCell>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                PROJ_STATUS_TONE[p.status] ?? ""
                              }`}
                            >
                              {PROJ_STATUS_LABEL[p.status] ?? p.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-[11px] dir-ltr">
                            {fmt(p.budget)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {projects.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                            لا توجد مشاريع بعد.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="surface rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">توزيع مهام المشاريع</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {(["todo", "in_progress", "review", "done"] as const).map((st) => {
                    const count = tasks.filter((t) => t.status === st).length;
                    const pct = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
                    return (
                      <div key={st}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="font-medium">{TASK_STATUS_LABEL[st]}</span>
                          <span className="text-muted-foreground dir-ltr">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      لا توجد مهام بعد.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ───────── Projects ───────── */}
          <TabsContent value="projects" className="space-y-4 mt-4">
            <ProjectsPanel projects={projects} utils={utils} />
          </TabsContent>

          {/* ───────── Tasks ───────── */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            <TasksPanel
              projects={projects}
              tasks={tasks}
              utils={utils}
            />
          </TabsContent>

          {/* ───────── Performance Report ───────── */}
          <TabsContent value="performance" className="space-y-4 mt-4">
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface/80">
              <table className="w-full text-sm">
                <thead className="bg-panel/60 text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 text-right">المشروع</th>
                    <th className="px-3 py-2 text-center">التقدم</th>
                    <th className="px-3 py-2 text-left">الموازنة</th>
                    <th className="px-3 py-2 text-left">الصرف</th>
                    <th className="px-3 py-2 text-center">استهلاك الموازنة</th>
                    <th className="px-3 py-2 text-center">ساعات (مخططة/فعلية)</th>
                    <th className="px-3 py-2 text-center">متأخرة</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceQ.isPending ? (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-muted"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  ) : (performanceQ.data?.projects ?? []).length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-muted">لا مشاريع بعد.</td></tr>
                  ) : (
                    (performanceQ.data?.projects ?? []).map(p => (
                      <tr key={p.id} className="border-t border-line/60 hover:bg-panel/30">
                        <td className="px-3 py-2 font-bold">{p.name} · {p.code}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-panel">
                              <div className={`h-full rounded-full ${p.progressPct >= 75 ? "bg-emerald-500" : p.progressPct >= 40 ? "bg-sky-500" : "bg-amber-500"}`} style={{ width: `${p.progressPct}%` }} />
                            </div>
                            <span className="text-xs font-bold">{p.progressPct}%</span>
                          </div>
                          <div className="mt-0.5 text-[10px] text-muted">{p.tasksDone}/{p.tasksTotal} مهمة منجزة</div>
                        </td>
                        <td className="px-3 py-2 text-left font-mono">{p.budget.toLocaleString()}</td>
                        <td className="px-3 py-2 text-left font-mono">{p.spent.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.budgetUsedPct > 100 ? "bg-rose-100 text-rose-700" : p.budgetUsedPct > 80 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {p.budgetUsedPct}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-mono">
                          {p.hoursEstimated.toFixed(0)} / {p.hoursActual.toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {p.overdueTasks > 0 ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{p.overdueTasks}</span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted">
              الصرف الفعلي يُحسب من المصروفات المرتبطة بالمشروع المنفذة؛ ربط القيود المحاسبية مباشرة بالمشاريع متاح كتوسعة لاحقة.
            </p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ───────────────────────── Projects ───────────────────────── */
function ProjectsPanel({ projects, utils }: { projects: any[]; utils: any }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    status: "planning",
    startDate: "",
    endDate: "",
    budget: "0",
  });

  const filtered = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search && !`${p.name} ${p.code}`.includes(search)) return false;
    return true;
  });

  const createM = trpc.erp.createProject.useMutation({
    onSuccess: () => {
      utils.erp.listProjects.invalidate();
      toast.success("تم إنشاء المشروع");
      setDialogOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message || "تعذّر الإنشاء"),
  });
  const updateM = trpc.erp.updateProject.useMutation({
    onSuccess: () => {
      utils.erp.listProjects.invalidate();
      toast.success("تم تحديث المشروع");
      setEditId(null);
      reset();
    },
    onError: (e: any) => toast.error(e.message || "تعذّر التحديث"),
  });
  const deleteM = trpc.erp.deleteProject.useMutation({
    onSuccess: () => {
      utils.erp.listProjects.invalidate();
      utils.erp.listTasks.invalidate();
      toast.success("تم حذف المشروع ومهامه");
    },
    onError: (e: any) => toast.error(e.message || "تعذّر الحذف"),
  });

  const reset = () =>
    setForm({ code: "", name: "", description: "", status: "planning", startDate: "", endDate: "", budget: "0" });
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      code: p.code,
      name: p.name,
      description: p.description || "",
      status: p.status || "planning",
      startDate: toDateInput(p.startDate),
      endDate: toDateInput(p.endDate),
      budget: p.budget || "0",
    });
    setDialogOpen(true);
  };

  return (
    <Card className="surface rounded-2xl">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الكود..."
                className="h-9 text-xs pr-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-36">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {Object.entries(PROJ_STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditId(null);
              reset();
              setDialogOpen(true);
            }}
            className="bg-brand hover:bg-brand-deep text-ink text-xs h-9 font-bold"
          >
            <Plus className="w-4 h-4" /> مشروع جديد
          </Button>
        </div>

        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">الكود</TableHead>
                <TableHead className="text-[11px]">الاسم</TableHead>
                <TableHead className="text-[11px]">الحالة</TableHead>
                <TableHead className="text-[11px]">البداية</TableHead>
                <TableHead className="text-[11px]">النهاية</TableHead>
                <TableHead className="text-[11px]">الميزانية</TableHead>
                <TableHead className="text-[11px] text-left">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-[11px] font-mono text-muted-foreground">
                    {p.code}
                  </TableCell>
                  <TableCell className="text-[11px] font-medium">{p.name}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PROJ_STATUS_TONE[p.status] ?? ""}`}>
                      {PROJ_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px]">{fmtDate(p.startDate)}</TableCell>
                  <TableCell className="text-[11px]">{fmtDate(p.endDate)}</TableCell>
                  <TableCell className="text-[11px] dir-ltr">{fmt(p.budget)}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openEdit(p)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] text-rose-600"
                        onClick={() => {
                          if (confirm(`حذف المشروع "${p.name}" ومهامه؟`))
                            deleteM.mutate({ id: p.id });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                    لا توجد مشاريع مطابقة.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditId(null); } }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              {editId !== null ? "تعديل مشروع" : "مشروع جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              يمكنك تحديث الحالة لاحقاً من نفس النموذج.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">كود المشروع</Label>
                <Input
                  value={form.code}
                  disabled={editId !== null}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="h-9 text-xs dir-ltr"
                  placeholder="PRJ-01"
                />
              </div>
              <div>
                <Label className="text-[10px]">الاسم</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 text-xs"
                  placeholder="اسم المشروع"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJ_STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">الميزانية</Label>
                <Input
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className="h-9 text-xs dir-ltr"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">تاريخ البداية</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-9 text-xs dir-ltr"
                />
              </div>
              <div>
                <Label className="text-[10px]">تاريخ النهاية</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="h-9 text-xs dir-ltr"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">الوصف</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-xs min-h-[60px]"
                placeholder="تفاصيل المشروع ونطاق العمل"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="text-xs h-9" onClick={() => { setDialogOpen(false); setEditId(null); }}>
              إلغاء
            </Button>
            <Button
              disabled={!form.name || createM.isPending || updateM.isPending}
              className="bg-brand hover:bg-brand-deep text-ink text-xs h-9 font-bold"
              onClick={() => {
                if (editId !== null) {
                  updateM.mutate({
                    id: editId,
                    name: form.name,
                    description: form.description || null,
                    status: form.status,
                    budget: form.budget,
                    endDate: form.endDate || null,
                  });
                } else {
                  createM.mutate({
                    code: form.code || `PRJ-${Date.now().toString().slice(-5)}`,
                    name: form.name,
                    description: form.description || undefined,
                    status: form.status,
                    startDate: form.startDate || undefined,
                    endDate: form.endDate || undefined,
                    budget: form.budget,
                  });
                }
              }}
            >
              {editId !== null ? "حفظ التعديلات" : "إنشاء المشروع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ───────────────────────── Tasks ───────────────────────── */
function TasksPanel({
  projects,
  tasks,
  utils,
}: {
  projects: any[];
  tasks: any[];
  utils: any;
}) {
  const [projectId, setProjectId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    estimatedHours: "",
  });

  const effectiveProject = projectId ? Number(projectId) : projects[0]?.id;
  const projectTasks = effectiveProject
    ? tasks.filter((t) => t.projectId === effectiveProject)
    : [];

  const createM = trpc.erp.createTask.useMutation({
    onSuccess: () => {
      utils.erp.listTasks.invalidate();
      toast.success("تمت إضافة المهمة");
      setDialogOpen(false);
      setForm({ title: "", description: "", status: "todo", priority: "medium", dueDate: "", estimatedHours: "" });
    },
    onError: (e: any) => toast.error(e.message || "تعذّر الإضافة"),
  });
  const updateM = trpc.erp.updateTask.useMutation({
    onSuccess: () => utils.erp.listTasks.invalidate(),
    onError: (e: any) => toast.error(e.message || "تعذّر التحديث"),
  });
  const deleteM = trpc.erp.deleteTask.useMutation({
    onSuccess: () => utils.erp.listTasks.invalidate(),
    onError: (e: any) => toast.error(e.message || "تعذّر الحذف"),
  });

  if (projects.length === 0) {
    return (
      <Card className="surface rounded-2xl">
        <CardContent className="p-8 text-center text-xs text-muted-foreground">
          أنشئ مشروعاً أولاً من تبويب «المشاريع» لإضافة مهام له.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <Select
          value={String(effectiveProject)}
          onValueChange={(v) => setProjectId(v)}
        >
          <SelectTrigger className="h-9 text-xs w-full sm:w-72">
            <SelectValue placeholder="اختر مشروعاً" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setForm({ title: "", description: "", status: "todo", priority: "medium", dueDate: "", estimatedHours: "" });
            setDialogOpen(true);
          }}
          className="bg-brand hover:bg-brand-deep text-ink text-xs h-9 font-bold"
        >
          <Plus className="w-4 h-4" /> مهمة جديدة
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">المهمة</TableHead>
              <TableHead className="text-[11px]">الحالة</TableHead>
              <TableHead className="text-[11px]">الأولوية</TableHead>
              <TableHead className="text-[11px]">التاريخ</TableHead>
              <TableHead className="text-[11px] text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectTasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-[11px]">
                  <p className="font-medium">{t.title}</p>
                  {t.description && (
                    <p className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                      {t.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={t.status}
                    onValueChange={(v) => updateM.mutate({ id: t.id, status: v })}
                  >
                    <SelectTrigger className="h-7 text-[10px] border-0 bg-transparent p-0 w-auto">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TASK_STATUS_TONE[t.status] ?? ""}`}>
                        {TASK_STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_TONE[t.priority] ?? ""}`}>
                    {PRIORITY_LABEL[t.priority] ?? t.priority}
                  </span>
                </TableCell>
                <TableCell className="text-[11px]">{fmtDate(t.dueDate)}</TableCell>
                <TableCell className="text-left">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] text-rose-600"
                    onClick={() => deleteM.mutate({ id: t.id })}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {projectTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                  لا توجد مهام لهذا المشروع.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">مهمة جديدة</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              للمشروع: {projects.find((p) => p.id === effectiveProject)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-1">
            <div>
              <Label className="text-[10px]">العنوان</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 text-xs"
                placeholder="عنوان المهمة"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">الأولوية</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">تاريخ الاستحقاق</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="h-9 text-xs dir-ltr"
                />
              </div>
              <div>
                <Label className="text-[10px]">الساعات المقدّرة</Label>
                <Input
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                  className="h-9 text-xs dir-ltr"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">الوصف</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-xs min-h-[50px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="text-xs h-9" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              disabled={!form.title || !effectiveProject || createM.isPending}
              className="bg-brand hover:bg-brand-deep text-ink text-xs h-9 font-bold"
              onClick={() =>
                createM.mutate({
                  projectId: effectiveProject!,
                  title: form.title,
                  description: form.description || undefined,
                  status: form.status,
                  priority: form.priority,
                  dueDate: form.dueDate || undefined,
                  estimatedHours: form.estimatedHours || undefined,
                })
              }
            >
              {createM.isPending ? "جاري الحفظ…" : "إضافة المهمة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
