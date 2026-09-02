import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Package,
  Calendar,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  Edit,
  Lock,
  Unlock,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

const formatNum = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n * 100) / 100);

const statusLabels: Record<string, string> = {
  active: "نشط",
  fulfilled: "مُنفذ",
  released: "مُحرر",
  expired: "منتهي",
};

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  fulfilled: "bg-green-100 text-green-700",
  released: "bg-gray-100 text-gray-700",
  expired: "bg-red-100 text-red-700",
};

const sourceLabels: Record<string, string> = {
  sales_order: "طلب مبيعات",
  purchase_order: "طلب مشتريات",
  production_order: "أمر إنتاج",
  transfer_order: "أمر تحويل",
  manual: "يدوي",
};

interface WarehouseItem {
  id: number;
  code: string;
  name: string;
  location: string | null;
  isActive: boolean;
}

interface ProductItem {
  id: number;
  code: string;
  name: string;
  type: "goods" | "service";
}

interface CustomerItem {
  id: number;
  code: string;
  name: string;
}

interface ReservationItem {
  id: number;
  productId: number;
  warehouseId: number | null;
  batchId: number | null;
  quantity: number;
  status: string;
  source: string;
  sourceId: number | null;
  sourceType: string | null;
  customerId: number | null;
  expiresAt: Date | null;
  notes: string | null;
  createdAt: Date;
  productCode: string;
  productName: string;
  warehouseCode: string | null;
  warehouseName: string | null;
  batchNumber: string | null;
}

