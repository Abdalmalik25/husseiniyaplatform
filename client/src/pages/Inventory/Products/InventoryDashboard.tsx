import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
  Archive,
  AlertTriangle,
  Clock,
  Warehouse as WhIcon,
  Calculator,
  RefreshCw,
  Download,
  Home,
  LineChart,
  PieChart,
  Activity,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";
import { WarehouseStockPanel } from "./WarehouseStockPanel";
import { BatchTrackingPanel } from "./BatchTrackingPanel";
import { StockReservationsPanel } from "./StockReservationsPanel";
import { CycleCountingPanel } from "./CycleCountingPanel";
import { InventoryValuationPanel } from "./InventoryValuationPanel";
import { AdvancedInventoryReportsPanel } from "./AdvancedInventoryReportsPanel";

const formatNum = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const formatInt = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n));

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

interface InventoryMovementItem {
  id: number;
  productId: number;
  type: string;
  quantity: number;
  createdAt: Date;
}

interface SummaryByCategory {
  category: string;
  qty: number;
  value: number;
}

export function InventoryDashboard() {
  const summary = trpc.products.inventorySummary.useQuery();
  const valuation = trpc.products.valuation.useQuery();
  const lowStock = trpc.products.lowStock.useQuery();
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const { data: movements } = trpc.products.movements.useQuery(
    {},
    { staleTime: 60_000 }
  );
  const { data: productsData } = trpc.products.list.useQuery({ limit: 500 });
  const products = productsData?.items ?? [];

  // KPIs for dashboard
  const totalProducts = summary.data?.totalProducts ?? 0;
  const totalGoods = summary.data?.totalGoods ?? 0;
  const totalServices = summary.data?.totalServices ?? 0;
  const totalStockValue = summary.data?.totalStockValue ?? 0;
  const totalRetailValue = summary.data?.totalRetailValue ?? 0;
  const lowStockCount = summary.data?.lowStockCount ?? 0;

  // Movement stats
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const movementsThisMonth =
    movements?.filter(m => new Date(m.createdAt) >= thisMonth).length || 0;
  const movementsLastMonth =
    movements?.filter(
      m =>
        new Date(m.createdAt) >= lastMonth && new Date(m.createdAt) < thisMonth
    ).length || 0;
  const movementChange =
    movementsLastMonth > 0
      ? Number(
          (
            ((movementsThisMonth - movementsLastMonth) / movementsLastMonth) *
            100
          ).toFixed(1)
        )
      : 0;

  // Top moving products
  const productMovement = new Map<
    number,
    { in: number; out: number; transfers: number }
  >();
  movements?.forEach(m => {
    if (!productMovement.has(m.productId)) {
      productMovement.set(m.productId, { in: 0, out: 0, transfers: 0 });
    }
    const pm = productMovement.get(m.productId)!;
    if (m.type === "in") pm.in += m.quantity;
    else if (m.type === "out") pm.out += m.quantity;
    else pm.transfers += m.quantity;
  });

  const topMoving = Array.from(productMovement.entries())
    .map(([id, m]) => ({ id, ...m, total: m.in + m.out + m.transfers }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(m => {
      const p = products.find(p => p.id === m.id);
      return { ...m, name: p?.name || `منتج #${m.id}`, code: p?.code || "-" };
    });

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-[#f6f7f5] to-[#eef1ea] font-sans"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-[#102a2b] text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold font-display flex items-center gap-2">
              <Package className="w-7 h-7 text-[#b87945]" />
              لوحة معلومات المخزون - Business Intelligence
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              عرض موحد لمخازن متعددة، تقييم، جرد، حجوزات، وتقارير متقدمة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-gray-600 text-white hover:bg-gray-800"
            >
              <RefreshCw className="w-3 h-3 ml-1" /> تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-gray-600 text-white hover:bg-gray-800"
            >
              <Download className="w-3 h-3 ml-1" /> تصدير PDF
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            icon={<Package className="w-5 h-5" />}
            iconBg="bg-blue-100 text-blue-600"
            label="إجمالي الأصناف"
            value={formatInt(totalProducts)}
            subValue={`${totalGoods} سلع • ${totalServices} خدمات`}
            subColor="text-gray-500"
          />
          <KpiCard
            icon={<DollarSign className="w-5 h-5" />}
            iconBg="bg-[#b87945] text-white"
            label="قيمة المخزون (تكلفة)"
            value={`${formatNum(totalStockValue)} ر.ي`}
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            iconBg="bg-green-100 text-green-600"
            label="قيمة المخزون (بيع)"
            value={`${formatNum(totalRetailValue)} ر.ي`}
          />
          <KpiCard
            icon={<AlertTriangle className="w-5 h-5" />}
            iconBg={
              lowStockCount > 0
                ? "bg-red-100 text-red-600"
                : "bg-green-100 text-green-600"
            }
            label="أصناف منخفضة"
            value={formatInt(lowStockCount)}
            danger={lowStockCount > 0}
          />
          <KpiCard
            icon={<Activity className="w-5 h-5" />}
            iconBg="bg-purple-100 text-purple-600"
            label="الحركات هذا الشهر"
            value={formatInt(movementsThisMonth)}
            subValue={`${movementChange > 0 ? "+" : ""}${movementChange}% من الشهر الماضي`}
            subColor={movementChange >= 0 ? "text-green-600" : "text-red-600"}
          />
          <KpiCard
            icon={<WhIcon className="w-5 h-5" />}
            iconBg="bg-amber-100 text-amber-600"
            label="المخازن النشطة"
            value={formatInt(warehouses?.filter(w => w.isActive).length || 0)}
            subValue={`من ${warehouses?.length || 0} مخزن`}
            subColor="text-gray-500"
          />
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#b87945]" /> إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <QuickActionBtn
                icon={<WhIcon className="w-4 h-4" />}
                label="أرصدة المخازن"
                desc="عرض تفصيلي لكل مخزن"
              />
              <QuickActionBtn
                icon={<Calculator className="w-4 h-4" />}
                label="التقييم (FIFO/LIFO)"
                desc="طرق محاسبية متعددة"
              />
              <QuickActionBtn
                icon={<ClipboardCheck className="w-4 h-4" />}
                label="الجرد الدوري"
                desc="إدارة عمليات الجرد"
              />
              <QuickActionBtn
                icon={<Target className="w-4 h-4" />}
                label="تحليل ABC"
                desc="تصنيف الأصناف بالأهمية"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Moving Products */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> أكثر الأصناف
              حركة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50 text-[10px]">
                  <th className="text-right p-1.5">#</th>
                  <th className="text-right p-1.5">الكود</th>
                  <th className="text-right p-1.5">الصنف</th>
                  <th className="text-center p-1.5">دخول</th>
                  <th className="text-center p-1.5">خروج</th>
                  <th className="text-center p-1.5">تحويلات</th>
                  <th className="text-center p-1.5">إجمالي الحركة</th>
                </tr>
              </thead>
              <tbody>
                {topMoving.map((m, i) => (
                  <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="p-1.5 text-center text-[10px] text-gray-500">
                      {i + 1}
                    </td>
                    <td className="p-1.5 font-mono text-[10px]">{m.code}</td>
                    <td className="p-1.5">{m.name}</td>
                    <td className="p-1.5 text-center font-mono text-green-600">
                      {formatInt(m.in)}
                    </td>
                    <td className="p-1.5 text-center font-mono text-red-600">
                      {formatInt(m.out)}
                    </td>
                    <td className="p-1.5 text-center font-mono text-blue-600">
                      {formatInt(m.transfers)}
                    </td>
                    <td className="p-1.5 text-center font-bold text-[#102a2b]">
                      {formatInt(m.total)}
                    </td>
                  </tr>
                ))}
                {topMoving.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-8">
                      لا توجد حركات مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="p-3">
              <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#b87945]" /> توزيع القيمة حسب
                التصنيف
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px]">
                    <th className="text-right p-1.5">التصنيف</th>
                    <th className="text-center p-1.5">الكمية</th>
                    <th className="text-left p-1.5">القيمة (تكلفة)</th>
                    <th className="text-left p-1.5">النسبة %</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.data?.byCategory || []).map(c => (
                    <tr key={c.category} className="border-b">
                      <td className="p-1.5">{c.category}</td>
                      <td className="p-1.5 text-center font-mono">
                        {formatInt(c.qty)}
                      </td>
                      <td className="p-1.5 text-left font-mono text-[#b87945]">
                        {formatNum(c.value)} ر.ي
                      </td>
                      <td className="p-1.5 text-left font-bold">
                        {totalStockValue > 0
                          ? ((c.value / totalStockValue) * 100).toFixed(1)
                          : 0}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-50">
                    <td className="p-1.5 text-right">الإجمالي</td>
                    <td className="p-1.5 text-center font-mono">
                      {formatInt(
                        summary.data?.byCategory?.reduce(
                          (s, c) => s + c.qty,
                          0
                        ) || 0
                      )}
                    </td>
                    <td className="p-1.5 text-left font-mono text-[#b87945]">
                      {formatNum(totalStockValue)} ر.ي
                    </td>
                    <td className="p-1.5 text-left">100%</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="p-3">
              <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-2">
                <LineChart className="w-4 h-4 text-blue-600" /> حركة المخزون (30
                يوم)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="h-48 flex items-end justify-around gap-1">
                {Array.from({ length: 30 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (29 - i));
                  const dayMovements =
                    movements?.filter(
                      m =>
                        new Date(m.createdAt).toDateString() ===
                        date.toDateString()
                    ).length || 0;
                  const maxMovements = Math.max(
                    ...Array.from(
                      { length: 30 },
                      (_, j) =>
                        movements?.filter(
                          m =>
                            new Date(m.createdAt).toDateString() ===
                            new Date(
                              Date.now() - (29 - j) * 86400000
                            ).toDateString()
                        ).length || 0
                    ),
                    1
                  );
                  const height = Math.max(
                    (dayMovements / maxMovements) * 100,
                    4
                  );
                  return (
                    <div key={i} className="flex flex-col items-center w-full">
                      <div
                        className="bg-[#b87945] rounded-t transition-all hover:bg-[#a06838]"
                        style={{ width: "100%", height: `${height}%` }}
                        title={`${format(date, "yyyy/MM/dd")}: ${dayMovements} حركة`}
                      />
                      <span className="text-[7px] text-gray-400 mt-1">
                        {format(date, "dd")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Modules Tabs */}
        <Tabs defaultValue="warehouse-stock" className="mt-4">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-10 bg-white border">
            <TabsTrigger
              value="warehouse-stock"
              className="text-[10px] flex items-center gap-1"
            >
              <WhIcon className="w-3 h-3" /> أرصدة المخازن
            </TabsTrigger>
            <TabsTrigger
              value="batches"
              className="text-[10px] flex items-center gap-1"
            >
              <Package className="w-3 h-3" /> الدفعات/التسلسل
            </TabsTrigger>
            <TabsTrigger
              value="reservations"
              className="text-[10px] flex items-center gap-1"
            >
              <Target className="w-3 h-3" /> الحجوزات
            </TabsTrigger>
            <TabsTrigger
              value="cycle-count"
              className="text-[10px] flex items-center gap-1"
            >
              <ClipboardCheck className="w-3 h-3" /> الجرد الدوري
            </TabsTrigger>
            <TabsTrigger
              value="valuation"
              className="text-[10px] flex items-center gap-1"
            >
              <Calculator className="w-3 h-3" /> التقييم
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="text-[10px] flex items-center gap-1"
            >
              <BarChart3 className="w-3 h-3" /> تقارير متقدمة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="warehouse-stock" className="mt-4">
            <WarehouseStockPanel />
          </TabsContent>

          <TabsContent value="batches" className="mt-4">
            <BatchTrackingPanel />
          </TabsContent>

          <TabsContent value="reservations" className="mt-4">
            <StockReservationsPanel />
          </TabsContent>

          <TabsContent value="cycle-count" className="mt-4">
            <CycleCountingPanel />
          </TabsContent>

          <TabsContent value="valuation" className="mt-4">
            <InventoryValuationPanel />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <AdvancedInventoryReportsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function KpiCard({
  icon,
  iconBg,
  label,
  value,
  subValue,
  subColor = "text-gray-500",
  danger,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  subValue?: string;
  subColor?: string;
  danger?: boolean;
}) {
  return (
    <Card className="border-0 shadow-sm bg-white p-3">
      <div className="flex items-center gap-3">
        <div
          className={`${iconBg} w-10 h-10 rounded-lg flex items-center justify-center`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 truncate">{label}</p>
          <p
            className={`font-bold text-lg truncate ${danger ? "text-red-600" : "text-[#102a2b]"}`}
          >
            {value}
          </p>
          {subValue && (
            <p className={`text-[10px] truncate ${subColor}`}>{subValue}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function QuickActionBtn({
  icon,
  label,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-20 flex-col items-start justify-center gap-1 text-right border-gray-200 hover:bg-gray-50"
    >
      <div className="bg-[#102a2b] text-[#b87945] w-8 h-8 rounded-lg flex items-center justify-center mb-1">
        {icon}
      </div>
      <span className="font-bold text-xs text-[#102a2b]">{label}</span>
      <span className="text-[9px] text-gray-400">{desc}</span>
    </Button>
  );
}
