import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomFields } from "@/components/CustomFields";
import { toast } from "sonner";
import { Boxes, Package, AlertTriangle, ArrowLeftRight, Warehouse as WhIcon, Ruler, BarChart3, Calculator, ClipboardCheck, Target, Archive, LineChart } from "lucide-react";
import { InventoryDashboard } from "@/pages/Inventory/Products/InventoryDashboard";

const formatNum = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n * 100) / 100) + " ر.ي";

function ProductSelect({
  value,
  onChange,
  placeholder = "ابحث عن صنف...",
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const { data } = trpc.products.list.useQuery(
    { search: search || undefined, limit: 30 },
    { staleTime: 10_000 }
  );
  const items = data?.items || [];
  const selected = items.find(p => p.id === value);
  return (
    <div className="space-y-1">
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-xs"
      />
      <select
        className="w-full h-9 rounded-lg border border-gray-300 px-2 text-xs bg-white"
        value={value ?? ""}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">{selected ? `${selected.code} - ${selected.name}` : "اختر صنفاً"}</option>
        {items.map(p => (
          <option key={p.id} value={p.id}>
            {p.code} - {p.name} ({p.currentStock})
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Inventory() {
  const summary = trpc.products.inventorySummary.useQuery();
  const valuation = trpc.products.valuation.useQuery();
  const lowStock = trpc.products.lowStock.useQuery();
  const warehouses = trpc.warehouses.list.useQuery();
  const accounts = trpc.accounting.getAccounts.useQuery();
  const utils = trpc.useUtils();

  const adjust = trpc.products.adjustStock.useMutation({
    onSuccess: () => utils.products.inventorySummary.invalidate(),
  });
  const setOpening = trpc.products.setOpeningStock.useMutation({
    onSuccess: () => utils.products.inventorySummary.invalidate(),
  });
  const transfer = trpc.products.transferStock.useMutation({
    onSuccess: () => utils.products.inventorySummary.invalidate(),
  });
  const createWh = trpc.warehouses.create.useMutation({
    onSuccess: () => utils.warehouses.list.invalidate(),
  });
  const removeWh = trpc.warehouses.remove.useMutation({
    onSuccess: () => utils.warehouses.list.invalidate(),
  });

  // ─── Reorder suggestions (Module C) ───
  const reorderSuggestions = trpc.erp.listReorderSuggestions.useQuery();
  const createRequisition = trpc.erp.createProcurement.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء طلب التوريد");
      utils.erp.listReorderSuggestions.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الإنشاء"),
  });
  const generateAuto = trpc.erp.generateProcurementsFromReorder.useMutation({
    onSuccess: (r: any) => {
      toast.success(`تم إنشاء ${r.created} طلب توريد تلقائياً`);
      utils.erp.listReorderSuggestions.invalidate();
      utils.erp.listProcurements.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر التوليد"),
  });

  // operations local state
  const [opProduct, setOpProduct] = useState<number | null>(null);
  const [opQty, setOpQty] = useState("1");
  const [opType, setOpType] = useState<"in" | "out" | "adjustment">("adjustment");
  const [opNotes, setOpNotes] = useState("");
  const [cardProduct, setCardProduct] = useState<number | null>(null);
  const stockCard = trpc.products.stockCard.useQuery(
    { productId: cardProduct! },
    { enabled: !!cardProduct }
  );

  // warehouses
  const [whCode, setWhCode] = useState("");
  const [whName, setWhName] = useState("");
  const [whLoc, setWhLoc] = useState("");

  // transfer
  const [trFrom, setTrFrom] = useState<number | null>(null);
  const [trTo, setTrTo] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f6f7f5] to-[#eef1ea] font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="bg-[#102a2b] text-white p-4 rounded-2xl shadow-md flex items-center gap-3">
          <Boxes className="w-7 h-7 text-[#b87945]" />
          <div>
            <h1 className="text-xl font-bold font-display">وحدة المخزون</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              بيانات أساسية، عمليات، تقارير تحليلية وتفصيلية، وتقييم المخزون
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-8 h-10 bg-white border">
            <TabsTrigger value="dashboard" className="text-[10px] flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> لوحة المعلومات
            </TabsTrigger>
            <TabsTrigger value="overview" className="text-[10px] flex items-center gap-1">
              <Boxes className="w-3 h-3" /> نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="operations" className="text-[10px] flex items-center gap-1">
              <Package className="w-3 h-3" /> العمليات
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-[10px] flex items-center gap-1">
              <LineChart className="w-3 h-3" /> التقارير
            </TabsTrigger>
            <TabsTrigger value="reorder" className="text-[10px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" /> إعادة الطلب
            </TabsTrigger>
            <TabsTrigger value="warehouses" className="text-[10px] flex items-center gap-1">
              <WhIcon className="w-3 h-3" /> المخازن
            </TabsTrigger>
            <TabsTrigger value="valuation" className="text-[10px] flex items-center gap-1">
              <Calculator className="w-3 h-3" /> التقييم
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-[10px] flex items-center gap-1">
              <Target className="w-3 h-3" /> تحليل متقدم
            </TabsTrigger>
          </TabsList>

          {/* ─── Dashboard ─── */}
          <TabsContent value="dashboard" className="space-y-3">
            <InventoryDashboard />
          </TabsContent>

          {/* ─── Overview ─── */}
          <TabsContent value="overview" className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Kpi label="الأصناف" value={summary.data?.totalProducts ?? 0} />
              <Kpi label="سلع" value={summary.data?.totalGoods ?? 0} />
              <Kpi label="خدمات" value={summary.data?.totalServices ?? 0} />
              <Kpi label="قيمة المخزون (تكلفة)" value={formatNum(summary.data?.totalStockValue ?? 0)} />
              <Kpi label="قيمة المخزون (بيع)" value={formatNum(summary.data?.totalRetailValue ?? 0)} />
              <Kpi label="أصناف منخفضة" value={summary.data?.lowStockCount ?? 0} danger={(summary.data?.lowStockCount ?? 0) > 0} />
            </div>
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">توزيع المخزون حسب التصنيف</CardTitle>
              </CardHeader>
              <CardContent className="p-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50 text-[10px]">
                      <th className="text-right p-1.5">التصنيف</th>
                      <th className="text-center p-1.5">الكمية</th>
                      <th className="text-left p-1.5">القيمة (تكلفة)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.data?.byCategory || []).map(c => (
                      <tr key={c.category} className="border-b">
                        <td className="p-1.5">{c.category}</td>
                        <td className="p-1.5 text-center font-mono">{formatNum(c.qty)}</td>
                        <td className="p-1.5 text-left font-mono text-[#b87945]">{formatNum(c.value)}</td>
                      </tr>
                    ))}
                    {(!summary.data?.byCategory || summary.data.byCategory.length === 0) && (
                      <tr><td colSpan={3} className="text-center text-gray-400 py-4">لا توجد أصناف</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Operations ─── */}
          <TabsContent value="operations" className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-bold text-[#102a2b]">تسوية / جرد / إدخال / إخراج</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <Label className="text-[11px]">الصنف</Label>
                    <ProductSelect value={opProduct} onChange={setOpProduct} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">العملية</Label>
                      <select
                        className="w-full h-9 rounded-lg border border-gray-300 px-2 text-xs bg-white"
                        value={opType}
                        onChange={e => setOpType(e.target.value as any)}
                      >
                        <option value="adjustment">تسوية إلى رصيد</option>
                        <option value="in">إدخال (زيادة)</option>
                        <option value="out">إخراج (نقص)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px]">الكمية</Label>
                      <Input className="h-9 text-xs" value={opQty} onChange={e => setOpQty(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px]">ملاحظات</Label>
                    <Input className="h-9 text-xs" value={opNotes} onChange={e => setOpNotes(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-[#102a2b] hover:bg-[#0c2021] text-xs"
                      disabled={!opProduct || adjust.isPending || setOpening.isPending}
                      onClick={() => {
                        if (!opProduct) return;
                        const q = parseInt(opQty) || 0;
                        if (opType === "adjustment")
                          setOpening.mutate({ productId: opProduct, quantity: q, notes: opNotes });
                        else
                          adjust.mutate({ productId: opProduct, quantity: q, type: opType, notes: opNotes });
                        setOpNotes("");
                      }}
                    >
                      تأكيد العملية
                    </Button>
                  </div>
                  {opProduct != null && (
                    <CustomFields entityType="product" entityId={opProduct} />
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4" /> تحويل بين المخازن
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <Label className="text-[11px]">الصنف</Label>
                    <ProductSelect value={opProduct} onChange={setOpProduct} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">من مخزن</Label>
                      <WhSelect value={trFrom} onChange={setTrFrom} warehouses={warehouses.data || []} />
                    </div>
                    <div>
                      <Label className="text-[11px]">إلى مخزن</Label>
                      <WhSelect value={trTo} onChange={setTrTo} warehouses={warehouses.data || []} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px]">الكمية</Label>
                    <Input className="h-9 text-xs" value={opQty} onChange={e => setOpQty(e.target.value)} />
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold text-xs"
                    disabled={!opProduct || !trFrom || !trTo || transfer.isPending}
                    onClick={() =>
                      transfer.mutate({
                        productId: opProduct!,
                        fromWarehouseId: trFrom!,
                        toWarehouseId: trTo!,
                        quantity: parseInt(opQty) || 0,
                      })
                    }
                  >
                    تنفيذ التحويل
                  </Button>
                </CardContent>
              </Card>
            </div>

            <ProductUnitsPanel productId={opProduct} />
          </TabsContent>

          {/* ─── Reports ─── */}
          <TabsContent value="reports" className="space-y-3">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">تقييم المخزون (تكلفة وبيع)</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50 text-[10px]">
                        <th className="text-right p-1.5">الكود</th>
                        <th className="text-right p-1.5">الصنف</th>
                        <th className="text-center p-1.5">النوع</th>
                        <th className="text-center p-1.5">الرصيد</th>
                        <th className="text-left p-1.5">تكلفة</th>
                        <th className="text-left p-1.5">قيمة التكلفة</th>
                        <th className="text-left p-1.5">قيمة البيع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(valuation.data?.items || []).map(i => (
                        <tr key={i.id} className="border-b">
                          <td className="p-1.5 font-mono text-[10px]">{i.code}</td>
                          <td className="p-1.5">{i.name}</td>
                          <td className="p-1.5 text-center">
                            <Badge className={i.type === "goods" ? "bg-blue-100 text-blue-700 text-[9px]" : "bg-purple-100 text-purple-700 text-[9px]"}>
                              {i.type === "goods" ? "سلعة" : "خدمة"}
                            </Badge>
                          </td>
                          <td className="p-1.5 text-center font-mono">{i.qty}</td>
                          <td className="p-1.5 text-left font-mono">{formatNum(i.cost)}</td>
                          <td className="p-1.5 text-left font-mono text-[#b87945]">{formatNum(i.stockValue)}</td>
                          <td className="p-1.5 text-left font-mono">{formatNum(i.retailValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-gray-50">
                        <td colSpan={5} className="p-1.5 text-left">الإجماليات</td>
                        <td className="p-1.5 text-left font-mono text-[#b87945]">{formatNum(valuation.data?.totalValue || 0)}</td>
                        <td className="p-1.5 text-left font-mono">{formatNum(valuation.data?.totalRetail || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> تنبيهات نقص المخزون
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {(lowStock.data || []).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">لا توجد أصناف منخفضة</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(lowStock.data || []).map(p => (
                      <Badge key={p.id} className="bg-amber-100 text-amber-800 text-[10px]">
                        {p.name} ({p.currentStock}/{p.minStock})
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">كرت الصنف (حركة وتعاقب الأرصدة)</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 overflow-x-auto">
                <ProductSelect value={cardProduct} onChange={setCardProduct} placeholder="اختر صنفاً لعرض كرته" />
                {stockCard.data && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50 text-[10px]">
                        <th className="text-right p-1.5">التاريخ</th>
                        <th className="text-center p-1.5">النوع</th>
                        <th className="text-center p-1.5">الكمية</th>
                        <th className="text-left p-1.5">الرصيد بعدها</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockCard.data.movements.map((m, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-1.5 text-[10px]">{new Date(m.createdAt).toLocaleString("en-GB")}</td>
                          <td className="p-1.5 text-center">
                            <Badge className="bg-gray-100 text-gray-700 text-[9px]">{m.type}</Badge>
                          </td>
                          <td className="p-1.5 text-center font-mono">{m.quantity}</td>
                          <td className="p-1.5 text-left font-mono text-[#b87945]">{m.balanceAfter}</td>
                        </tr>
                      ))}
                      {stockCard.data.movements.length === 0 && (
                        <tr><td colSpan={4} className="text-center text-gray-400 py-4">لا حركات</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Warehouses ─── */}
          <TabsContent value="warehouses" className="space-y-3">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-1.5">
                  <WhIcon className="w-4 h-4" /> المخازن
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input className="h-9 text-xs" placeholder="الكود" value={whCode} onChange={e => setWhCode(e.target.value)} />
                  <Input className="h-9 text-xs" placeholder="الاسم" value={whName} onChange={e => setWhName(e.target.value)} />
                  <Input className="h-9 text-xs" placeholder="الموقع" value={whLoc} onChange={e => setWhLoc(e.target.value)} />
                  <Button
                    size="sm"
                    className="bg-[#102a2b] hover:bg-[#0c2021] text-xs"
                    disabled={!whCode || !whName || createWh.isPending}
                    onClick={() => { createWh.mutate({ code: whCode, name: whName, location: whLoc }); setWhCode(""); setWhName(""); setWhLoc(""); }}
                  >
                    إضافة مخزن
                  </Button>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50 text-[10px]">
                      <th className="text-right p-1.5">الكود</th>
                      <th className="text-right p-1.5">الاسم</th>
                      <th className="text-right p-1.5">الموقع</th>
                      <th className="text-left p-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(warehouses.data || []).map(w => (
                      <tr key={w.id} className="border-b">
                        <td className="p-1.5 font-mono text-[10px]">{w.code}</td>
                        <td className="p-1.5">{w.name}</td>
                        <td className="p-1.5">{w.location || "-"}</td>
                        <td className="p-1.5 text-left">
                          <Button size="sm" variant="ghost" className="text-rose-600 text-[10px] h-7" onClick={() => removeWh.mutate({ id: w.id })}>
                            حذف
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Reorder Suggestions (Module C) ─── */}
          <TabsContent value="reorder" className="space-y-3">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> اقتراحات إعادة الطلب
                  </CardTitle>
                  <Button
                    size="sm"
                    className="bg-[#102a2b] hover:bg-[#0c2021] text-[10px] h-7 text-white"
                    disabled={generateAuto.isPending || (reorderSuggestions.data ?? []).length === 0}
                    onClick={() => generateAuto.mutate()}
                  >
                    إنشاء طلبات توريد تلقائياً
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {(reorderSuggestions.data ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    لا توجد أصناف تحتاج إعادة طلب (لم يتم تحديد نقطة إعادة طلب)
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(reorderSuggestions.data ?? []).map((s: any) => (
                      <div
                        key={s.product.id}
                        className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200"
                      >
                        <div>
                          <p className="font-bold text-xs text-[#102a2b]">{s.product.name}</p>
                          <p className="text-[10px] text-gray-500">
                            الرصيد: {s.currentStock} • نقطة الطلب: {s.reorderPoint} • المقترح: {s.suggestedQty}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-[10px] h-7"
                          disabled={createRequisition.isPending}
                          onClick={() =>
                            createRequisition.mutate({
                              itemName: s.product.name,
                              quantity: String(s.suggestedQty),
                              estimatedCost: String(
                                Number(s.product.purchasePrice || 0) * s.suggestedQty
                              ),
                            })
                          }
                        >
                          إنشاء طلب توريد
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Valuation (FIFO/LIFO/WAVG) ─── */}
          <TabsContent value="valuation" className="space-y-3">
            <div className="p-3">
              <p className="text-xs text-gray-500 mb-3">استخدم لوحة المعلومات (Dashboard) للحصول على تجربة تقييم شاملة مع FIFO/LIFO/المتوسط المرجح</p>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#102a2b] hover:bg-[#0c2021] text-xs"
                onClick={() => { /* Tab switch handled by defaultValue */ }}
              >
                الانتقال للوحة المعلومات
              </Button>
            </div>
          </TabsContent>

          {/* ─── Advanced Analytics ─── */}
          <TabsContent value="advanced" className="space-y-3">
            <div className="p-3">
              <p className="text-xs text-gray-500 mb-3">استخدم لوحة المعلومات (Dashboard) للوصول لتقارير التقادم، الدوران، تحليل ABC، والمخزون الميت</p>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#102a2b] hover:bg-[#0c2021] text-xs"
              >
                الانتقال للوحة المعلومات
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function ProductUnitsPanel({ productId }: { productId: number | null }) {
  const [openU, setOpenU] = useState(false);
  const [puUnit, setPuUnit] = useState<number | null>(null);
  const [puFactor, setPuFactor] = useState("1");
  const [puBase, setPuBase] = useState(false);
  const [puBarcode, setPuBarcode] = useState("");
  const utils = trpc.useUtils();
  const { data: units } = trpc.modules.masterData.listUnits.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: pus, isPending: pusPending } = trpc.modules.productUnits.list.useQuery(
    { productId: productId! },
    { enabled: !!productId }
  );
  const addPU = trpc.modules.productUnits.add.useMutation({
    onSuccess: () => utils.modules.productUnits.list.invalidate(),
  });
  const delPU = trpc.modules.productUnits.remove.useMutation({
    onSuccess: () => utils.modules.productUnits.list.invalidate(),
  });

  if (productId == null) return null;
  const unitName = (id: number) =>
    (units ?? []).find((u: any) => u.id === id)?.name || `#${id}`;

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="p-3">
        <button
          className="flex w-full items-center justify-between text-sm font-bold text-[#102a2b]"
          onClick={() => setOpenU((o) => !o)}
        >
          <span className="flex items-center gap-1.5">
            <Ruler className="w-4 h-4" /> وحدات القياس
          </span>
          <span className="text-[10px] text-[#b87945]">{openU ? "إخفاء" : "عرض"}</span>
        </button>
      </CardHeader>
      {openU && (
        <CardContent className="p-3 space-y-2">
          {pusPending ? (
            <p className="text-[11px] text-muted-foreground">جاري التحميل...</p>
          ) : (
            <div className="space-y-1">
              {(pus ?? []).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2"
                >
                  <div className="text-[11px]">
                    <span className="font-bold">{unitName(p.unitId)}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      × {p.conversionFactor}
                    </span>
                    {p.isBase && (
                      <span className="mr-1 rounded bg-[#102a2b]/10 px-1 text-[9px] text-[#102a2b]">
                        أساسية
                      </span>
                    )}
                    {p.barcode && (
                      <span className="mr-1 text-[9px] text-muted-foreground">
                        {p.barcode}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] text-rose-600"
                    onClick={() => delPU.mutate({ id: p.id })}
                  >
                    حذف
                  </Button>
                </div>
              ))}
              {(pus ?? []).length === 0 && (
                <p className="text-[11px] text-muted-foreground">لا وحدات مضافة</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <select
              className="h-9 rounded-lg border border-gray-300 px-2 text-xs bg-white col-span-2 md:col-span-1"
              value={puUnit ?? ""}
              onChange={(e) => setPuUnit(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">اختر وحدة</option>
              {(units ?? []).map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Input
              className="h-9 text-xs"
              placeholder="معامل التحويل"
              value={puFactor}
              onChange={(e) => setPuFactor(e.target.value)}
            />
            <Input
              className="h-9 text-xs"
              placeholder="باركود (اختياري)"
              value={puBarcode}
              onChange={(e) => setPuBarcode(e.target.value)}
            />
            <label className="flex items-center gap-1 text-[11px]">
              <input
                type="checkbox"
                checked={puBase}
                onChange={(e) => setPuBase(e.target.checked)}
              />
              أساسية
            </label>
          </div>
          <Button
            size="sm"
            className="bg-[#102a2b] hover:bg-[#0c2021] text-xs"
            disabled={!puUnit || addPU.isPending}
            onClick={() => {
              if (!puUnit) return;
              addPU.mutate({
                productId: productId!,
                unitId: puUnit,
                conversionFactor: puFactor || "1",
                isBase: puBase,
              });
              setPuUnit(null);
              setPuFactor("1");
              setPuBase(false);
              setPuBarcode("");
            }}
          >
            إضافة وحدة
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function Kpi({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <Card className="border-0 shadow-sm bg-white p-3">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`font-bold text-lg ${danger ? "text-rose-500" : "text-[#102a2b]"}`}>{value}</p>
    </Card>
  );
}

function WhSelect({
  value,
  onChange,
  warehouses,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  warehouses: { id: number; code: string; name: string }[];
}) {
  return (
    <select
      className="w-full h-9 rounded-lg border border-gray-300 px-2 text-xs bg-white"
      value={value ?? ""}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">اختر مخزناً</option>
      {warehouses.map(w => (
        <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
      ))}
    </select>
  );
}