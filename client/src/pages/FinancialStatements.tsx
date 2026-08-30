import { useState } from "react";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  Scale,
  TrendingUp,
  Wallet,
  Landmark,
  Receipt,
  Users,
  Factory,
} from "lucide-react";

const fmt = (n: number | undefined | null) =>
  Number(n ?? 0).toLocaleString("ar-YE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_LABEL: Record<string, string> = {
  current: "حالية",
  d30: "1-30 يوم",
  d60: "31-60 يوم",
  d90: "61-90 يوم",
  over90: "+90 يوم",
};

export default function FinancialStatements() {
  const [asOf, setAsOf] = useState("");
  const common = {
    staleTime: 30_000,
    ...(asOf ? { input: { asOf } } : {}),
  } as any;

  const trial = trpc.financialReports.trialBalance.useQuery(common);
  const income = trpc.financialReports.incomeStatement.useQuery(common);
  const sheet = trpc.financialReports.balanceSheet.useQuery(common);
  const cash = trpc.financialReports.cashFlow.useQuery(common);
  const ar = trpc.financialReports.arAging.useQuery(undefined, {
    staleTime: 30_000,
  });
  const ap = trpc.financialReports.apAging.useQuery(undefined, {
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <HeaderNavbar />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">
              القوائم المالية — تقارير الخادم
            </h1>
            <p className="text-xs text-muted-foreground">
              حسابات موثوقة من قاعدة البيانات مباشرة وفق معايير القيد المزدوج —
              مصدر حقيقة واحد
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">حتى تاريخ (اختياري)</Label>
              <Input
                type="date"
                value={asOf}
                onChange={e => setAsOf(e.target.value)}
                className="h-9 w-44 text-xs"
              />
            </div>
            {asOf && (
              <Button
                variant="ghost"
                className="h-9 text-xs"
                onClick={() => setAsOf("")}
              >
                مسح
              </Button>
            )}
          </div>
        </div>

        {/* Key KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi
            icon={<Scale className="w-4 h-4" />}
            label="إجمالي المدين"
            value={fmt(trial.data?.totals.debit)}
            tone="brand"
          />
          <Kpi
            icon={<TrendingUp className="w-4 h-4" />}
            label="صافي الدخل"
            value={fmt(income.data?.totals.net)}
            tone={Number(income.data?.totals.net) >= 0 ? "good" : "bad"}
          />
          <Kpi
            icon={<Wallet className="w-4 h-4" />}
            label="إجمالي الأصول"
            value={fmt(sheet.data?.totals.assets)}
            tone="brand"
          />
          <Kpi
            icon={<Landmark className="w-4 h-4" />}
            label="صافي التدفق النقدي"
            value={fmt(cash.data?.net)}
            tone="good"
          />
        </div>

        <Tabs defaultValue="trial" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="trial">ميزان المراجعة</TabsTrigger>
            <TabsTrigger value="income">قائمة الدخل</TabsTrigger>
            <TabsTrigger value="sheet">الميزانية</TabsTrigger>
            <TabsTrigger value="cash">التدفقات</TabsTrigger>
            <TabsTrigger value="ar">الذمم المدينة</TabsTrigger>
            <TabsTrigger value="ap">الذمم الدائنة</TabsTrigger>
          </TabsList>

          <TabsContent value="trial">
            <ReportCard
              title="ميزان المراجعة"
              desc="كل الحسابات ذات الرصيد — المدين = الدائن"
              footer={`التوازن: مدين ${fmt(trial.data?.totals.debit)} = دائن ${fmt(trial.data?.totals.credit)}`}
            >
              {trial.isLoading ? (
                <Loading />
              ) : (
                <Table>
                  <Header cols={["الكود", "الحساب", "النوع", "مدين", "دائن"]} />
                  <TableBody>
                    {trial.data?.rows?.map((r: any) => (
                      <TableRow key={r.accountId}>
                        <TableCell className="font-mono">{r.code}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {r.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {r.debit ? fmt(r.debit) : "—"}
                        </TableCell>
                        <TableCell className="font-mono">
                          {r.credit ? fmt(r.credit) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ReportCard>
          </TabsContent>

          <TabsContent value="income">
            <div className="grid md:grid-cols-2 gap-4">
              <ReportCard title="الإيرادات" desc="حسابات الإيرادات">
                {income.isLoading ? (
                  <Loading />
                ) : (
                  <Table>
                    <Header cols={["الكود", "البند", "المبلغ"]} numberOnly />
                    <TableBody>
                      {income.data?.revenues?.map((r: any) => (
                        <TableRow key={r.code}>
                          <TableCell className="font-mono">{r.code}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="font-mono">
                            {fmt(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ReportCard>
              <ReportCard title="المصروفات" desc="حسابات المصروفات">
                {income.isLoading ? (
                  <Loading />
                ) : (
                  <Table>
                    <Header cols={["الكود", "البند", "المبلغ"]} numberOnly />
                    <TableBody>
                      {income.data?.expenses?.map((r: any) => (
                        <TableRow key={r.code}>
                          <TableCell className="font-mono">{r.code}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="font-mono">
                            {fmt(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ReportCard>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <SummaryStat
                label="الإيرادات"
                value={fmt(income.data?.totals.revenue)}
              />
              <SummaryStat
                label="المصروفات"
                value={fmt(income.data?.totals.expense)}
              />
              <SummaryStat
                label="صافي الدخل"
                value={fmt(income.data?.totals.net)}
              />
            </div>
          </TabsContent>

          <TabsContent value="sheet">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "الأصول",
                  icon: <Wallet className="w-4 h-4" />,
                  rows: sheet.data?.assets,
                },
                {
                  title: "الخصوم",
                  icon: <Landmark className="w-4 h-4" />,
                  rows: sheet.data?.liabilities,
                },
                {
                  title: "رأس المال",
                  icon: <Users className="w-4 h-4" />,
                  rows: sheet.data?.equity,
                },
              ].map(s => (
                <ReportCard key={s.title} title={s.title} icon={s.icon}>
                  {sheet.isLoading ? (
                    <Loading />
                  ) : (
                    <Table>
                      <Header cols={["الكود", "البند", "المبلغ"]} numberOnly />
                      <TableBody>
                        {(s.rows as any[] | undefined)?.map((r: any) => (
                          <TableRow key={r.code}>
                            <TableCell className="font-mono">
                              {r.code}
                            </TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="font-mono">
                              {fmt(r.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ReportCard>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <SummaryStat
                label="الأصول"
                value={fmt(sheet.data?.totals.assets)}
              />
              <SummaryStat
                label="الخصوم"
                value={fmt(sheet.data?.totals.liabilities)}
              />
              <SummaryStat
                label="رأس المال"
                value={fmt(sheet.data?.totals.equity)}
              />
            </div>
          </TabsContent>

          <TabsContent value="cash">
            <ReportCard
              title="التدفقات النقدية"
              desc="صافي التغير في الحسابات النقدية"
            >
              {cash.isLoading ? (
                <Loading />
              ) : (
                <Table>
                  <Header
                    cols={["الكود", "الحساب", "صافي التدفق"]}
                    numberOnly
                  />
                  <TableBody>
                    {cash.data?.lines?.map((r: any) => (
                      <TableRow key={r.accountId}>
                        <TableCell className="font-mono">{r.code}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="font-mono">
                          {fmt(r.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ReportCard>
          </TabsContent>

          {["ar", "ap"].map(k => {
            const data = k === "ar" ? ar.data : ap.data;
            const isAr = k === "ar";
            return (
              <TabsContent key={k} value={k}>
                <ReportCard
                  title={
                    isAr
                      ? "ذمم العملاء المدينة (Aging)"
                      : "ذمم الموردين الدائنة (Aging)"
                  }
                  icon={
                    isAr ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      <Factory className="w-4 h-4" />
                    )
                  }
                  footer={`إجمالي: ${fmt(Object.values(data?.totals ?? {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0))}`}
                >
                  {(isAr ? ar.isLoading : ap.isLoading) ? (
                    <Loading />
                  ) : (
                    <Table>
                      <Header
                        cols={[
                          "الفاتورة",
                          "الطرف",
                          "الاستحقاق",
                          "الفئة",
                          "المتبقي",
                        ]}
                      />
                      <TableBody>
                        {data?.rows?.map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">
                              {r.invoiceNumber}
                            </TableCell>
                            <TableCell>{r.customer ?? r.supplier}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {new Date(r.dueDate).toLocaleDateString("ar")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.bucket === "current"
                                    ? "outline"
                                    : "destructive"
                                }
                                className="text-[10px]"
                              >
                                {STATUS_LABEL[r.bucket] ?? r.bucket}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">
                              {fmt(r.outstanding)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ReportCard>
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
}

function Header({
  cols,
  numberOnly,
}: {
  cols: string[];
  numberOnly?: boolean;
}) {
  return (
    <TableHeader>
      <TableRow>
        {cols.map(c => (
          <TableHead key={c} className={numberOnly ? "text-right" : undefined}>
            {c}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function ReportCard({ title, desc, icon, footer, children }: any) {
  return (
    <Card className="surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
        {desc && <CardDescription className="text-xs">{desc}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <div className="px-4 pb-4 pt-1 text-xs text-muted-foreground font-medium">
          {footer}
        </div>
      )}
    </Card>
  );
}

function Kpi({ icon, label, value, tone }: any) {
  const color =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
        ? "text-red-500"
        : "text-brand";
  return (
    <Card className="surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <p className={`text-lg font-black mt-2 font-mono ${color}`}>{value}</p>
    </Card>
  );
}

function SummaryStat({ label, value }: any) {
  return (
    <Card className="surface p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-black font-mono mt-1">{value}</p>
    </Card>
  );
}

function Loading() {
  return (
    <p className="text-xs text-muted-foreground py-4 text-center">
      جاري التحميل…
    </p>
  );
}
