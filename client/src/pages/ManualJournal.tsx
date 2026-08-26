import { useMemo, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { trpc } from "@/lib/trpc";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Trash2,
  Scale,
  Lightbulb,
  History,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Line {
  key: number;
  accountId: number | "";
  type: "debit" | "credit";
  amount: string;
  narration: string;
}

function fmt(n: number): string {
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ر.ي`;
}

export default function ManualJournal() {
  const utils = trpc.useUtils();
  const [narration, setNarration] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([
    {
      key: Date.now(),
      accountId: "",
      type: "debit",
      amount: "",
      narration: "",
    },
  ]);

  const { data: accounts } = trpc.modules.accounts.list.useQuery(undefined, {
    placeholderData: (p: any) => p,
  });
  const { data: branches } = trpc.modules.branches.list.useQuery(undefined, {
    placeholderData: (p: any) => p,
  });
  const [branchId, setBranchId] = useState<number | "">("");
  const { data: smart } = trpc.accounting.getSmartSuggestions.useQuery(
    { query: narration || undefined },
    { placeholderData: (p: any) => p }
  );

  const createEntry = trpc.accounting.createManualJournalEntry.useMutation({
    onSuccess: (je: any) => {
      toast.success(`تم إنشاء القيد #${je.id} وترحيله للدفتر الموحّد`);
      setNarration("");
      setLines([
        {
          key: Date.now(),
          accountId: "",
          type: "debit",
          amount: "",
          narration: "",
        },
      ]);
      utils.modules.journal.list.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر إنشاء القيد"),
  });

  const accMap = useMemo(() => {
    const m = new Map<number, any>();
    (accounts ?? []).forEach((a: any) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const addLine = () =>
    setLines(prev => [
      ...prev,
      {
        key: Date.now() + prev.length,
        accountId: "",
        type: prev.length % 2 === 0 ? "debit" : "credit",
        amount: "",
        narration: "",
      },
    ]);
  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: number) =>
    setLines(prev => prev.filter(l => l.key !== key));

  const totalDebit = lines
    .filter(l => l.type === "debit")
    .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const totalCredit = lines
    .filter(l => l.type === "credit")
    .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const suggestions = (smart?.suggestedAccounts ?? []) as any[];
  const recent = (smart?.recentNarrations ?? []) as string[];
  const insights = (smart?.insights ?? []) as string[];

  const submit = () => {
    if (!narration.trim()) {
      toast.error("أدخل بيان القيد");
      return;
    }
    if (lines.some(l => !l.accountId || !(parseFloat(l.amount) > 0))) {
      toast.error("تأكد من اكتمال كل الحركات (حساب + مبلغ)");
      return;
    }
    if (!balanced) {
      toast.error("القيد غير متوازن: المدين يجب أن يساوي الدائن");
      return;
    }
    createEntry.mutate({
      narration,
      date,
      branchId: branchId === "" ? undefined : branchId,
      lines: lines.map(l => ({
        accountId: Number(l.accountId),
        type: l.type,
        amount: String(parseFloat(l.amount)),
        narration: l.narration || undefined,
      })),
    });
  };

  return (
    <div className="min-h-screen flex">
      <AppSidebar />
      <main className="flex-1 bg-slate-50">
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                قيد محاسبي يدوي ذكي
              </h1>
              <p className="text-sm text-slate-500">
                إنشاء قيود متوازنة مع إكمال تلقائي واقتراحات حسابات مبنية على
                تاريخ العمليات
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
          {/* form */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-500">
                      بيان القيد
                    </label>
                    <Input
                      className="text-[13px]"
                      placeholder="مثال: قيد تسوية إيجار المكتب لشهر..."
                      value={narration}
                      onChange={e => setNarration(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-500">
                      التاريخ
                    </label>
                    <Input
                      type="date"
                      className="text-[13px]"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-500">
                      الفرع
                    </label>
                    <select
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[12px]"
                      value={branchId}
                      onChange={e =>
                        setBranchId(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                    >
                      <option value="">الفرع الرئيسي (تلقائي)</option>
                      {(branches ?? []).map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-700">الحركات</h2>
                  <Button size="sm" variant="outline" onClick={addLine}>
                    <Plus className="h-4 w-4" /> حركة
                  </Button>
                </div>

                <div className="space-y-2">
                  {lines.map(l => (
                    <div
                      key={l.key}
                      className="grid grid-cols-12 gap-2 items-center rounded-xl border border-slate-200 bg-slate-50 p-2"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <select
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[12px] text-slate-700"
                          value={l.accountId}
                          onChange={e =>
                            updateLine(l.key, {
                              accountId: e.target.value
                                ? Number(e.target.value)
                                : "",
                            })
                          }
                        >
                          <option value="">اختر الحساب...</option>
                          {(accounts ?? []).map((a: any) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <select
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[12px]"
                          value={l.type}
                          onChange={e =>
                            updateLine(l.key, {
                              type: e.target.value as "debit" | "credit",
                            })
                          }
                        >
                          <option value="debit">مدين</option>
                          <option value="credit">دائن</option>
                        </select>
                      </div>
                      <div className="col-span-6 sm:col-span-3">
                        <Input
                          className="h-9 text-[12px]"
                          type="number"
                          placeholder="المبلغ"
                          value={l.amount}
                          onChange={e =>
                            updateLine(l.key, { amount: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button onClick={() => removeLine(l.key)}>
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </button>
                      </div>
                      <div className="col-span-12">
                        <Input
                          className="h-8 text-[11px]"
                          placeholder="بيان الحركة (اختياري)"
                          value={l.narration}
                          onChange={e =>
                            updateLine(l.key, { narration: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* balance */}
                <div className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex gap-4 text-[13px]">
                    <span className="text-emerald-700 font-bold">
                      مدين: {fmt(totalDebit)}
                    </span>
                    <span className="text-rose-700 font-bold">
                      دائن: {fmt(totalCredit)}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                      balanced
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {balanced ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> متوازن
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5" /> غير متوازن
                      </>
                    )}
                  </span>
                </div>

                <Button
                  className="h-11 w-full bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={submit}
                  disabled={createEntry.isPending || !balanced}
                >
                  <Scale className="h-4 w-4" />
                  {createEntry.isPending
                    ? "جاري الترحيل..."
                    : "ترحيل القيد للدفتر الموحّد"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* smart panel */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Sparkles className="h-4 w-4" />
                  <h3 className="text-sm font-bold">حسابات مقترحة</h3>
                </div>
                {suggestions.length === 0 ? (
                  <p className="text-[12px] text-slate-400">
                    اكتب بيان القيد لتظهر الحسابات الأنسب تلقائياً.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((a: any) => (
                      <button
                        key={a.id}
                        onClick={() =>
                          setLines(prev => [
                            ...prev,
                            {
                              key: Date.now() + prev.length,
                              accountId: a.id,
                              type: "debit",
                              amount: "",
                              narration: "",
                            },
                          ])
                        }
                        className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        {a.code} · {a.name}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <History className="h-4 w-4" />
                  <h3 className="text-sm font-bold">بيانات سابقة</h3>
                </div>
                {recent.length === 0 ? (
                  <p className="text-[12px] text-slate-400">لا يوجد.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => setNarration(r)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Lightbulb className="h-4 w-4" />
                  <h3 className="text-sm font-bold">رؤى ذكية</h3>
                </div>
                <ul className="space-y-1">
                  {insights.map((ins, i) => (
                    <li
                      key={i}
                      className="rounded-lg bg-amber-50 p-2 text-[12px] text-amber-800"
                    >
                      {ins}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
