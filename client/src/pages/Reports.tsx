import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { openPrintableInvoiceWindow } from "@/lib/pdfInvoiceGenerator";

type ReportType = 
  | "trialBalance" 
  | "incomeStatement" 
  | "balanceSheet"
  | "cashFlow"
  | "accountAnalysis"
  | "performanceScore";

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>("trialBalance");
  const { data: accountsData, isLoading: loadingAccounts } =
    trpc.accounting.getAccounts.useQuery();
  const { data: transactionsData, isLoading: loadingTx } =
    trpc.accounting.getTransactions.useQuery(undefined, { staleTime: 60_000 });
  const { data: summaryData } = trpc.accounting.getDashboardSummary.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const { data: settingsData } = trpc.accounting.getSettings.useQuery();
  const { data: openingBalancesData } =
    trpc.accounting.getOpeningBalances.useQuery(
      { periodName: settingsData?.accountingPeriod || "السنة المالية 2026" },
      { enabled: !!settingsData }
    );
  const obMap = useMemo(
    () =>
      new Map((openingBalancesData || []).map((ob: any) => [ob.accountId, ob])),
    [openingBalancesData]
  );

  const isLoading = loadingAccounts || loadingTx;

  const accountBalances = useMemo(() => {
    if (!accountsData || !transactionsData) return [];
    return accountsData
      .map(acc => {
        const accTxs = transactionsData.filter(
          t => t.accountId === acc.id && !t.isReversed
        );
        let debit = 0;
        let credit = 0;
        const ob = obMap.get(acc.id);
        if (ob) {
          const oa = parseFloat(String(ob.amount ?? "0"));
          if (!isNaN(oa) && oa > 0) {
            if (ob.type === "debit") debit += oa;
            else credit += oa;
          }
        }
        for (const tx of accTxs) {
          const amt = parseFloat(tx.amount || "0");
          if (tx.type === "debit") debit += amt;
          else credit += amt;
        }
        return { ...acc, debit, credit, balance: debit - credit };
      })
      .filter(a => a.debit !== 0 || a.credit !== 0);
  }, [accountsData, transactionsData, obMap]);

  const trialBalance = useMemo(() => {
    const totalDebits = accountBalances
      .filter(a => a.balance > 0)
      .reduce((s, a) => s + a.balance, 0);
    const totalCredits = accountBalances
      .filter(a => a.balance < 0)
      .reduce((s, a) => s + Math.abs(a.balance), 0);
    return {
      accounts: accountBalances,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }, [accountBalances]);

  const incomeStatement = useMemo(() => {
    const revenues = accountBalances.filter(a => a.type === "revenue");
    const expenses = accountBalances.filter(a => a.type === "expense");
    const totalRevenue = revenues.reduce((s, a) => s + a.balance, 0);
    const totalExpenses = expenses.reduce((s, a) => s + Math.abs(a.balance), 0);
    return {
      revenues,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }, [accountBalances]);

  const balanceSheet = useMemo(() => {
    const assets = accountBalances.filter(a => a.type === "asset");
    const liabilities = accountBalances.filter(a => a.type === "liability");
    const equity = accountBalances.filter(a => a.type === "equity");
    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce(
      (s, a) => s + Math.abs(a.balance),
      0
    );
    const totalEquity =
      equity.reduce((s, a) => s + a.balance, 0) + incomeStatement.netIncome;
    return {
      assets,
      liabilities,
      equity: [
        ...equity,
        { name: "أرباح الفترة", balance: incomeStatement.netIncome },
      ],
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }, [accountBalances, incomeStatement]);

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
                مكتبة الحسينية الحديثة — التقارير والقوائم المالية الرسمية
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                التقرير المالي المعاين والمختوم إلكترونياً بـ QR Code والقابل
                للطباعة والمشاركة التلقائية.
              </p>
            </div>

            {/* Action Buttons: Print & WhatsApp Share */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const repTitle =
                    activeReport === "trialBalance"
                      ? "ميزان المراجعة العمومي"
                      : activeReport === "incomeStatement"
                        ? "قائمة الدخل والأرباح والخسائر"
                        : "الميزانية العمومية";
                  openPrintableInvoiceWindow({
                    invoiceNumber: `REP-${activeReport.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
                    invoiceDate: new Date().toISOString(),
                    customerName: "مكتبة الحسينية الحديثة (المشترك الأول)",
                    institutionName:
                      "مكتبة الحسينية الحديثة للخدمات الطلابية والمكتبية والتصاميم وصيانة الأجهزة",
                    currency: "ريال يمني (YER)",
                    items: [
                      {
                        description: `تقرير مالي رسمي: ${repTitle}`,
                        quantity: 1,
                        unitPrice: summaryData?.totalRevenue || 0,
                        totalPrice: summaryData?.totalRevenue || 0,
                      },
                    ],
                    subtotal: summaryData?.totalRevenue || 0,
                    total: summaryData?.totalRevenue || 0,
                    notes: `إجمالي الإيرادات: ${summaryData?.totalRevenue?.toLocaleString()} YER | المصروفات: ${summaryData?.totalExpense?.toLocaleString()} YER | صافي الدخل: ${summaryData?.netIncome?.toLocaleString()} YER`,
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
                    `السلام عليكم، التقرير المالي الرسمي لـ (مكتبة الحسينية الحديثة):\n- التقرير: ${repTitle}\n- الإيرادات: ${summaryData?.totalRevenue?.toLocaleString()} YER\n- المصروفات: ${summaryData?.totalExpense?.toLocaleString()} YER\n- صافي الدخل: ${summaryData?.netIncome?.toLocaleString()} YER\n- إجمالي الأصول: ${summaryData?.totalAssets?.toLocaleString()} YER\n- رابط التقرير: http://localhost:3000/reports`
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

        <Tabs
          value={activeReport}
          onValueChange={v => setActiveReport(v as ReportType)}
        >
          <TabsList className="grid w-full grid-cols-3 h-10 bg-white border">
            <TabsTrigger value="trialBalance" className="text-[10px]">
              ميزان المراجعة
            </TabsTrigger>
            <TabsTrigger value="incomeStatement" className="text-[10px]">
              قائمة الدخل
            </TabsTrigger>
            <TabsTrigger value="balanceSheet" className="text-[10px]">
              الميزانية العمومية
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
                              {a.balance > 0 ? formatNum(a.balance) : "-"}
                            </td>
                            <td className="p-2 text-left font-mono">
                              {a.balance < 0
                                ? formatNum(Math.abs(a.balance))
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
        </Tabs>
      </main>
    </div>
  );
}
