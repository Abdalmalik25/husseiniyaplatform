import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  FileText,
} from "lucide-react";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { openPrintableInvoiceWindow } from "@/lib/pdfInvoiceGenerator";
import {
  buildAccountBalances,
  computeBalanceSheet,
  computeIncomeStatement,
  computeTrialBalance,
} from "@/lib/accountingReports";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";

type ReportType =
  | "trialBalance"
  | "incomeStatement"
  | "balanceSheet"
  | "cashFlow"
  | "accountAnalysis"
  | "performanceScore"
  | "daily";

export default function Reports() {
  const utils = trpc.useUtils();
  const [activeReport, setActiveReport] = useState<ReportType>("daily");
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const { data: dailyData } = trpc.sales.dailySummary.useQuery(
    { date: reportDate },
    { staleTime: 30_000 }
  );
  const { data: accountsData, isLoading: loadingAccounts } =
    trpc.accounting.getAccounts.useQuery();
  const { data: transactionsData, isLoading: loadingTx } =
    trpc.accounting.getTransactions.useQuery(undefined, { staleTime: 60_000 });
  const { data: summaryData } = trpc.accounting.getDashboardSummary.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const { data: settingsData } = trpc.accounting.getSettings.useQuery();
  const { data: docsReport } = trpc.modules.documents.recent.useQuery();
  const { data: profitability } = trpc.modules.reports.profitability.useQuery();
  const processAlerts = trpc.erp.processAlerts.useMutation({
    onSuccess: (r: any) => {
      toast.success(
        `تم إنشاء ${r.total} تنبيه استباقي (نقطة إعادة طلب: ${r.created.reorder}، مستحقات متأخرة: ${r.created.overdueSales + r.created.overduePurchase})`
      );
      utils.modules.notifications.list.invalidate();
      utils.modules.notifications.unreadCount.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const { data: openingBalancesData } =
    trpc.accounting.getOpeningBalances.useQuery(
      { periodName: settingsData?.accountingPeriod || "السنة المالية 2026" },
      { enabled: !!settingsData }
    );
  const isLoading = loadingAccounts || loadingTx;

  const accountBalances = useMemo(() => {
    if (!accountsData || !transactionsData) return [];
    return buildAccountBalances(
      accountsData,
      transactionsData,
      Object.fromEntries(
        (openingBalancesData || []).map((ob: any) => [
          ob.accountId,
          { amount: ob.amount, type: ob.type },
        ])
      )
    );
  }, [accountsData, transactionsData, openingBalancesData]);

  const trialBalance = useMemo(
    () => computeTrialBalance(accountBalances),
    [accountBalances]
  );

  const incomeStatement = useMemo(
    () => computeIncomeStatement(accountBalances),
    [accountBalances]
  );

  const balanceSheet = useMemo(
    () => computeBalanceSheet(accountBalances, incomeStatement.netIncome),
    [accountBalances, incomeStatement.netIncome]
  );

  const formatNum = (n: number) =>
    n.toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="min-h-screen bg-[#fbf8f2]" dir="rtl">
      <HeaderNavbar />

      <main className="max-w-5xl mx-auto p-3 space-y-3">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="border-0 shadow-sm bg-white p-3">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 text-green-600 w-8 h-8 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500">الإيرادات</p>
                <p className="font-bold text-xs text-green-600">
                  {formatNum(summaryData?.totalRevenue || 0)} ر.ي
                </p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm bg-white p-3">
            <div className="flex items-center gap-2">
              <div className="bg-red-100 text-red-600 w-8 h-8 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500">المصروفات</p>
                <p className="font-bold text-xs text-red-600">
                  {formatNum(summaryData?.totalExpense || 0)} ر.ي
                </p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm bg-white p-3">
            <div className="flex items-center gap-2">
              <div className="bg-[#b87945] text-white w-8 h-8 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500">صافي الدخل</p>
                <p className="font-bold text-xs text-[#102a2b]">
                  {formatNum(summaryData?.netIncome || 0)} ر.ي
                </p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm bg-white p-3">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500">الأصول</p>
                <p className="font-bold text-xs text-blue-600">
                  {formatNum(summaryData?.totalAssets || 0)} ر.ي
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Institutional Header & Action Toolbar */}
        <div className="bg-[#102a2b] text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <Badge className="bg-[#b87945] text-[#102a2b] font-bold text-xs mb-1">
                المشترك الأول والافتراضي المعتمد
              </Badge>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
                الحسينية لخدمات الأعمال — التقارير والقوائم المالية
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                تقرير موحد لكل القطاعات — مختوم إلكترونياً بـ QR وخاضع لضوابط
                IFRS ومسار تدقيق COSO
              </p>
            </div>

            {/* Action Buttons: Print & WhatsApp Share */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const fmt = (n?: number) =>
                    n === undefined || n === null || isNaN(n)
                      ? "0.00"
                      : n.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                  const typeLabel = (t: string) =>
                    t === "asset"
                      ? "أصول"
                      : t === "liability"
                        ? "خصوم"
                        : t === "equity"
                          ? "حقوق ملكية"
                          : t === "revenue"
                            ? "إيرادات"
                            : "مصروفات";
                  let title: string;
                  let columns: string[];
                  let rows: (string | number)[][];
                  if (activeReport === "trialBalance") {
                    title = "ميزان المراجعة العمومي";
                    columns = ["الرمز", "اسم الحساب", "النوع", "مدين", "دائن"];
                    rows = trialBalance.accounts.map(a => [
                      a.code ?? "",
                      a.name,
                      typeLabel(a.type),
                      (a.balance ?? 0) > 0 ? fmt(a.balance) : "-",
                      (a.balance ?? 0) < 0
                        ? fmt(Math.abs(a.balance ?? 0))
                        : "-",
                    ]);
                    rows.push([
                      "",
                      "الإجمالي",
                      "",
                      fmt(trialBalance.totalDebits),
                      fmt(trialBalance.totalCredits),
                    ]);
                  } else if (activeReport === "incomeStatement") {
                    title = "قائمة الدخل والأرباح والخسائر";
                    columns = ["البيان", "المبلغ"];
                    rows = incomeStatement.revenues.map(a => [
                      a.name,
                      fmt(a.balance),
                    ]);
                    rows.push([
                      "إجمالي الإيرادات",
                      fmt(incomeStatement.totalRevenue),
                    ]);
                    rows.push(["", ""]);
                    rows.push(
                      ...incomeStatement.expenses.map(a => [
                        a.name,
                        fmt(Math.abs(a.balance)),
                      ])
                    );
                    rows.push([
                      "إجمالي المصروفات",
                      fmt(incomeStatement.totalExpenses),
                    ]);
                    rows.push(["صافي الدخل", fmt(incomeStatement.netIncome)]);
                  } else {
                    title = "الميزانية العمومية";
                    columns = ["البيان", "المبلغ"];
                    rows = balanceSheet.assets.map(a => [
                      a.name,
                      fmt(a.balance),
                    ]);
                    rows.push(["إجمالي الأصول", fmt(balanceSheet.totalAssets)]);
                    rows.push(["", ""]);
                    rows.push(
                      ...balanceSheet.liabilities.map(a => [
                        a.name,
                        fmt(Math.abs(a.balance)),
                      ])
                    );
                    rows.push(
                      ...balanceSheet.equity
                        .filter(a => a.balance !== 0)
                        .map(a => [a.name, fmt(a.balance)])
                    );
                    rows.push([
                      "إجمالي الخصوم وحقوق الملكية",
                      fmt(
                        balanceSheet.totalLiabilities + balanceSheet.totalEquity
                      ),
                    ]);
                  }
                  openPrintableInvoiceWindow({
                    invoiceNumber: `REP-${activeReport.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
                    invoiceDate: new Date().toISOString(),
                    customerName: "مجموعة الحسينية (الكيان الموحد)",
                    institutionName:
                      "مجموعة الحسينية — حلول الأعمال والهندسة والمعرفة",
                    currency: "ريال يمني (YER)",
                    items: [],
                    subtotal: summaryData?.totalRevenue || 0,
                    total: summaryData?.netIncome || 0,
                    notes: `إجمالي الإيرادات: ${summaryData?.totalRevenue?.toLocaleString()} YER | المصروفات: ${summaryData?.totalExpense?.toLocaleString()} YER | صافي الدخل: ${summaryData?.netIncome?.toLocaleString()} YER`,
                    report: { title, columns, rows },
                  });
                }}
                className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold text-xs h-9 px-3 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                طباعة التقرير بـ QR
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  const repTitle =
                    activeReport === "trialBalance"
                      ? "ميزان المراجعة"
                      : activeReport === "incomeStatement"
                        ? "قائمة الدخل"
                        : "الميزانية العمومية";
                  const text = encodeURIComponent(
                    `السلام عليكم، التقرير المالي الرسمي لـ (مجموعة الحسينية):\n- التقرير: ${repTitle}\n- الإيرادات: ${summaryData?.totalRevenue?.toLocaleString()} YER\n- المصروفات: ${summaryData?.totalExpense?.toLocaleString()} YER\n- صافي الدخل: ${summaryData?.netIncome?.toLocaleString()} YER\n- إجمالي الأصول: ${summaryData?.totalAssets?.toLocaleString()} YER\n- رابط التقرير: ${window.location.origin}/reports`
                  );
                  window.open(`https://wa.me/?text=${text}`, "_blank");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Download className="w-4 h-4" />
                مشاركة عبر الواتساب
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Proactive alerts (Module C) ─── */}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => processAlerts.mutate()}
            disabled={processAlerts.isPending}
            className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold text-xs h-9 px-3 rounded-xl flex items-center gap-1.5 shadow"
          >
            <FileText className="w-4 h-4" />
            {processAlerts.isPending
              ? "جاري التوليد..."
              : "توليد التنبيهات الاستباقية"}
          </Button>
        </div>

        <Tabs
          value={activeReport}
          onValueChange={v => setActiveReport(v as ReportType)}
        >
          <TabsList className="grid w-full grid-cols-6 h-10 bg-white border">
            <TabsTrigger value="daily" className="text-[10px]">
              التقرير اليومي
            </TabsTrigger>
            <TabsTrigger value="trialBalance" className="text-[10px]">
              ميزان المراجعة
            </TabsTrigger>
            <TabsTrigger value="incomeStatement" className="text-[10px]">
              قائمة الدخل
            </TabsTrigger>
            <TabsTrigger value="balanceSheet" className="text-[10px]">
              الميزانية العمومية
            </TabsTrigger>
            <TabsTrigger value="profitability" className="text-[10px]">
              الربحية
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-[10px]">
              المستندات
            </TabsTrigger>
          </TabsList>

          {/* Trial Balance */}
          <TabsContent value="trialBalance">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  ميزان العموم
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className="h-9 bg-gray-100 rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-right p-2 font-bold text-[10px]">
                            الكود
                          </th>
                          <th className="text-right p-2 font-bold text-[10px]">
                            اسم الحساب
                          </th>
                          <th className="text-right p-2 font-bold text-[10px]">
                            النوع
                          </th>
                          <th className="text-left p-2 font-bold text-[10px]">
                            مدين
                          </th>
                          <th className="text-left p-2 font-bold text-[10px]">
                            دائن
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {trialBalance.accounts.map(a => (
                          <tr key={a.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono text-[10px]">
                              {a.code}
                            </td>
                            <td className="p-2 font-bold">{a.name}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[9px]">
                                {a.type === "asset"
                                  ? "أصول"
                                  : a.type === "liability"
                                    ? "خصوم"
                                    : a.type === "equity"
                                      ? "حقوق ملكية"
                                      : a.type === "revenue"
                                        ? "إيرادات"
                                        : "مصروفات"}
                              </Badge>
                            </td>
                            <td className="p-2 text-left font-mono">
                              {(a.balance ?? 0) > 0
                                ? formatNum(a.balance ?? 0)
                                : "-"}
                            </td>
                            <td className="p-2 text-left font-mono">
                              {(a.balance ?? 0) < 0
                                ? formatNum(Math.abs(a.balance ?? 0))
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 bg-gray-100 font-bold">
                          <td colSpan={3} className="p-2 text-[10px]">
                            الإجمالي
                          </td>
                          <td className="p-2 text-left font-mono text-[10px]">
                            {formatNum(trialBalance.totalDebits)}
                          </td>
                          <td className="p-2 text-left font-mono text-[10px]">
                            {formatNum(trialBalance.totalCredits)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                {!isLoading && (
                  <div className="mt-2 flex items-center gap-2">
                    {trialBalance.isBalanced ? (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">
                        متوازن
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">
                        غير متوازن — فرق:{" "}
                        {formatNum(
                          Math.abs(
                            trialBalance.totalDebits - trialBalance.totalCredits
                          )
                        )}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income Statement */}
          <TabsContent value="incomeStatement">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  قائمة الدخل (الأرباح والخسائر)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="h-9 bg-gray-100 rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1">
                        <ArrowUp className="w-3 h-3" />
                        الإيرادات
                      </h3>
                      {incomeStatement.revenues.map(a => (
                        <div
                          key={a.id}
                          className="flex justify-between py-1 border-b text-xs"
                        >
                          <span>{a.name}</span>
                          <span className="font-mono text-green-600">
                            {formatNum(a.balance)} ر.ي
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 font-bold text-xs bg-green-50 px-2 rounded mt-1">
                        <span>إجمالي الإيرادات</span>
                        <span className="text-green-600">
                          {formatNum(incomeStatement.totalRevenue)} ر.ي
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                        <ArrowDown className="w-3 h-3" />
                        المصروفات
                      </h3>
                      {incomeStatement.expenses.map(a => (
                        <div
                          key={a.id}
                          className="flex justify-between py-1 border-b text-xs"
                        >
                          <span>{a.name}</span>
                          <span className="font-mono text-red-600">
                            {formatNum(Math.abs(a.balance))} ر.ي
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 font-bold text-xs bg-red-50 px-2 rounded mt-1">
                        <span>إجمالي المصروفات</span>
                        <span className="text-red-600">
                          {formatNum(incomeStatement.totalExpenses)} ر.ي
                        </span>
                      </div>
                    </div>
                    <div
                      className={`flex justify-between py-3 font-bold text-sm px-3 rounded-lg ${incomeStatement.netIncome >= 0 ? "bg-[#102a2b] text-[#b87945]" : "bg-red-600 text-white"}`}
                    >
                      <span>صافي الدخل</span>
                      <span>{formatNum(incomeStatement.netIncome)} ر.ي</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="balanceSheet">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-bold text-[#102a2b]">
                  الميزان العمومي
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div
                        key={i}
                        className="h-9 bg-gray-100 rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-blue-600 mb-2">
                          الأصول
                        </h3>
                        {balanceSheet.assets.map(a => (
                          <div
                            key={a.id}
                            className="flex justify-between py-1 border-b text-xs"
                          >
                            <span>{a.name}</span>
                            <span className="font-mono">
                              {formatNum(a.balance)} ر.ي
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between py-2 font-bold text-xs bg-blue-50 px-2 rounded mt-1">
                          <span>إجمالي الأصول</span>
                          <span>{formatNum(balanceSheet.totalAssets)} ر.ي</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-red-600 mb-2">
                          الخصوم وحقوق الملكية
                        </h3>
                        {balanceSheet.liabilities.map(a => (
                          <div
                            key={a.id}
                            className="flex justify-between py-1 border-b text-xs"
                          >
                            <span>{a.name}</span>
                            <span className="font-mono">
                              {formatNum(Math.abs(a.balance))} ر.ي
                            </span>
                          </div>
                        ))}
                        {balanceSheet.equity
                          .filter(a => a.balance !== 0)
                          .map((a, i) => (
                            <div
                              key={i}
                              className="flex justify-between py-1 border-b text-xs"
                            >
                              <span>{a.name}</span>
                              <span className="font-mono">
                                {formatNum(a.balance)} ر.ي
                              </span>
                            </div>
                          ))}
                        <div className="flex justify-between py-2 font-bold text-xs bg-red-50 px-2 rounded mt-1">
                          <span>إجمالي الخصوم وحقوق الملكية</span>
                          <span>
                            {formatNum(
                              balanceSheet.totalLiabilities +
                                balanceSheet.totalEquity
                            )}{" "}
                            ر.ي
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {Math.abs(
                        balanceSheet.totalAssets -
                          (balanceSheet.totalLiabilities +
                            balanceSheet.totalEquity)
                      ) < 0.01 ? (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">
                          الميزان متوازن
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 text-[10px]">
                          الميزان غير متوازن
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Sales Report */}
          <TabsContent value="daily">
            <div className="space-y-3">
              <div className="bg-[#102a2b] text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold font-display">
                    التقرير اليومي للمبيعات
                  </h1>
                  <p className="text-xs text-slate-300 mt-1">
                    ملخص المبيعات وأساليب الدفع وأفضل الأصناف عن يوم محدد
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="h-9 text-xs bg-white text-[#102a2b] w-auto"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const d = dailyData;
                      if (!d) return;
                      openPrintableInvoiceWindow({
                        invoiceNumber: `DAILY-${d.date}`,
                        invoiceDate: new Date().toISOString(),
                        customerName: "تقرير يومي — نقطة البيع",
                        institutionName:
                          settingsData?.institutionName || "المؤسسة",
                        currency: "ريال يمني (YER)",
                        items: [
                          {
                            description: `عدد الفواتير: ${d.invoiceCount}`,
                            quantity: 1,
                            unitPrice: d.totalSales,
                            totalPrice: d.totalSales,
                          },
                          {
                            description: "المبلغ المحصل",
                            quantity: 1,
                            unitPrice: d.totalPaid,
                            totalPrice: d.totalPaid,
                          },
                          {
                            description: "الآجل (غير المحصل)",
                            quantity: 1,
                            unitPrice: d.credit,
                            totalPrice: d.credit,
                          },
                        ],
                        subtotal: d.totalSales,
                        total: d.totalSales,
                        notes: `إجمالي المبيعات: ${d.totalSales?.toLocaleString()} YER | المحصل: ${d.totalPaid?.toLocaleString()} YER | الآجل: ${d.credit?.toLocaleString()} YER | اليوم السابق: ${d.previousDayTotal?.toLocaleString()} YER`,
                      });
                    }}
                    className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] font-bold text-xs h-9 px-3 rounded-xl flex items-center gap-1.5 shadow"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Card className="border-0 shadow-sm bg-white p-3">
                  <p className="text-[10px] text-gray-500">عدد الفواتير</p>
                  <p className="font-bold text-lg text-[#102a2b]">
                    {dailyData?.invoiceCount ?? 0}
                  </p>
                </Card>
                <Card className="border-0 shadow-sm bg-white p-3">
                  <p className="text-[10px] text-gray-500">إجمالي المبيعات</p>
                  <p className="font-bold text-lg text-green-600">
                    {formatNum(dailyData?.totalSales || 0)} ر.ي
                  </p>
                </Card>
                <Card className="border-0 shadow-sm bg-white p-3">
                  <p className="text-[10px] text-gray-500">المبلغ المحصل</p>
                  <p className="font-bold text-lg text-[#b87945]">
                    {formatNum(dailyData?.totalPaid || 0)} ر.ي
                  </p>
                </Card>
                <Card className="border-0 shadow-sm bg-white p-3">
                  <p className="text-[10px] text-gray-500">الآجل (غير محصل)</p>
                  <p className="font-bold text-lg text-red-500">
                    {formatNum(dailyData?.credit || 0)} ر.ي
                  </p>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-bold text-[#102a2b]">
                      توزيع أساليب الدفع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {(
                      [
                        ["cash", "نقدي", "text-green-600"],
                        ["card", "بطاقة", "text-blue-600"],
                        ["transfer", "تحويل", "text-purple-600"],
                        ["credit", "آجل", "text-red-600"],
                        ["online", "أونلاين", "text-orange-600"],
                      ] as const
                    ).map(([key, label, color]) => {
                      const val = dailyData?.byMethod?.[key] || 0;
                      const pct =
                        dailyData && dailyData.totalSales > 0
                          ? (val / dailyData.totalSales) * 100
                          : 0;
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs">
                            <span>{label}</span>
                            <span className={`font-bold ${color}`}>
                              {formatNum(val)} ر.ي
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded mt-1 overflow-hidden">
                            <div
                              className="h-full bg-[#b87945]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-bold text-[#102a2b]">
                      أفضل الأصناف مبيعاً
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 overflow-x-auto">
                    {!dailyData || dailyData.topProducts.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        لا توجد مبيعات في هذا اليوم
                      </p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-gray-50 text-[10px]">
                            <th className="text-right p-1.5 font-bold">
                              الصنف
                            </th>
                            <th className="text-center p-1.5 font-bold">
                              الكمية
                            </th>
                            <th className="text-left p-1.5 font-bold">
                              الإيراد
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyData.topProducts.map((p, i) => (
                            <tr key={p.productId} className="border-b">
                              <td className="p-1.5">
                                <span className="text-[10px] text-gray-400 mr-1">
                                  {i + 1}.
                                </span>
                                {p.productName}
                              </td>
                              <td className="p-1.5 text-center font-mono">
                                {p.qty}
                              </td>
                              <td className="p-1.5 text-left font-mono text-[#b87945]">
                                {formatNum(p.revenue)} ر.ي
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500">
                      إجمالي مبيعات اليوم السابق
                    </p>
                    <p className="font-bold text-xs text-[#102a2b]">
                      {formatNum(dailyData?.previousDayTotal || 0)} ر.ي
                    </p>
                  </div>
                  <Badge
                    className={
                      (dailyData?.totalSales || 0) >=
                      (dailyData?.previousDayTotal || 0)
                        ? "bg-green-100 text-green-700 text-[10px]"
                        : "bg-red-100 text-red-700 text-[10px]"
                    }
                  >
                    {(dailyData?.totalSales || 0) >=
                    (dailyData?.previousDayTotal || 0)
                      ? "أعلى/مساوٍ لليوم السابق"
                      : "أقل من اليوم السابق"}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* Documents Report */}
          <TabsContent value="documents">
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#b87945]" /> المستندات
                    حسب النوع
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {(docsReport?.byType ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      لا توجد مستندات مرتبطة
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(docsReport?.byType ?? []).map((b: any) => (
                        <div
                          key={b.entityType || "غير محدد"}
                          className="flex items-center justify-between rounded-lg border p-2"
                        >
                          <span className="text-[12px] font-bold text-[#102a2b]">
                            {b.entityType || "غير محدد"}
                          </span>
                          <span className="text-[12px] font-mono text-[#b87945]">
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-bold text-[#102a2b] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#b87945]" /> أحدث
                    المستندات
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {(docsReport?.items ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      لا توجد مستندات
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(docsReport?.items ?? []).map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-lg border p-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold truncate">
                              {d.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {d.entityType || "غير محدد"} #{d.entityId}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(d.createdAt).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* ─── Profitability (Module B) ─── */}
          <TabsContent value="profitability">
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-bold text-[#102a2b]">
                    الربحية حسب مندوب المبيعات
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 overflow-x-auto">
                  {!profitability || profitability.byRep.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">
                      لا توجد مناديب أو مبيعات.
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-gray-50 text-[10px]">
                          <th className="text-right p-1.5 font-bold">
                            المندوب
                          </th>
                          <th className="text-left p-1.5 font-bold">
                            المبيعات
                          </th>
                          <th className="text-left p-1.5 font-bold">العمولة</th>
                          <th className="text-left p-1.5 font-bold">البونص</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitability.byRep.map((r: any) => (
                          <tr key={r.rep.id} className="border-b">
                            <td className="p-1.5 font-bold">{r.rep.name}</td>
                            <td className="p-1.5 text-left font-mono">
                              {fmtNum(r.salesTotal)} ر.ي
                            </td>
                            <td className="p-1.5 text-left font-mono text-emerald-600">
                              {fmtNum(r.commission)} ر.ي
                            </td>
                            <td className="p-1.5 text-left font-mono text-[#b87945]">
                              {fmtNum(r.bonus)} ر.ي
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-bold text-[#102a2b]">
                    الخصومات والعروض
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-2 text-[12px]">
                    <span className="text-slate-600">
                      إجمالي الخصم الممنوح (الفواتير النشطة)
                    </span>
                    <span className="font-bold text-rose-600">
                      {fmtNum(profitability?.discountTotal || 0)}{" "}
                      ر.ي
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-2 text-[12px]">
                    <span className="text-slate-600">فواتير بها خصم</span>
                    <span className="font-bold text-[#b87945]">
                      {profitability?.discountedInvoices ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-2 text-[12px]">
                    <span className="text-slate-600">
                      العروض النشطة المعرّفة
                    </span>
                    <span className="font-bold">
                      {profitability?.offers ?? 0}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    ملاحظة: الخصم الممنوح مجمّع من بنود فواتير المبيعات غير
                    الملغاة. ربط كل خصم بعرض محدد مؤجَّل (يُحفظ معرّف العرض على
                    البند لاحقاً).
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
