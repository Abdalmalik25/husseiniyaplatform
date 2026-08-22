import React, { useState } from "react";
import { useLocation } from "wouter";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FolderKanban,
  Truck,
  Headset,
  ShieldCheck,
  Plus,
  Trash2,
  Pencil,
  Clock,
  Wallet,
  UserPlus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MODULES, modulesForRole, type ModuleKey } from "@/lib/design";
import { formatMoney } from "@/lib/design";

const ERP_KEYS: ModuleKey[] = [
  "hr",
  "projects",
  "procurement",
  "support",
  "quality",
];

const ICONS: Record<string, React.ElementType> = {
  hr: Users,
  projects: FolderKanban,
  procurement: Truck,
  support: Headset,
  quality: ShieldCheck,
};

export default function ErpPage() {
  const { user } = useAuth();
  const [loc] = useLocation();
  const visible = ERP_KEYS.filter(k => modulesForRole(user?.role).includes(k));
  const params = new URLSearchParams(loc.split("?")[1] || "");
  const requested = params.get("module") as ModuleKey | null;
  const defaultTab =
    requested && visible.includes(requested) ? requested : visible[0];
  const [tab, setTab] = useState<ModuleKey>(defaultTab);

  const { data: dash } = trpc.erp.getDashboard.useQuery();

  if (!visible.length) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <HeaderNavbar />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">
            لا توجد وحدات تشغيلية مصرّح بها لدورك الحالي.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24" dir="rtl">
      <HeaderNavbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground">
            الوحدات التشغيلية العرضية
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            وحدات مخصّصة لكل دور: الموارد البشرية، المشاريع، المشتريات، خدمة
            العملاء، والجودة.
          </p>
        </div>

        {dash && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="الموظفون" value={dash.employees} />
            <Stat label="مشاريع نشطة" value={dash.activeProjects} />
            <Stat label="تذاكر مفتوحة" value={dash.openTickets} />
            <Stat label="طلبات معلّقة" value={dash.pendingRequisitions} />
            <Stat label="فحوص جودة" value={dash.inspections} />
          </div>
        )}

        <Tabs value={tab} onValueChange={v => setTab(v as ModuleKey)}>
          <TabsList className="flex-wrap">
            {visible.map(k => {
              const Icon = ICONS[k];
              return (
                <TabsTrigger key={k} value={k} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {MODULES[k].label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {visible.includes("hr") && (
            <TabsContent value="hr">
              <HrSection />
            </TabsContent>
          )}
          {visible.includes("projects") && (
            <TabsContent value="projects">
              <ProjectsSection />
            </TabsContent>
          )}
          {visible.includes("procurement") && (
            <TabsContent value="procurement">
              <ProcurementSection />
            </TabsContent>
          )}
          {visible.includes("support") && (
            <TabsContent value="support">
              <SupportSection />
            </TabsContent>
          )}
          {visible.includes("quality") && (
            <TabsContent value="quality">
              <QualitySection />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  onConfirm,
  onCancel,
  pending,
}: {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={o => !o && onCancel()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
          </DialogClose>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            حذف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionShell({
  title,
  badge,
  onAdd,
  children,
}: {
  title: string;
  badge: string;
  onAdd: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <Badge className="bg-ink text-brand-300 font-bold text-xs mb-1">
            {badge}
          </Badge>
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
        </div>
        {onAdd}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold" dir="ltr">
        {value}
      </p>
    </div>
  );
}

/* ============================== HR ============================== */
function HrSection() {
  const utils = trpc.useUtils();
  const { data: employees } = trpc.erp.listEmployees.useQuery({});
  const { data: departments } = trpc.erp.listDepartments.useQuery();
  const createEmp = trpc.erp.createEmployee.useMutation({
    onSuccess: () => utils.erp.listEmployees.invalidate(),
  });
  const updateEmp = trpc.erp.updateEmployee.useMutation({
    onSuccess: () => utils.erp.listEmployees.invalidate(),
  });
  const deleteEmp = trpc.erp.deleteEmployee.useMutation({
    onSuccess: () => utils.erp.listEmployees.invalidate(),
  });
  const createDept = trpc.erp.createDepartment.useMutation({
    onSuccess: () => utils.erp.listDepartments.invalidate(),
  });
  const updateDept = trpc.erp.updateDepartment.useMutation({
    onSuccess: () => utils.erp.listDepartments.invalidate(),
  });
  const deleteDept = trpc.erp.deleteDepartment.useMutation({
    onSuccess: () => utils.erp.listDepartments.invalidate(),
  });

  const [empOpen, setEmpOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [deptOpen, setDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [del, setDel] = useState<{ id: number; kind: "emp" | "dept" } | null>(
    null
  );

  const deptName = (id?: number | null) =>
    departments?.find(d => d.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <SectionShell
        title="الموارد البشرية — الموظفون والأقسام"
        badge="وحدة الموارد البشرية"
        onAdd={
          <div className="flex gap-2">
            <Dialog open={empOpen} onOpenChange={setEmpOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                >
                  <Plus className="w-4 h-4" /> موظف جديد
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>تسجيل موظف جديد</DialogTitle>
                </DialogHeader>
                <EmployeeDialog
                  departments={departments ?? []}
                  pending={createEmp.isPending}
                  onSave={v => {
                    createEmp.mutate(v as any, {
                      onSuccess: () => setEmpOpen(false),
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" /> قسم
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة قسم</DialogTitle>
                </DialogHeader>
                <DepartmentDialog
                  pending={createDept.isPending}
                  onSave={v => {
                    createDept.mutate(v as any, {
                      onSuccess: () => setDeptOpen(false),
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="إجمالي الموظفين" value={employees?.length ?? 0} />
          <Stat label="الأقسام" value={departments?.length ?? 0} />
          <Stat
            label="النشطون"
            value={employees?.filter(e => e.status === "active").length ?? 0}
          />
          <Stat
            label="إجمالي الرواتب"
            value={formatMoney(
              employees?.reduce((s, e) => s + (parseFloat(e.salary) || 0), 0) ??
                0
            )}
          />
        </div>

        {!employees ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>المسمى</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الراتب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(e => (
                <TableRow key={e.id}>
                  <TableCell dir="ltr">{e.code}</TableCell>
                  <TableCell>{e.fullName}</TableCell>
                  <TableCell>{e.jobTitle}</TableCell>
                  <TableCell>{deptName(e.departmentId)}</TableCell>
                  <TableCell dir="ltr">{formatMoney(e.salary)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={e.status === "active" ? "default" : "secondary"}
                    >
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditingEmp(e)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600"
                        onClick={() => setDel({ id: e.id, kind: "emp" })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2">الأقسام</p>
          <div className="flex flex-wrap gap-2">
            {departments?.map(d => (
              <div
                key={d.id}
                className="flex items-center gap-1 rounded-lg border px-2 py-1 text-sm"
              >
                <span>
                  {d.name}{" "}
                  <span className="text-muted-foreground dir-ltr">
                    ({d.code})
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setEditingDept(d)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-600"
                  onClick={() => setDel({ id: d.id, kind: "dept" })}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <AttendanceCard employees={employees ?? []} />
      <PayrollCard />

      <Dialog open={!!editingEmp} onOpenChange={o => !o && setEditingEmp(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل موظف</DialogTitle>
          </DialogHeader>
          {editingEmp && (
            <EmployeeDialog
              initial={editingEmp}
              departments={departments ?? []}
              pending={updateEmp.isPending}
              onSave={v => {
                updateEmp.mutate(
                  { id: editingEmp.id, ...(v as any) },
                  { onSuccess: () => setEditingEmp(null) }
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingDept}
        onOpenChange={o => !o && setEditingDept(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل قسم</DialogTitle>
          </DialogHeader>
          {editingDept && (
            <DepartmentDialog
              initial={editingDept}
              employees={employees ?? []}
              pending={updateDept.isPending}
              onSave={v => {
                updateDept.mutate(
                  { id: editingDept.id, ...(v as any) },
                  { onSuccess: () => setEditingDept(null) }
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        title="تأكيد الحذف؟"
        pending={
          del?.kind === "emp" ? deleteEmp.isPending : deleteDept.isPending
        }
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (!del) return;
          if (del.kind === "emp") deleteEmp.mutate({ id: del.id });
          else deleteDept.mutate({ id: del.id });
          setDel(null);
        }}
      />
    </div>
  );
}

function EmployeeDialog({
  initial,
  departments,
  pending,
  onSave,
}: {
  initial?: any;
  departments: any[];
  pending: boolean;
  onSave: (v: any) => void;
}) {
  const [f, setF] = useState({
    code: initial?.code ?? "",
    fullName: initial?.fullName ?? "",
    jobTitle: initial?.jobTitle ?? "",
    departmentId: initial?.departmentId ? String(initial.departmentId) : "",
    salary: initial?.salary ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    status: initial?.status ?? "active",
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>الرقم الوظيفي</Label>
          <Input
            value={f.code}
            onChange={e => setF({ ...f, code: e.target.value })}
          />
        </div>
        <div>
          <Label>القسم</Label>
          <Select
            value={f.departmentId}
            onValueChange={v => setF({ ...f, departmentId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر القسم" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>الاسم الكامل</Label>
        <Input
          value={f.fullName}
          onChange={e => setF({ ...f, fullName: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>المسمى الوظيفي</Label>
          <Input
            value={f.jobTitle}
            onChange={e => setF({ ...f, jobTitle: e.target.value })}
          />
        </div>
        <div>
          <Label>الراتب</Label>
          <Input
            type="number"
            value={f.salary}
            onChange={e => setF({ ...f, salary: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>الهاتف</Label>
          <Input
            value={f.phone}
            onChange={e => setF({ ...f, phone: e.target.value })}
          />
        </div>
        <div>
          <Label>البريد</Label>
          <Input
            value={f.email}
            onChange={e => setF({ ...f, email: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>الحالة</Label>
        <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="on_leave">في إجازة</SelectItem>
            <SelectItem value="terminated">منتهي</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild>
          <Button variant="outline">إلغاء</Button>
        </DialogClose>
        <Button
          disabled={pending}
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
          onClick={() =>
            onSave({
              code: f.code,
              fullName: f.fullName,
              jobTitle: f.jobTitle,
              departmentId: f.departmentId ? Number(f.departmentId) : undefined,
              salary: f.salary || "0",
              phone: f.phone,
              email: f.email,
              status: f.status,
            })
          }
        >
          حفظ
        </Button>
      </DialogFooter>
    </div>
  );
}

function DepartmentDialog({
  initial,
  employees,
  pending,
  onSave,
}: {
  initial?: any;
  employees?: any[];
  pending: boolean;
  onSave: (v: any) => void;
}) {
  const [f, setF] = useState({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    managerId: initial?.managerId ? String(initial.managerId) : "",
    costCenter: initial?.costCenter ?? "",
    isActive: initial?.isActive ?? true,
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>رمز القسم</Label>
          <Input
            value={f.code}
            onChange={e => setF({ ...f, code: e.target.value })}
          />
        </div>
        <div>
          <Label>اسم القسم</Label>
          <Input
            value={f.name}
            onChange={e => setF({ ...f, name: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>المدير</Label>
          <Select
            value={f.managerId}
            onValueChange={v => setF({ ...f, managerId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر مديرًا" />
            </SelectTrigger>
            <SelectContent>
              {(employees ?? []).map(e => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>مركز التكلفة</Label>
          <Input
            value={f.costCenter}
            onChange={e => setF({ ...f, costCenter: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild>
          <Button variant="outline">إلغاء</Button>
        </DialogClose>
        <Button
          disabled={pending || !f.code || !f.name}
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
          onClick={() =>
            onSave({
              code: f.code,
              name: f.name,
              managerId: f.managerId ? Number(f.managerId) : undefined,
              costCenter: f.costCenter || undefined,
              isActive: f.isActive,
            })
          }
        >
          حفظ
        </Button>
      </DialogFooter>
    </div>
  );
}

function AttendanceCard({ employees }: { employees: any[] }) {
  const utils = trpc.useUtils();
  const { data: rows, isLoading } = trpc.erp.listAttendance.useQuery({});
  const createAtt = trpc.erp.createAttendance.useMutation({
    onSuccess: () => utils.erp.listAttendance.invalidate(),
  });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    employeeId: "",
    date: "",
    status: "present",
    checkIn: "",
    checkOut: "",
    note: "",
  });

  return (
    <SectionShell
      title="الحضور والانصراف"
      badge="سجل الحضور"
      onAdd={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
            >
              <Clock className="w-4 h-4" /> تسجيل حضور
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تسجيل حضور</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>الموظف</Label>
                <Select
                  value={f.employeeId}
                  onValueChange={v => setF({ ...f, employeeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موظفًا" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={f.date}
                    onChange={e => setF({ ...f, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>الحالة</Label>
                  <Select
                    value={f.status}
                    onValueChange={v => setF({ ...f, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">حاضر</SelectItem>
                      <SelectItem value="absent">غائب</SelectItem>
                      <SelectItem value="late">متأخر</SelectItem>
                      <SelectItem value="leave">إجازة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>دخول</Label>
                  <Input
                    type="datetime-local"
                    value={f.checkIn}
                    onChange={e => setF({ ...f, checkIn: e.target.value })}
                  />
                </div>
                <div>
                  <Label>خروج</Label>
                  <Input
                    type="datetime-local"
                    value={f.checkOut}
                    onChange={e => setF({ ...f, checkOut: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>ملاحظة</Label>
                <Input
                  value={f.note}
                  onChange={e => setF({ ...f, note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">إلغاء</Button>
              </DialogClose>
              <Button
                disabled={createAtt.isPending || !f.employeeId || !f.date}
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                onClick={() =>
                  createAtt.mutate(
                    {
                      employeeId: Number(f.employeeId),
                      date: f.date,
                      status: f.status,
                      checkIn: f.checkIn || undefined,
                      checkOut: f.checkOut || undefined,
                      note: f.note || undefined,
                    },
                    { onSuccess: () => setOpen(false) }
                  )
                }
              >
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>دخول</TableHead>
              <TableHead>خروج</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows?.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  {employees.find(e => e.id === r.employeeId)?.fullName ?? "—"}
                </TableCell>
                <TableCell dir="ltr">{String(r.date).slice(0, 10)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{r.status}</Badge>
                </TableCell>
                <TableCell dir="ltr">
                  {r.checkIn ? String(r.checkIn).slice(11, 16) : "—"}
                </TableCell>
                <TableCell dir="ltr">
                  {r.checkOut ? String(r.checkOut).slice(11, 16) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionShell>
  );
}

function PayrollCard() {
  const utils = trpc.useUtils();
  const { data: runs, isLoading } = trpc.erp.listPayrollRuns.useQuery();
  const createRun = trpc.erp.createPayrollRun.useMutation({
    onSuccess: () => utils.erp.listPayrollRuns.invalidate(),
  });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ periodName: "", fromDate: "", toDate: "" });

  return (
    <SectionShell
      title="الرواتب — دورات الصرف"
      badge="كشوف الرواتب"
      onAdd={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
            >
              <Wallet className="w-4 h-4" /> دورة رواتب
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>دورة رواتب جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>اسم الفترة</Label>
                <Input
                  value={f.periodName}
                  onChange={e => setF({ ...f, periodName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>من تاريخ</Label>
                  <Input
                    type="date"
                    value={f.fromDate}
                    onChange={e => setF({ ...f, fromDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={f.toDate}
                    onChange={e => setF({ ...f, toDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">إلغاء</Button>
              </DialogClose>
              <Button
                disabled={
                  createRun.isPending ||
                  !f.periodName ||
                  !f.fromDate ||
                  !f.toDate
                }
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                onClick={() =>
                  createRun.mutate(
                    {
                      periodName: f.periodName,
                      fromDate: f.fromDate,
                      toDate: f.toDate,
                    },
                    { onSuccess: () => setOpen(false) }
                  )
                }
              >
                إنشاء وتجهيز البنود
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الفترة</TableHead>
              <TableHead>المدة</TableHead>
              <TableHead>الصافي</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs?.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.periodName}</TableCell>
                <TableCell dir="ltr">
                  {String(r.fromDate).slice(0, 10)} ←{" "}
                  {String(r.toDate).slice(0, 10)}
                </TableCell>
                <TableCell dir="ltr">{formatMoney(r.totalNet)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionShell>
  );
}

/* ============================ PROJECTS ============================ */
function ProjectsSection() {
  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.erp.listProjects.useQuery({});
  const { data: tasks } = trpc.erp.listTasks.useQuery({});
  const { data: employees } = trpc.erp.listEmployees.useQuery({});
  const createProject = trpc.erp.createProject.useMutation({
    onSuccess: () => utils.erp.listProjects.invalidate(),
  });
  const updateProject = trpc.erp.updateProject.useMutation({
    onSuccess: () => utils.erp.listProjects.invalidate(),
  });
  const deleteProject = trpc.erp.deleteProject.useMutation({
    onSuccess: () => {
      utils.erp.listProjects.invalidate();
      setSel(null);
    },
  });
  const createTask = trpc.erp.createTask.useMutation({
    onSuccess: () => utils.erp.listTasks.invalidate(),
  });
  const updateTask = trpc.erp.updateTask.useMutation({
    onSuccess: () => utils.erp.listTasks.invalidate(),
  });
  const deleteTask = trpc.erp.deleteTask.useMutation({
    onSuccess: () => utils.erp.listTasks.invalidate(),
  });

  const [pOpen, setPOpen] = useState(false);
  const [tOpen, setTOpen] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [del, setDel] = useState<{
    id: number;
    kind: "project" | "task";
  } | null>(null);

  const [p, setP] = useState({ code: "", name: "", budget: "" });
  const [t, setT] = useState({
    projectId: sel ? String(sel) : "",
    title: "",
    assigneeId: "",
    priority: "medium",
  });

  return (
    <div className="space-y-4">
      <SectionShell
        title="إدارة المشاريع — مشاريع ومهام"
        badge="وحدة المشاريع"
        onAdd={
          <Dialog open={pOpen} onOpenChange={setPOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-[#ca8a04] hover:bg-[#a16207] text-white"
              >
                <Plus className="w-4 h-4" /> مشروع جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>مشروع جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>رمز المشروع</Label>
                    <Input
                      value={p.code}
                      onChange={e => setP({ ...p, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>الميزانية</Label>
                    <Input
                      type="number"
                      value={p.budget}
                      onChange={e => setP({ ...p, budget: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>اسم المشروع</Label>
                  <Input
                    value={p.name}
                    onChange={e => setP({ ...p, name: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline">إلغاء</Button>
                </DialogClose>
                <Button
                  disabled={createProject.isPending}
                  className="bg-[#ca8a04] hover:bg-[#a16207] text-white"
                  onClick={() =>
                    createProject.mutate(
                      { code: p.code, name: p.name, budget: p.budget || "0" },
                      { onSuccess: () => setPOpen(false) }
                    )
                  }
                >
                  حفظ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="المشاريع" value={projects?.length ?? 0} />
          <Stat
            label="نشط"
            value={projects?.filter(x => x.status === "active").length ?? 0}
          />
          <Stat label="المهام" value={tasks?.length ?? 0} />
          <Stat
            label="قيد التنفيذ"
            value={tasks?.filter(x => x.status === "in_progress").length ?? 0}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-bold mb-2">المشاريع</h3>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                {projects?.map(pr => (
                  <div
                    key={pr.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      sel === pr.id ? "border-[#ca8a04] bg-[#ca8a04]/5" : ""
                    }`}
                  >
                    <button
                      className="text-right flex-1"
                      onClick={() => setSel(pr.id)}
                    >
                      <p className="font-medium">{pr.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pr.code} • {pr.status} • {formatMoney(pr.budget)}
                      </p>
                    </button>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditingProject(pr)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600"
                        onClick={() => setDel({ id: pr.id, kind: "project" })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold">المهام</h3>
              <Dialog open={tOpen} onOpenChange={setTOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={!projects?.length}
                  >
                    <Plus className="w-3 h-3" /> مهمة
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>مهمة جديدة</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>المشروع</Label>
                      <Select
                        value={t.projectId}
                        onValueChange={v => setT({ ...t, projectId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المشروع" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects?.map(pr => (
                            <SelectItem key={pr.id} value={String(pr.id)}>
                              {pr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>عنوان المهمة</Label>
                      <Input
                        value={t.title}
                        onChange={e => setT({ ...t, title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>المكلف</Label>
                        <Select
                          value={t.assigneeId}
                          onValueChange={v => setT({ ...t, assigneeId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="موظف" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees?.map(e => (
                              <SelectItem key={e.id} value={String(e.id)}>
                                {e.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>الأولوية</Label>
                        <Select
                          value={t.priority}
                          onValueChange={v => setT({ ...t, priority: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">منخفضة</SelectItem>
                            <SelectItem value="medium">متوسطة</SelectItem>
                            <SelectItem value="high">عالية</SelectItem>
                            <SelectItem value="urgent">عاجلة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">إلغاء</Button>
                    </DialogClose>
                    <Button
                      disabled={
                        createTask.isPending || !t.projectId || !t.title
                      }
                      className="bg-[#ca8a04] hover:bg-[#a16207] text-white"
                      onClick={() =>
                        createTask.mutate(
                          {
                            projectId: Number(t.projectId),
                            title: t.title,
                            assigneeId: t.assigneeId
                              ? Number(t.assigneeId)
                              : undefined,
                            priority: t.priority,
                          },
                          { onSuccess: () => setTOpen(false) }
                        )
                      }
                    >
                      حفظ
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المهمة</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks
                  ?.filter(tk => !sel || tk.projectId === sel)
                  .slice(0, 12)
                  .map(tk => (
                    <TableRow key={tk.id}>
                      <TableCell>{tk.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tk.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tk.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditingTask(tk)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-600"
                            onClick={() => setDel({ id: tk.id, kind: "task" })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {sel && <ProjectMembers projectId={sel} employees={employees ?? []} />}
      </SectionShell>

      <Dialog
        open={!!editingProject}
        onOpenChange={o => !o && setEditingProject(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل مشروع</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <ProjectDialog
              initial={editingProject}
              pending={updateProject.isPending}
              onSave={v => {
                updateProject.mutate(
                  { id: editingProject.id, ...(v as any) },
                  { onSuccess: () => setEditingProject(null) }
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingTask}
        onOpenChange={o => !o && setEditingTask(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل مهمة</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskDialog
              initial={editingTask}
              employees={employees ?? []}
              pending={updateTask.isPending}
              onSave={v => {
                updateTask.mutate(
                  { id: editingTask.id, ...(v as any) },
                  { onSuccess: () => setEditingTask(null) }
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        title="تأكيد الحذف؟"
        pending={
          del?.kind === "project"
            ? deleteProject.isPending
            : deleteTask.isPending
        }
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (!del) return;
          if (del.kind === "project") deleteProject.mutate({ id: del.id });
          else deleteTask.mutate({ id: del.id });
          setDel(null);
        }}
      />
    </div>
  );
}

function ProjectDialog({
  initial,
  pending,
  onSave,
}: {
  initial: any;
  pending: boolean;
  onSave: (v: any) => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "planning",
    budget: initial?.budget ?? "",
    endDate: initial?.endDate ? String(initial.endDate).slice(0, 10) : "",
  });
  return (
    <div className="space-y-3">
      <div>
        <Label>اسم المشروع</Label>
        <Input
          value={f.name}
          onChange={e => setF({ ...f, name: e.target.value })}
        />
      </div>
      <div>
        <Label>الوصف</Label>
        <Textarea
          value={f.description}
          onChange={e => setF({ ...f, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>الحالة</Label>
          <Select
            value={f.status}
            onValueChange={v => setF({ ...f, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">تخطيط</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="on_hold">متوقف</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغى</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>الميزانية</Label>
          <Input
            type="number"
            value={f.budget}
            onChange={e => setF({ ...f, budget: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>تاريخ الانتهاء</Label>
        <Input
          type="date"
          value={f.endDate}
          onChange={e => setF({ ...f, endDate: e.target.value })}
        />
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild>
          <Button variant="outline">إلغاء</Button>
        </DialogClose>
        <Button
          disabled={pending}
          className="bg-[#ca8a04] hover:bg-[#a16207] text-white"
          onClick={() =>
            onSave({
              name: f.name,
              description: f.description || undefined,
              status: f.status,
              budget: f.budget || "0",
              endDate: f.endDate || undefined,
            })
          }
        >
          حفظ
        </Button>
      </DialogFooter>
    </div>
  );
}

function TaskDialog({
  initial,
  employees,
  pending,
  onSave,
}: {
  initial: any;
  employees: any[];
  pending: boolean;
  onSave: (v: any) => void;
}) {
  const [f, setF] = useState({
    status: initial?.status ?? "todo",
    priority: initial?.priority ?? "medium",
    assigneeId: initial?.assigneeId ? String(initial.assigneeId) : "",
    actualHours: initial?.actualHours ?? "",
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>الحالة</Label>
          <Select
            value={f.status}
            onValueChange={v => setF({ ...f, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">بانتظار البدء</SelectItem>
              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
              <SelectItem value="review">مراجعة</SelectItem>
              <SelectItem value="done">منجزة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>الأولوية</Label>
          <Select
            value={f.priority}
            onValueChange={v => setF({ ...f, priority: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">منخفضة</SelectItem>
              <SelectItem value="medium">متوسطة</SelectItem>
              <SelectItem value="high">عالية</SelectItem>
              <SelectItem value="urgent">عاجلة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>المكلف</Label>
          <Select
            value={f.assigneeId}
            onValueChange={v => setF({ ...f, assigneeId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="موظف" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>ساعات فعلية</Label>
          <Input
            type="number"
            value={f.actualHours}
            onChange={e => setF({ ...f, actualHours: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild>
          <Button variant="outline">إلغاء</Button>
        </DialogClose>
        <Button
          disabled={pending}
          className="bg-[#ca8a04] hover:bg-[#a16207] text-white"
          onClick={() =>
            onSave({
              status: f.status,
              priority: f.priority,
              assigneeId: f.assigneeId ? Number(f.assigneeId) : undefined,
              actualHours: f.actualHours || undefined,
            })
          }
        >
          حفظ
        </Button>
      </DialogFooter>
    </div>
  );
}

function ProjectMembers({
  projectId,
  employees,
}: {
  projectId: number;
  employees: any[];
}) {
  const utils = trpc.useUtils();
  const { data: members, isLoading } = trpc.erp.listProjectMembers.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  const add = trpc.erp.addProjectMember.useMutation({
    onSuccess: () => utils.erp.listProjectMembers.invalidate(),
  });
  const remove = trpc.erp.removeProjectMember.useMutation({
    onSuccess: () => utils.erp.listProjectMembers.invalidate(),
  });
  const [employeeId, setEmployeeId] = useState("");
  const [roleInProject, setRoleInProject] = useState("");

  const empName = (id?: number | null) =>
    employees.find(e => e.id === id)?.fullName ?? "—";

  return (
    <Card>
      <CardHeader>
        <Badge className="bg-ink text-brand-300 font-bold text-xs mb-1">
          أعضاء المشروع
        </Badge>
        <CardTitle className="text-lg font-bold">فريق العمل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-1">
            {members?.map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span>
                  {empName(m.employeeId)}{" "}
                  <span className="text-muted-foreground text-xs">
                    {m.roleInProject ? `• ${m.roleInProject}` : ""}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-600"
                  onClick={() => remove.mutate({ id: m.id })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
          <div className="flex-1 min-w-[140px]">
            <Label>موظف</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر موظفًا" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label>الدور</Label>
            <Input
              value={roleInProject}
              onChange={e => setRoleInProject(e.target.value)}
            />
          </div>
          <Button
            disabled={add.isPending || !employeeId}
            className="bg-[#ca8a04] hover:bg-[#a16207] text-white"
            onClick={() => {
              add.mutate(
                {
                  projectId,
                  employeeId: Number(employeeId),
                  roleInProject: roleInProject || undefined,
                },
                {
                  onSuccess: () => {
                    setEmployeeId("");
                    setRoleInProject("");
                  },
                }
              );
            }}
          >
            <UserPlus className="w-4 h-4" /> إضافة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================== PROCUREMENT ========================== */
function ProcurementSection() {
  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.erp.listProcurements.useQuery({});
  const createReq = trpc.erp.createProcurement.useMutation({
    onSuccess: () => utils.erp.listProcurements.invalidate(),
  });
  const approve = trpc.erp.approveProcurement.useMutation({
    onSuccess: () => utils.erp.listProcurements.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    itemName: "",
    quantity: "1",
    estimatedCost: "0",
    description: "",
  });

  return (
    <SectionShell
      title="المشتريات — أوامر التوريد والاعتماد"
      badge="وحدة المشتريات"
      onAdd={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-[#b45309] hover:bg-[#92400e] text-white"
            >
              <Plus className="w-4 h-4" /> أمر توريد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>أمر توريد جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>الصنف</Label>
                <Input
                  value={f.itemName}
                  onChange={e => setF({ ...f, itemName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    value={f.quantity}
                    onChange={e => setF({ ...f, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>التكلفة التقديرية</Label>
                  <Input
                    type="number"
                    value={f.estimatedCost}
                    onChange={e =>
                      setF({ ...f, estimatedCost: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={f.description}
                  onChange={e => setF({ ...f, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">إلغاء</Button>
              </DialogClose>
              <Button
                disabled={createReq.isPending}
                className="bg-[#b45309] hover:bg-[#92400e] text-white"
                onClick={() =>
                  createReq.mutate(
                    {
                      itemName: f.itemName,
                      quantity: f.quantity,
                      estimatedCost: f.estimatedCost,
                      description: f.description,
                    },
                    { onSuccess: () => setOpen(false) }
                  )
                }
              >
                إرسال للاعتماد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الرقم</TableHead>
              <TableHead>الصنف</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>التكلفة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map(r => (
              <TableRow key={r.id}>
                <TableCell dir="ltr">{r.requisitionNumber}</TableCell>
                <TableCell>{r.itemName}</TableCell>
                <TableCell dir="ltr">{r.quantity}</TableCell>
                <TableCell dir="ltr">{formatMoney(r.estimatedCost)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      r.status === "approved"
                        ? "default"
                        : r.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.status === "pending" || r.status === "draft" ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() =>
                          approve.mutate({ id: r.id, decision: "approved" })
                        }
                      >
                        اعتماد
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-red-600"
                        onClick={() =>
                          approve.mutate({ id: r.id, decision: "rejected" })
                        }
                      >
                        رفض
                      </Button>
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground mb-2">سير الاعتماد</p>
        <div className="space-y-2">
          {items?.map(r => (
            <ApprovalsFor
              key={r.id}
              procurementId={r.id}
              number={r.requisitionNumber}
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function ApprovalsFor({
  procurementId,
  number,
}: {
  procurementId: number;
  number: string;
}) {
  const { data: approvals, isLoading } =
    trpc.erp.listProcurementApprovals.useQuery({ procurementId });
  if (isLoading) return <Skeleton className="h-10 w-full" />;
  if (!approvals?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs">
      <span className="font-medium dir-ltr">{number}</span>
      <div className="flex flex-wrap gap-2 mt-1">
        {approvals.map(a => (
          <span key={a.id} className="rounded bg-muted px-2 py-0.5">
            المستوى {a.level}: {a.decision}
            {a.note ? ` — ${a.note}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================ SUPPORT ============================ */
function SupportSection() {
  const utils = trpc.useUtils();
  const { data: tickets, isLoading } = trpc.erp.listTickets.useQuery({});
  const createTicket = trpc.erp.createTicket.useMutation({
    onSuccess: () => utils.erp.listTickets.invalidate(),
  });
  const updateTicket = trpc.erp.updateTicket.useMutation({
    onSuccess: () => utils.erp.listTickets.invalidate(),
  });
  const deleteTicket = trpc.erp.deleteTicket.useMutation({
    onSuccess: () => utils.erp.listTickets.invalidate(),
  });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    subject: "",
    customerName: "",
    customerPhone: "",
    priority: "medium",
    description: "",
  });
  const [del, setDel] = useState<number | null>(null);

  return (
    <SectionShell
      title="خدمة العملاء — التذاكر"
      badge="وحدة خدمة العملاء"
      onAdd={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            >
              <Plus className="w-4 h-4" /> تذكرة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>فتح تذكرة دعم</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>الموضوع</Label>
                <Input
                  value={f.subject}
                  onChange={e => setF({ ...f, subject: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>اسم العميل</Label>
                  <Input
                    value={f.customerName}
                    onChange={e => setF({ ...f, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>الهاتف</Label>
                  <Input
                    value={f.customerPhone}
                    onChange={e =>
                      setF({ ...f, customerPhone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>الأولوية</Label>
                <Select
                  value={f.priority}
                  onValueChange={v => setF({ ...f, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>التفاصيل</Label>
                <Textarea
                  value={f.description}
                  onChange={e => setF({ ...f, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">إلغاء</Button>
              </DialogClose>
              <Button
                disabled={createTicket.isPending}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
                onClick={() =>
                  createTicket.mutate(
                    {
                      subject: f.subject,
                      customerName: f.customerName,
                      customerPhone: f.customerPhone,
                      priority: f.priority,
                      description: f.description,
                    },
                    { onSuccess: () => setOpen(false) }
                  )
                }
              >
                فتح التذكرة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الرقم</TableHead>
              <TableHead>الموضوع</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الأولوية</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets?.map(t => (
              <TableRow key={t.id}>
                <TableCell dir="ltr">{t.ticketNumber}</TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>{t.customerName || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{t.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={t.status === "open" ? "destructive" : "secondary"}
                  >
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {t.status !== "closed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() =>
                          updateTicket.mutate({
                            id: t.id,
                            status:
                              t.status === "resolved" ? "closed" : "resolved",
                          })
                        }
                      >
                        {t.status === "resolved" ? "إغلاق" : "حلّ"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600"
                      onClick={() => setDel(t.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ConfirmDialog
        open={!!del}
        title="حذف التذكرة؟"
        pending={deleteTicket.isPending}
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (del) deleteTicket.mutate({ id: del });
          setDel(null);
        }}
      />
    </SectionShell>
  );
}

/* ============================ QUALITY ============================ */
function QualitySection() {
  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.erp.listInspections.useQuery();
  const createIns = trpc.erp.createInspection.useMutation({
    onSuccess: () => utils.erp.listInspections.invalidate(),
  });
  const deleteIns = trpc.erp.deleteInspection.useMutation({
    onSuccess: () => utils.erp.listInspections.invalidate(),
  });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    code: "",
    title: "",
    type: "",
    result: "pass",
    score: "",
    note: "",
  });
  const [del, setDel] = useState<number | null>(null);

  return (
    <SectionShell
      title="الجودة والفحص — سجل الفحوص"
      badge="وحدة الجودة"
      onAdd={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-[#16a34a] hover:bg-[#15803d] text-white"
            >
              <Plus className="w-4 h-4" /> فحص جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تسجيل فحص جودة</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الرمز</Label>
                  <Input
                    value={f.code}
                    onChange={e => setF({ ...f, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>النوع</Label>
                  <Input
                    value={f.type}
                    onChange={e => setF({ ...f, type: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>العنوان</Label>
                <Input
                  value={f.title}
                  onChange={e => setF({ ...f, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>النتيجة</Label>
                  <Select
                    value={f.result}
                    onValueChange={v => setF({ ...f, result: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">مطابق</SelectItem>
                      <SelectItem value="fail">مرفوض</SelectItem>
                      <SelectItem value="conditional">مشروط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الدرجة</Label>
                  <Input
                    type="number"
                    value={f.score}
                    onChange={e => setF({ ...f, score: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  value={f.note}
                  onChange={e => setF({ ...f, note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">إلغاء</Button>
              </DialogClose>
              <Button
                disabled={createIns.isPending}
                className="bg-[#16a34a] hover:bg-[#15803d] text-white"
                onClick={() =>
                  createIns.mutate(
                    {
                      code: f.code,
                      title: f.title,
                      type: f.type,
                      result: f.result,
                      score: f.score || undefined,
                      note: f.note,
                    },
                    { onSuccess: () => setOpen(false) }
                  )
                }
              >
                حفظ الفحص
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الرمز</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>النتيجة</TableHead>
              <TableHead>الدرجة</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map(i => (
              <TableRow key={i.id}>
                <TableCell dir="ltr">{i.code}</TableCell>
                <TableCell>{i.title}</TableCell>
                <TableCell>{i.type || "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      i.result === "pass"
                        ? "default"
                        : i.result === "fail"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {i.result}
                  </Badge>
                </TableCell>
                <TableCell dir="ltr">{i.score ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600"
                    onClick={() => setDel(i.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ConfirmDialog
        open={!!del}
        title="حذف الفحص؟"
        pending={deleteIns.isPending}
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (del) deleteIns.mutate({ id: del });
          setDel(null);
        }}
      />
    </SectionShell>
  );
}