export function StockReservationsPanel() {
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 500 });
  const { data: customersData } = trpc.customers.list.useQuery({ limit: 500 });

  const products = productsData?.items ?? [];
  const customers = customersData?.items ?? [];

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null
  );
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create reservation dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    productId: "",
    warehouseId: "",
    batchId: "",
    quantity: 1,
    source: "manual",
    sourceId: "",
    sourceType: "",
    customerId: "",
    expiresAt: "",
    notes: "",
  });

  const {
    data: reservations,
    isLoading,
    refetch,
  } = trpc.products.reservationList.useQuery(
    {
      warehouseId: selectedWarehouseId || undefined,
      productId: selectedProductId || undefined,
      status: selectedStatus || undefined,
    },
    { enabled: !!selectedWarehouseId }
  );

  const createReservation = trpc.products.reservationCreate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحجز بنجاح");
      setShowCreateDialog(false);
      setReservationForm({
        productId: "",
        warehouseId: "",
        batchId: "",
        quantity: 1,
        source: "manual",
        sourceId: "",
        sourceType: "",
        customerId: "",
        expiresAt: "",
        notes: "",
      });
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الإنشاء"),
  });

  const releaseReservation = trpc.products.reservationRelease.useMutation({
    onSuccess: () => {
      toast.success("تم تحرير الحجز");
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || "فشل التحرير"),
  });

  const fulfillReservation = trpc.products.reservationFulfill.useMutation({
    onSuccess: () => {
      toast.success("تم تنفيذ الحجز");
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || "فشل التنفيذ"),
  });

  const totalReservations = useMemo(
    () => reservations?.length || 0,
    [reservations]
  );
  const activeCount = useMemo(
    () => reservations?.filter(r => r.status === "active").length || 0,
    [reservations]
  );
  const totalQty = useMemo(
    () => reservations?.reduce((s, r) => s + (r.quantity || 0), 0) || 0,
    [reservations]
  );
  const fulfilledCount = useMemo(
    () => reservations?.filter(r => r.status === "fulfilled").length || 0,
    [reservations]
  );

  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    let result = reservations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        r =>
          r.productCode?.toLowerCase().includes(q) ||
          r.productName?.toLowerCase().includes(q) ||
          r.batchNumber?.toLowerCase().includes(q) ||
          String(r.sourceId || "").includes(q)
      );
    }
    return result;
  }, [reservations, searchQuery]);

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !reservationForm.productId ||
      !reservationForm.warehouseId ||
      !reservationForm.quantity
    ) {
      toast.error("املأ الحقول المطلوبة");
      return;
    }
    createReservation.mutate({
      productId: Number(reservationForm.productId),
      warehouseId: Number(reservationForm.warehouseId) || undefined,
      batchId: reservationForm.batchId
        ? Number(reservationForm.batchId)
        : undefined,
      quantity: Number(reservationForm.quantity),
      source: reservationForm.source as any,
      sourceId: reservationForm.sourceId
        ? Number(reservationForm.sourceId)
        : undefined,
      sourceType: reservationForm.sourceType || undefined,
      customerId: reservationForm.customerId
        ? Number(reservationForm.customerId)
        : undefined,
      expiresAt: reservationForm.expiresAt || undefined,
      notes: reservationForm.notes || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">حجوزات المخزون</h2>
          <p className="text-xs text-gray-500">
            إدارة الحجوزات والتخصيصات لأوامر المبيعات والإنتاج
          </p>
        </div>
        <Button
          size="sm"
          className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-8"
          onClick={() => setShowCreateDialog(true)}
          disabled={!selectedWarehouseId}
        >
          <Plus className="w-3 h-3 ml-1" /> حجز جديد
        </Button>
      </div>

      {!selectedWarehouseId ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-8 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>اختر مخزناً لعرض حجوزاته</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="border-0 shadow-sm bg-white p-3">
              <p className="text-[10px] text-gray-500">إجمالي الحجوزات</p>
              <p className="font-bold text-lg text-ink">
                {totalReservations}
              </p>
            </Card>
            <Card className="border-0 shadow-sm bg-white p-3">
              <p className="text-[10px] text-gray-500">نشطة</p>
              <p className="font-bold text-lg text-blue-600">{activeCount}</p>
            </Card>
            <Card className="border-0 shadow-sm bg-white p-3">
              <p className="text-[10px] text-gray-500">إجمالي الكمية</p>
              <p className="font-bold text-lg text-ink">
                {formatNum(totalQty)}
              </p>
            </Card>
            <Card className="border-0 shadow-sm bg-white p-3">
              <p className="text-[10px] text-gray-500">منفذة</p>
              <p className="font-bold text-lg text-green-600">
                {fulfilledCount}
              </p>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={selectedProductId?.toString() || ""}
                onValueChange={v => setSelectedProductId(v ? Number(v) : null)}
              >
                <SelectTrigger className="h-9 text-xs w-[180px]">
                  <SelectValue placeholder="الصنف" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedStatus}
                onValueChange={v => setSelectedStatus(v)}
              >
                <SelectTrigger className="h-9 text-xs w-[140px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="fulfilled">منفذ</SelectItem>
                  <SelectItem value="released">محرر</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ابحث بالمنتج، رقم المصدر، أو الدفعة..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 text-xs pr-10"
              />
            </div>
          </div>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3 overflow-x-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-10 bg-gray-100 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50 text-[10px]">
                      <th className="text-right p-2">المصدر</th>
                      <th className="text-right p-2">رقم المصدر</th>
                      <th className="text-right p-2">الصنف</th>
                      <th className="text-right p-2">الدفعة</th>
                      <th className="text-center p-2">الكمية</th>
                      <th className="text-center p-2">الحالة</th>
                      <th className="text-center p-2">العميل</th>
                      <th className="text-center p-2">تاريخ الانتهاء</th>
                      <th className="text-left p-2">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map(res => {
                      const isExpired =
                        res.expiresAt && new Date(res.expiresAt) < new Date();
                      const isActive = res.status === "active";
                      return (
                        <tr
                          key={res.id}
                          className={`border-b hover:bg-gray-50 ${isExpired && isActive ? "bg-red-50" : ""}`}
                        >
                          <td className="p-2">
                            <Badge variant="outline" className="text-[9px]">
                              {sourceLabels[res.source] || res.source}
                            </Badge>
                          </td>
                          <td className="p-2 font-mono text-[10px]">
                            {res.sourceId || "-"}
                          </td>
                          <td className="p-2">
                            <div className="font-medium text-[11px]">
                              {res.productName}
                            </div>
                            <div className="text-[9px] text-gray-400">
                              {res.productCode}
                            </div>
                          </td>
                          <td className="p-2 text-[10px]">
                            {res.batchNumber || "-"}
                          </td>
                          <td className="p-2 text-center font-mono">
                            {formatNum(res.quantity || 0)}
                          </td>
                          <td className="p-2 text-center">
                            <Badge
                              className={
                                statusColors[res.status] ||
                                "bg-gray-100 text-gray-700"
                              }
                              variant="outline"
                            >
                              {statusLabels[res.status] || res.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-center text-[10px]">
                            {res.customerId ? `عميل #${res.customerId}` : "-"}
                          </td>
                          <td className="p-2 text-center text-[10px]">
                            {res.expiresAt ? (
                              <span
                                className={
                                  isExpired
                                    ? "text-red-600 font-bold"
                                    : "text-gray-600"
                                }
                              >
                                {new Date(res.expiresAt).toLocaleDateString(
                                  "ar-EG"
                                )}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-2 text-left flex items-center gap-1">
                            {isActive && (
                              <>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6 text-[10px] text-green-600 hover:bg-green-50"
                                  onClick={() =>
                                    fulfillReservation.mutate({ id: res.id })
                                  }
                                  disabled={fulfillReservation.isPending}
                                  title="تنفيذ الحجز"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6 text-[10px] text-amber-600 hover:bg-amber-50"
                                  onClick={() =>
                                    releaseReservation.mutate({
                                      id: res.id,
                                      reason: "تحرير يدوي",
                                    })
                                  }
                                  disabled={releaseReservation.isPending}
                                  title="تحرير الحجز"
                                >
                                  <Unlock className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredReservations.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="text-center text-gray-400 py-8"
                        >
                          لا توجد حجوزات
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Reservation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إنشاء حجز مخزون جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateReservation} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">الصنف *</Label>
                <Select
                  value={reservationForm.productId}
                  onValueChange={v =>
                    setReservationForm({ ...reservationForm, productId: v })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="اختر صنفاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter(p => p.type === "goods")
                      .map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.code} - {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">المخزن</Label>
                <Select
                  value={reservationForm.warehouseId}
                  onValueChange={v =>
                    setReservationForm({ ...reservationForm, warehouseId: v })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="اختر مخزناً (اختياري)" />
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
            </div>
            <div>
              <Label className="text-[11px]">مصدر الحجز *</Label>
              <Select
                value={reservationForm.source}
                onValueChange={v =>
                  setReservationForm({ ...reservationForm, source: v })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر المصدر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_order">طلب مبيعات</SelectItem>
                  <SelectItem value="purchase_order">طلب مشتريات</SelectItem>
                  <SelectItem value="production_order">أمر إنتاج</SelectItem>
                  <SelectItem value="transfer_order">أمر تحويل</SelectItem>
                  <SelectItem value="manual">يدوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">رقم المصدر</Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  value={reservationForm.sourceId}
                  onChange={e =>
                    setReservationForm({
                      ...reservationForm,
                      sourceId: e.target.value,
                    })
                  }
                  placeholder="اختياري"
                />
              </div>
              <div>
                <Label className="text-[11px]">الكمية *</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-9 text-xs"
                  value={reservationForm.quantity}
                  onChange={e =>
                    setReservationForm({
                      ...reservationForm,
                      quantity: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-[11px]">الدفعة</Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  value={reservationForm.batchId}
                  onChange={e =>
                    setReservationForm({
                      ...reservationForm,
                      batchId: e.target.value,
                    })
                  }
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">العميل</Label>
                <Select
                  value={reservationForm.customerId}
                  onValueChange={v =>
                    setReservationForm({ ...reservationForm, customerId: v })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="اختر عميلاً (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={reservationForm.expiresAt}
                  onChange={e =>
                    setReservationForm({
                      ...reservationForm,
                      expiresAt: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px]">ملاحظات</Label>
              <Input
                className="h-9 text-xs"
                value={reservationForm.notes}
                onChange={e =>
                  setReservationForm({
                    ...reservationForm,
                    notes: e.target.value,
                  })
                }
                placeholder="ملاحظات إضافية"
              />
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDialog(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep"
                disabled={createReservation.isPending}
              >
                {createReservation.isPending
                  ? "جاري الإنشاء..."
                  : "إنشاء الحجز"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
