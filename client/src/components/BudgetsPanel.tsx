import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { put } from "@/lib/offline/db";
import { useOffline } from "@/lib/offline/OfflineContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Tx = {
  accountType?: string;
  amount?: string | number;
  lifecycleStatus?: string;
  isReversed?: boolean;
};

type Props = {
  transactionsData?: Tx[];
  currency: string;
};

function actualFor(txList: Tx[] | undefined, accountType: string): number {
  return (txList || []).reduce((sum, tx) => {
    if (tx.lifecycleStatus !== "approved" || tx.isReversed) return sum;
    if (tx.accountType !== accountType) return sum;
    return sum + parseFloat(String(tx.amount || 0));
  }, 0);
}

function pct(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

function barColor(pctValue: number, isExpense: boolean): string {
  if (pctValue < 90) return "bg-emerald-500";
  if (pctValue <= 105) return isExpense ? "bg-amber-500" : "bg-emerald-500";
  return "bg-rose-500";
}

export default function BudgetsPanel({ transactionsData, currency }: Props) {
  const { isOnline } = useOffline();
  const {
    data: budgets,
    refetch,
    isLoading,
  } = trpc.accounting.getBudgets.useQuery();
  const saveBudgetMutation = trpc.accounting.saveBudget.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة خطة الميزانية بنجاح");
      setDialogOpen(false);
      setForm({
        periodName: "",
        targetRevenue: "",
        targetExpense: "",
        notes: "",
      });
      refetch();
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    periodName: "",
    targetRevenue: "",
    targetExpense: "",
    notes: "",
  });

  const actualRevenue = actualFor(transactionsData, "revenue");
  const actualExpense = actualFor(transactionsData, "expense");

  const handleSave = async () => {
    if (!form.periodName.trim() || !form.targetRevenue || !form.targetExpense) {
      toast.error("الرجاء إدخال اسم الفترة وقيم المستهدف (إيرادات ومصروفات)");
      return;
    }
    if (!isOnline) {
      try {
        await put("budgets", {
          id: -Date.now(),
          periodName: form.periodName.trim(),
          targetRevenue: form.targetRevenue,
          targetExpense: form.targetExpense,
          notes: form.notes.trim() || null,
          createdAt: new Date().toISOString(),
        });
        toast.success(
          "حُفظت الخطة محلياً (وضع آفلداين) — ستتزامن تلقائياً عند عودة الاتصال"
        );
        setDialogOpen(false);
        setForm({
          periodName: "",
          targetRevenue: "",
          targetExpense: "",
          notes: "",
        });
        refetch();
      } catch (e: any) {
        toast.error("فشل الحفظ المحلي: " + (e?.message || "خطأ غير معروف"));
      }
      return;
    }
    saveBudgetMutation.mutate({
      periodName: form.periodName.trim(),
      targetRevenue: form.targetRevenue,
      targetExpense: form.targetExpense,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <Card className="border-[#e8c9a0] bg-[#faf5ed] shadow-sm">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-[#f0dfc8]">
        <CardTitle className="flex items-center gap-2 text-[#5c3d1e] text-xs font-bold">
          <Target className="w-4 h-4 text-[#b87945]" /> الميزانيات: الخطة مقابل
          الفعلي
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          className="h-7 text-[10px] bg-white border-[#b87945] text-[#5c3d1e] hover:bg-[#f5ece0]"
        >
          <Plus className="w-3.5 h-3.5 ml-1" /> إضافة خطة
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {isLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#b87945]" /> جاري
            تحميل خطط الميزانية...
          </div>
        ) : !budgets || budgets.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-slate-500">
            لا توجد خطط ميزانية بعد — أضف خطة لمراقبة الأداء المالي مقابل
            الأهداف. الأرقام الفعلية تحسب من الحركات المعتمدة.
          </p>
        ) : (
          budgets.map((b: any) => {
            const revPct = pct(
              actualRevenue,
              parseFloat(b.targetRevenue || "0")
            );
            const expPct = pct(
              actualExpense,
              parseFloat(b.targetExpense || "0")
            );
            return (
              <div
                key={b.id}
                className="p-3.5 border rounded-xl bg-white shadow-sm space-y-2.5"
              >
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">
                    {b.periodName}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono bg-[#faf5ed]"
                  >
                    {new Date(b.createdAt).toLocaleDateString("ar-YE")}
                  </Badge>
                </div>
                {b.notes ? (
                  <p className="text-[10.5px] text-slate-500">{b.notes}</p>
                ) : null}
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-emerald-700 font-bold">
                        الإيرادات الفعلية / المستهدفة
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {actualRevenue.toLocaleString()} /{" "}
                        {parseFloat(b.targetRevenue || "0").toLocaleString()}{" "}
                        {currency} ({revPct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor(revPct, false)}`}
                        style={{ width: `${Math.min(100, revPct)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-rose-700 font-bold">
                        المصروفات الفعلية / المستهدفة
                      </span>
                      <span className="font-mono font-bold text-rose-700">
                        {actualExpense.toLocaleString()} /{" "}
                        {parseFloat(b.targetExpense || "0").toLocaleString()}{" "}
                        {currency} ({expPct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor(expPct, true)}`}
                        style={{ width: `${Math.min(100, expPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800">
              إضافة خطة ميزانية
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px]">
                اسم الفترة (مثال: ميزانية الربع الأول 2026)
              </Label>
              <Input
                value={form.periodName}
                onChange={e => setForm({ ...form, periodName: e.target.value })}
                placeholder="مثال: ميزانية 2026"
                className="h-8 bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">الإيرادات المستهدفة</Label>
                <Input
                  type="number"
                  value={form.targetRevenue}
                  onChange={e =>
                    setForm({ ...form, targetRevenue: e.target.value })
                  }
                  placeholder="0"
                  className="h-8 font-mono bg-slate-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">المصروفات المستهدفة</Label>
                <Input
                  type="number"
                  value={form.targetExpense}
                  onChange={e =>
                    setForm({ ...form, targetExpense: e.target.value })
                  }
                  placeholder="0"
                  className="h-8 font-mono bg-slate-50"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">ملاحظات (اختياري)</Label>
              <Input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="أهداف وملاحظات الفترة..."
                className="h-8 bg-slate-50"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-8 text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveBudgetMutation.isPending}
              className="h-8 text-xs bg-[#b87945] hover:bg-[#a06838] text-white font-bold"
            >
              {saveBudgetMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
              ) : (
                <Plus className="w-3.5 h-3.5 ml-1" />
              )}
              حفظ الخطة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
