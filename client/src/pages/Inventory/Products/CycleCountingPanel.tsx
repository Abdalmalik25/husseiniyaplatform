import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Package, Calendar, AlertTriangle, Plus, Search, Filter, ClipboardCheck, Play, CheckCircle, Eye, Edit, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const formatNum = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n * 100) / 100);

const statusLabels: Record<string, string> = {
  planned: "مخطط",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  approved: "معتمد",
};

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  approved: "bg-purple-100 text-purple-700",
};

const lineStatusLabels: Record<string, string> = {
  pending: "في الانتظار",
  ok: "مطابق",
  variance: "انحراف",
};

const lineStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  ok: "bg-green-100 text-green-700",
  variance: "bg-red-100 text-red-700",
};

interface WarehouseItem {
  id: number;
  code: string;
  name: string;
  location: string | null;
  isActive: boolean;
}

interface EmployeeItem {
  id: number;
  fullName: string;
}

interface CycleCountItem {
  id: number;
  countNumber: string;
  warehouseId: number;
  status: string;
  plannedDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  assignedToId: number | null;
  varianceThreshold: string;
  warehouseName: string | null;
  notes: string | null;
}

export function CycleCountingPanel() {
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const employees: { id: number; fullName: string }[] = [];

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create cycle count dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    warehouseId: "",
    plannedDate: new Date().toISOString().slice(0, 10),
    assignedToId: "",
    varianceThreshold: "5",
    notes: "",
  });

  // Count dialog state
  const [countDialog, setCountDialog] = useState<{
    open: boolean;
    cycleCountId: number;
    line: any;
  }>({ open: false, cycleCountId: 0, line: null });

  const { data: cycleCounts, isLoading: loadingCounts, refetch: refetchCounts } = trpc.products.cycleCountList.useQuery(
    { status: selectedStatus || undefined },
    { staleTime: 30_000 }
  );

  const createCycleCount = trpc.products.cycleCountCreate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الجرد بنجاح");
      setShowCreateDialog(false);
      setCreateForm({
        warehouseId: "",
        plannedDate: new Date().toISOString().slice(0, 10),
        assignedToId: "",
        varianceThreshold: "5",
        notes: "",
      });
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الإنشاء"),
  });

  const startCycleCount = trpc.products.cycleCountStart.useMutation({
    onSuccess: () => {
      toast.success("تم بدء الجرد");
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل البدء"),
  });

  const recordCount = trpc.products.cycleCountRecord.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الجرد");
      setCountDialog({ open: false, cycleCountId: 0, line: null });
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل التسجيل"),
  });

  const completeCycleCount = trpc.products.cycleCountComplete.useMutation({
    onSuccess: () => {
      toast.success("تم إكمال الجرد");
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الإكمال"),
  });

  const approveCycleCount = trpc.products.cycleCountApprove.useMutation({
    onSuccess: (r: any) => {
      toast.success(r.success ? "تم اعتماد الجرد" : "فشل الاعتماد");
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الاعتماد"),
  });

  const totalCounts = useMemo(() => cycleCounts?.length || 0, [cycleCounts]);
  const plannedCount = useMemo(() => cycleCounts?.filter(c => c.status === "planned").length || 0, [cycleCounts]);
  const inProgressCount = useMemo(() => cycleCounts?.filter(c => c.status === "in_progress").length || 0, [cycleCounts]);
  const completedCount = useMemo(() => cycleCounts?.filter(c => c.status === "completed").length || 0, [cycleCounts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#102a2b]">الجرد الدوري</h2>
          <p className="text-xs text-gray-500">إدارة عمليات الجرد الدوري والمفاجئ للمخازن</p>
        </div>
        <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-8" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-3 h-3 ml-1" /> جرد جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border-0 shadow-sm bg-white p-3">
          <p className="text-[10px] text-gray-500">إجمالي الجرد</p>
          <p className="font-bold text-lg text-[#102a2b]">{totalCounts}</p>
        </Card>
        <Card className="border-0 shadow-sm bg-white p-3">
          <p className="text-[10px] text-gray-500">مخطط</p>
          <p className="font-bold text-lg text-blue-600">{plannedCount}</p>
        </Card>
        <Card className="border-0 shadow-sm bg-white p-3">
          <p className="text-[10px] text-gray-500">قيد التنفيذ</p>
          <p className="font-bold text-lg text-amber-600">{inProgressCount}</p>
        </Card>
        <Card className="border-0 shadow-sm bg-white p-3">
          <p className="text-[10px] text-gray-500">مكتمل/معتمد</p>
          <p className="font-bold text-lg text-green-600">{completedCount}</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Select value={selectedStatus} onValueChange={v => setSelectedStatus(v)}>
            <SelectTrigger className="h-9 text-xs w-[160px]">
              <SelectValue placeholder="فلترة بالحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              <SelectItem value="planned">مخطط</SelectItem>
              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="ابحث برقم الجرد، المخزن، أو الملاحظات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 text-xs pr-10"
          />
        </div>
      </div>

      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-3 overflow-x-auto">
          {loadingCounts ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50 text-[10px]">
                  <th className="text-right p-2">رقم الجرد</th>
                  <th className="text-right p-2">المخزن</th>
                  <th className="text-center p-2">الحالة</th>
                  <th className="text-center p-2">التاريخ المخطط</th>
                  <th className="text-center p-2">تاريخ البدء</th>
                  <th className="text-center p-2">تاريخ الإكمال</th>
                  <th className="text-center p-2">المسؤول</th>
                  <th className="text-center p-2">حد الانحراف %</th>
                  <th className="text-left p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {cycleCounts
                  ?.filter(cc =>
                    cc.countNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    cc.warehouseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (cc as any).notes?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(cc => (
                    <tr key={cc.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono text-[10px] font-bold">{cc.countNumber}</td>
                      <td className="p-2">{cc.warehouseName}</td>
                      <td className="p-2 text-center">
                        <Badge className={statusColors[cc.status] || "bg-gray-100 text-gray-700"} variant="outline">
                          {statusLabels[cc.status] || cc.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-center text-[10px]">{cc.plannedDate ? format(new Date(cc.plannedDate), "yyyy/MM/dd") : "-"}</td>
                      <td className="p-2 text-center text-[10px]">{cc.startedAt ? format(new Date(cc.startedAt), "yyyy/MM/dd HH:mm") : "-"}</td>
                      <td className="p-2 text-center text-[10px]">{cc.completedAt ? format(new Date(cc.completedAt), "yyyy/MM/dd HH:mm") : "-"}</td>
                      <td className="p-2 text-center text-[10px]">{cc.assignedToId ? `موظف #${cc.assignedToId}` : "-"}</td>
                      <td className="p-2 text-center font-mono">{cc.varianceThreshold}%</td>
                      <td className="p-2 text-left flex items-center gap-1">
                        {cc.status === "planned" && (
                          <Button size="icon" variant="outline" className="h-6 w-6 text-[10px] text-green-600 hover:bg-green-50" onClick={() => startCycleCount.mutate({ id: cc.id })} disabled={startCycleCount.isPending} title="بدء الجرد">
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                        {cc.status === "in_progress" && (
                          <Button size="icon" variant="outline" className="h-6 w-6 text-[10px] text-blue-600 hover:bg-blue-50" onClick={() => setCountDialog({ open: true, cycleCountId: cc.id, line: null })} title="تسجيل الجرد">
                            <ClipboardCheck className="w-3 h-3" />
                          </Button>
                        )}
                        {cc.status === "completed" && (
                          <Button size="icon" variant="outline" className="h-6 w-6 text-[10px] text-purple-600 hover:bg-purple-50" onClick={() => approveCycleCount.mutate({ id: cc.id, applyAdjustments: true })} disabled={approveCycleCount.isPending} title="اعتماد وتطبيق التسويات">
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-[10px] text-gray-600" title="عرض التفاصيل">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                {(!cycleCounts || cycleCounts.length === 0) && (
                  <tr><td colSpan={9} className="text-center text-gray-400 py-8">لا توجد عمليات جرد</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create Cycle Count Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء جرد دوري جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createCycleCount.mutate({ warehouseId: Number(createForm.warehouseId), plannedDate: createForm.plannedDate, assignedToId: createForm.assignedToId ? Number(createForm.assignedToId) : undefined, varianceThreshold: createForm.varianceThreshold, notes: createForm.notes }); }} className="space-y-3">
            <div>
              <Label className="text-[11px]">المخزن *</Label>
              <Select value={createForm.warehouseId} onValueChange={v => setCreateForm({...createForm, warehouseId: v})}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر مخزناً" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map(w => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      {w.code} - {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">التاريخ المخطط *</Label>
              <Input type="date" className="h-9 text-xs" value={createForm.plannedDate} onChange={e => setCreateForm({...createForm, plannedDate: e.target.value})} />
            </div>
            <div>
              <Label className="text-[11px]">المسؤول</Label>
              <Select value={createForm.assignedToId} onValueChange={v => setCreateForm({...createForm, assignedToId: v})}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر موظفاً (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">حد الانحراف %</Label>
              <Input type="number" step="0.1" min="0" max="100" className="h-9 text-xs" value={createForm.varianceThreshold} onChange={e => setCreateForm({...createForm, varianceThreshold: e.target.value})} />
            </div>
            <div>
              <Label className="text-[11px]">ملاحظات</Label>
              <Input className="h-9 text-xs" value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})} placeholder="ملاحظات إضافية" />
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
              <Button type="submit" size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b]" disabled={createCycleCount.isPending}>
                {createCycleCount.isPending ? "جاري الإنشاء..." : "إنشاء الجرد"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Count Dialog - would need to fetch lines for the selected cycle count */}
      {countDialog.open && (
        <Dialog open={countDialog.open} onOpenChange={v => setCountDialog({...countDialog, open: v})}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>تسجيل نتائج الجرد</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
              <p className="text-xs text-gray-500">هذه شاشة مبسطة - في التطبيق الكامل ستظهر بنود الجرد المحددة لهذا الجرد</p>
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-[11px]">الكمية المُجرّدة</Label>
                <Input type="number" min="0" step="1" className="h-9 text-xs mt-1" placeholder="أدخل الكمية المُجرّدة" />
                <Label className="text-[11px] mt-2">ملاحظات</Label>
                <Input className="h-9 text-xs mt-1" placeholder="ملاحظات عن الفرق إن وجد" />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCountDialog({...countDialog, open: false})}>إلغاء</Button>
              <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b]" disabled={recordCount.isPending} onClick={() => recordCount.mutate({ cycleCountId: countDialog.cycleCountId, productId: 0, warehouseId: 0, countedQty: 0 })}>
                {recordCount.isPending ? "جاري الحفظ..." : "حفظ التسجيل"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}