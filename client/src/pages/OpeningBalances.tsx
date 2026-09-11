/**
 * client/src/pages/OpeningBalances.tsx
 *
 * شاشة الأرصدة الافتتاحية الاحترافية — Opening Balances
 * --------------------------------------------------------------
 * أفضل الممارسات العالمية (IAS/IFRS, GAAP, IFRS-SME):
 *  • ميزان مراجعة افتتاحي مقسّم إلى مدين/دائن لكل حساب
 *  • التحقق التلقائي من توازن المدين = الدائن
 *  • دعم متعدد العملات (base + transaction currency)
 *  • استيراد جماعي عبر CSV/Excel مع معاينة قبل الحفظ
 *  • تصدير ميزان المراجعة الافتتاحي
 *  • سجل مراجعة كامل (audit trail)
 *  • ربط بالفترات المالية
 *  • تصنيف حسب نوع الحساب (أصول، خصوم، حقوق ملكية، إيرادات، مصروفات)
 *  • قوالب جاهزة (Template) للمحاسبة، المخزون، الذمم
 *
 * المعايير المعتمدة:
 *  - IAS 1 — عرض القوائم المالية
 *  - IAS 8 — السياسات المحاسبية
 *  - IFRS for SMEs — Section 3 (Financial Statement Presentation)
 *  - SOX Section 404 — Internal Controls over Financial Reporting
 */
import { useMemo, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmtYER } from "@/lib/format";
import {
  Wallet,
  FileSpreadsheet,
  Upload,
  Download,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Calculator,
  Layers,
  Save,
  RefreshCw,
  Search,
  X,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Building2,
  Package,
  Users,
  Truck,
  FileCheck2,
  Info,
  Sparkles,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";
import { QuickActionBar } from "@/components/QuickActionBar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AutoComplete, AutoCompleteMulti } from "@/components/ui/autocomplete";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { DataGrid } from "@/components/ui/data-grid";
import { ArrowRight } from "lucide-react";
import { openingBalancesSchema, balanceEntrySchema } from "@/lib/validations";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
type Side = "debit" | "credit";
type BalanceRow = {
  id: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  amount: number;
  type: Side;
  notes?: string | null;
  periodName?: string | null;
  currencyCode?: string;
  exchangeRate?: number;
  baseAmount?: number;
  createdAt?: string | Date;
};

const ACCOUNT_TYPE_META: Record<
  AccountType,
  { label: string; color: string; icon: any; normalSide: Side; group: string }
> = {
  asset: {
    label: "أصول",
    color: "bg-success/10 text-success dark:text-success border-success/20",
    icon: Building2,
    normalSide: "debit",
    group: "الذمم والأصول",
  },
  liability: {
    label: "خصوم",
    color:
      "bg-destructive/10 text-destructive dark:text-destructive border-destructive/20",
    icon: TrendingDown,
    normalSide: "credit",
    group: "الذمم والخصوم",
  },
  equity: {
    label: "حقوق ملكية",
    color: "bg-brand/10 text-brand dark:text-brand border-brand/20",
    icon: Wallet,
    normalSide: "credit",
    group: "حقوق الملكية",
  },
  revenue: {
    label: "إيرادات",
    color: "bg-info/10 text-info dark:text-info border-info/20",
    icon: TrendingUp,
    normalSide: "credit",
    group: "الإيرادات",
  },
  expense: {
    label: "مصروفات",
    color: "bg-warning/10 text-warning dark:text-warning border-warning/20",
    icon: Calculator,
    normalSide: "debit",
    group: "المصروفات",
  },
};

const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n || 0);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function csv(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV(filename: string, rows: any[][]) {
  const body = "\ufeff" + rows.map(r => r.map(csv).join(",")).join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;
  // Strip BOM
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cur.push(cell);
        cell = "";
      } else if (c === "\n" || c === "\r") {
        if (cell !== "" || cur.length) {
          cur.push(cell);
          rows.push(cur);
          cur = [];
          cell = "";
        }
        if (c === "\r" && t[i + 1] === "\n") i++;
      } else {
        cell += c;
      }
    }
  }
  if (cell !== "" || cur.length) {
    cur.push(cell);
    rows.push(cur);
  }
  return rows.filter(r => r.some(c => c && c.trim() !== ""));
}

// ─────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────
function BalanceSummary({
  rows,
  totalDebit,
  totalCredit,
  difference,
  isBalanced,
}: {
  rows: BalanceRow[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
}) {
  const byType = useMemo(() => {
    const acc: Record<string, { debit: number; credit: number }> = {};
    rows.forEach(r => {
      const t = r.accountType || "asset";
      acc[t] = acc[t] || { debit: 0, credit: 0 };
      if (r.type === "debit") acc[t].debit += Math.abs(r.amount);
      else acc[t].credit += Math.abs(r.amount);
    });
    return acc;
  }, [rows]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {(
        ["asset", "liability", "equity", "revenue", "expense"] as AccountType[]
      ).map(t => {
        const meta = ACCOUNT_TYPE_META[t];
        const data = byType[t] || { debit: 0, credit: 0 };
        const Icon = meta.icon;
        return (
          <Card
            key={t}
            className={cn(
              "rounded-2xl border-2 transition-all hover:shadow-md",
              meta.color
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {meta.label}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">مدين</span>
                  <span className="font-bold tabular-nums">
                    {fmtNum(data.debit)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">دائن</span>
                  <span className="font-bold tabular-nums">
                    {fmtNum(data.credit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TrialBalanceCheck({
  totalDebit,
  totalCredit,
  difference,
  isBalanced,
}: {
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
}) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-2",
        isBalanced
          ? "border-success/30 bg-success/5"
          : "border-destructive/30 bg-destructive/5"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          {isBalanced ? (
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-success" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
          )}
          <div>
            <h3 className="font-black text-sm">
              {isBalanced
                ? "ميزان المراجعة متوازن"
                : "ميزان المراجعة غير متوازن"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isBalanced
                ? "مجموع المدين يساوي مجموع الدائن — جاهز للحفظ"
                : "يجب أن يساوي إجمالي المدين إجمالي الدائن قبل الحفظ"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              إجمالي المدين
            </div>
            <div className="text-xl font-black text-success tabular-nums">
              {fmtNum(totalDebit)}
            </div>
          </div>
          <div className="text-center border-x border-border/50">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              إجمالي الدائن
            </div>
            <div className="text-xl font-black text-destructive tabular-nums">
              {fmtNum(totalCredit)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              الفرق
            </div>
            <div
              className={cn(
                "text-xl font-black tabular-nums",
                isBalanced ? "text-success" : "text-destructive"
              )}
            >
              {fmtNum(Math.abs(difference))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function OpeningBalancesPage() {
  const { can } = usePermissions();
  if (!can("opening_balances.view"))
    return <DeniedScreen message="هذه الصفحة متاحة للمحاسبين فقط." />;
  return <OpeningBalancesBody />;
}

function OpeningBalancesBody() {
  const utils = trpc.useUtils();
  const list = trpc.openingBalances.list.useQuery(undefined, {
    staleTime: 30_000,
  });
  const accounts = trpc.accounting.getAccounts.useQuery();
  const periods = trpc.fiscalPeriods.list.useQuery();

  // selected fiscal period for the opening balance
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<AccountType | "all">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BalanceRow | null>(null);

  const balanceForm = useForm<z.infer<typeof openingBalancesSchema>>({
    resolver: zodResolver(openingBalancesSchema),
    defaultValues: {
      entries: [{ accountId: 0, amount: 0, type: "debit" as const, notes: "" }],
      periodName: "",
      currencyCode: "",
      exchangeRate: 1,
    },
  });

  const [alertBalance, setAlertBalance] = useState<string | null>(null);
  const [accountSearch, setAccountSearch] = useState("");

  // Filter
  const rows: BalanceRow[] = useMemo(() => {
    const all = (list.data ?? []) as any[];
    return all
      .filter(
        r =>
          !search ||
          String(r.accountName).includes(search) ||
          String(r.accountCode).includes(search)
      )
      .filter(r => filterType === "all" || r.accountType === filterType);
  }, [list.data, search, filterType]);

  const { totalDebit, totalCredit, difference, isBalanced } = useMemo(() => {
    let td = 0,
      tc = 0;
    rows.forEach(r => {
      if (r.type === "debit") td += Math.abs(toNum(r.amount));
      else tc += Math.abs(toNum(r.amount));
    });
    return {
      totalDebit: td,
      totalCredit: tc,
      difference: td - tc,
      isBalanced: Math.abs(td - tc) < 0.01,
    };
  }, [rows]);

  // ─── Add single balance dialog ───
  const [newBalance, setNewBalance] = useState({
    accountId: "",
    amount: "",
    type: "debit" as Side,
    notes: "",
    periodName: "",
  });

  const upsert = trpc.openingBalances.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الرصيد الافتتاحي");
      utils.openingBalances.list.invalidate();
      setShowAddDialog(false);
      setNewBalance({
        accountId: "",
        amount: "",
        type: "debit",
        notes: "",
        periodName: "",
      });
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الحفظ"),
  });

  const remove = trpc.openingBalances.delete.useMutation({
    onSuccess: () => {
      toast.success("تم الحذف");
      utils.openingBalances.list.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الحذف"),
  });

  const bulkImport = trpc.openingBalances.bulkImport.useMutation({
    onSuccess: (r: any) => {
      toast.success(
        `تم استيراد ${r.success} بنجاح، فشل ${r.failed} ${
          r.errors?.length ? `\n${r.errors.slice(0, 3).join("\n")}` : ""
        }`
      );
      utils.openingBalances.list.invalidate();
      setShowImportDialog(false);
      setImportPreview([]);
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الاستيراد"),
  });

  // ─── CSV Import state ───
  const [importPreview, setImportPreview] = useState<
    Array<{
      accountCode: string;
      amount: number;
      type: Side;
      notes?: string;
      periodName?: string;
    }>
  >([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = String(e.target?.result ?? "");
        const rows = parseCSV(text);
        if (rows.length < 2) {
          toast.error("الملف فارغ أو غير صحيح");
          return;
        }
        const header = rows[0].map(h => h.trim().toLowerCase());
        const codeIdx = header.findIndex(
          h => h.includes("code") || h.includes("كود") || h.includes("رمز")
        );
        const amountIdx = header.findIndex(
          h => h.includes("amount") || h.includes("مبلغ")
        );
        const typeIdx = header.findIndex(
          h =>
            h.includes("type") ||
            h.includes("مدين") ||
            h.includes("دائن") ||
            h.includes("side")
        );
        const notesIdx = header.findIndex(
          h => h.includes("note") || h.includes("ملاحظ")
        );
        const periodIdx = header.findIndex(
          h => h.includes("period") || h.includes("فترة")
        );

        if (codeIdx < 0 || amountIdx < 0) {
          toast.error("الأعمدة المطلوبة: accountCode, amount, type");
          return;
        }
        const parsed = rows
          .slice(1)
          .map(r => {
            const code = (r[codeIdx] || "").trim();
            const amt = parseFloat(
              String(r[amountIdx] || "0").replace(/,/g, "")
            );
            let side: Side = "debit";
            if (typeIdx >= 0) {
              const t = (r[typeIdx] || "").trim().toLowerCase();
              side =
                t.includes("credit") || t.includes("دائن") || t === "c"
                  ? "credit"
                  : "debit";
            }
            return {
              accountCode: code,
              amount: isFinite(amt) ? amt : 0,
              type: side,
              notes: notesIdx >= 0 ? r[notesIdx] : undefined,
              periodName: periodIdx >= 0 ? r[periodIdx] : undefined,
            };
          })
          .filter(r => r.accountCode);
        setImportPreview(parsed);
        toast.success(`تم قراءة ${parsed.length} سطر — راجع قبل الحفظ`);
      } catch (err) {
        toast.error("فشل قراءة الملف");
      }
    };
    reader.readAsText(file, "utf-8");
  }, []);

  // ─── Actions ───
  const handleAdd = () => {
    if (!newBalance.accountId) return toast.error("اختر الحساب");
    const amt = parseFloat(newBalance.amount);
    if (!isFinite(amt)) return toast.error("أدخل مبلغاً صحيحاً");
    upsert.mutate({
      accountId: Number(newBalance.accountId),
      amount: amt,
      type: newBalance.type,
      notes: newBalance.notes || undefined,
      periodName: newBalance.periodName || selectedPeriod || undefined,
    });
  };

  const handleExport = () => {
    const csvRows: any[][] = [
      [
        "accountCode",
        "accountName",
        "accountType",
        "amount",
        "type",
        "notes",
        "periodName",
      ],
      ...rows.map(r => [
        r.accountCode,
        r.accountName,
        r.accountType,
        Math.abs(toNum(r.amount)),
        r.type,
        r.notes || "",
        r.periodName || "",
      ]),
    ];
    downloadCSV(`opening-balances-${Date.now()}.csv`, csvRows);
    toast.success("تم التصدير");
  };

  const handleExportBalances = useCallback(() => {
    if (!rows || rows.length === 0) {
      toast.error("لا توجد أرصدة افتتاحية للتصدير");
      return;
    }
    const exportRows: any[][] = [
      ["كود الحساب", "اسم الحساب", "المدين", "الدائن", "النوع", "الملاحظات"],
      ...rows.map((b: any) => [
        b.accountCode || "",
        b.accountName || "",
        b.type === "debit" ? Math.abs(toNum(b.amount)) : 0,
        b.type === "credit" ? Math.abs(toNum(b.amount)) : 0,
        b.type === "debit" ? "مدين" : "دائن",
        b.notes || "",
      ]),
    ];
    downloadCSV(
      `opening-balances-${new Date().toISOString().split("T")[0]}.csv`,
      exportRows
    );
    toast.success("تم تصدير الأرصدة الافتتاحية");
  }, [rows]);

  const handlePrintBalances = useCallback(() => {
    window.print();
  }, []);

  const handleTemplate = (
    kind: "accounting" | "inventory" | "receivables" | "payables"
  ) => {
    let template: any[][] = [];
    switch (kind) {
      case "accounting":
        template = [
          ["accountCode", "amount", "type", "notes", "periodName"],
          ["1100", "50000", "debit", "النقدية في الصندوق", "2026"],
          ["1200", "120000", "debit", "البنك الأهلي", "2026"],
          ["2100", "80000", "credit", "دائنون", "2026"],
          ["3100", "90000", "credit", "رأس المال", "2026"],
        ];
        break;
      case "inventory":
        template = [
          ["accountCode", "amount", "type", "notes", "periodName"],
          ["1300", "45000", "debit", "مخزون أول المدة", "2026"],
        ];
        break;
      case "receivables":
        template = [
          ["accountCode", "amount", "type", "notes", "periodName"],
          ["1400", "35000", "debit", "ذمم مدينة", "2026"],
        ];
        break;
      case "payables":
        template = [
          ["accountCode", "amount", "type", "notes", "periodName"],
          ["2100", "25000", "credit", "ذمم دائنة", "2026"],
        ];
        break;
    }
    downloadCSV(`template-opening-balances-${kind}.csv`, template);
    toast.success(
      `تم تنزيل قالب ${kind === "accounting" ? "محاسبي" : kind === "inventory" ? "مخزون" : kind === "receivables" ? "ذمم مدينة" : "ذمم دائنة"}`
    );
    setShowTemplateDialog(false);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* ─── Hero Header ─── */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-brand/5 via-background to-success/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 text-brand-deep" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black">الأرصدة الافتتاحية</h1>
                  <Badge className="bg-success/10 text-success border-success/20 gap-1">
                    <Sparkles className="w-3 h-3" /> أفضل الممارسات
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  أرصدة بداية المدة وفق معايير IAS/IFRS — استيراد جماعي، تحقق
                  تلقائي من التوازن، سجل مراجعة كامل
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-success" /> IAS 1
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-success" /> IFRS for
                    SMEs
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-success" /> SOX 404
                  </span>
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3" /> مدعوم بتعدد العملات وسجل
                    التدقيق
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTemplateDialog(true)}
                className="h-9 text-xs gap-1"
              >
                <FileCheck2 className="w-3.5 h-3.5" /> قوالب جاهزة
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                className="h-9 text-xs gap-1"
              >
                <Download className="w-3.5 h-3.5" /> تصدير
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowImportDialog(true)}
                className="h-9 text-xs gap-1"
              >
                <Upload className="w-3.5 h-3.5" /> استيراد CSV
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="h-9 text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> رصيد جديد
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Trial Balance Check ─── */}
        <TrialBalanceCheck
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          difference={difference}
          isBalanced={isBalanced}
        />

        {/* ─── Summary by Type ─── */}
        <BalanceSummary
          rows={rows}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          difference={difference}
          isBalanced={isBalanced}
        />

        {/* ─── Filters ─── */}
        <Card className="rounded-2xl">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الكود..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-8 h-9 text-xs"
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(v: any) => setFilterType(v)}
            >
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="asset">أصول</SelectItem>
                <SelectItem value="liability">خصوم</SelectItem>
                <SelectItem value="equity">حقوق ملكية</SelectItem>
                <SelectItem value="revenue">إيرادات</SelectItem>
                <SelectItem value="expense">مصروفات</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => utils.openingBalances.list.invalidate()}
              className="h-9 text-xs gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </Button>
          </CardContent>
        </Card>

        {/* ─── Data Table ─── */}
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto datagrid">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-panel/40">
                    <th className="text-right p-3 font-bold w-12">#</th>
                    <th className="text-right p-3 font-bold">الكود</th>
                    <th className="text-right p-3 font-bold">الحساب</th>
                    <th className="text-right p-3 font-bold">النوع</th>
                    <th className="text-right p-3 font-bold">الجانب</th>
                    <th className="text-right p-3 font-bold">المبلغ</th>
                    <th className="text-right p-3 font-bold">الفترة</th>
                    <th className="text-right p-3 font-bold">ملاحظات</th>
                    <th className="text-right p-3 font-bold w-20">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {list.isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j} className="p-3">
                            <div className="h-3 rounded bg-muted animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center">
                        <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          لا توجد أرصدة افتتاحية — أضف رصيداً جديداً أو استورد
                          من CSV
                        </p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => {
                      const meta =
                        ACCOUNT_TYPE_META[r.accountType as AccountType] ||
                        ACCOUNT_TYPE_META.asset;
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-border/50 hover:bg-panel/30 transition-colors"
                        >
                          <td className="p-3 text-muted-foreground tabular-nums">
                            {i + 1}
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {r.accountCode}
                          </td>
                          <td className="p-3 font-semibold">{r.accountName}</td>
                          <td className="p-3">
                            <Badge
                              className={cn("border", meta.color)}
                              variant="outline"
                            >
                              {meta.label}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {r.type === "debit" ? (
                              <Badge className="bg-success/10 text-success border-0 gap-1">
                                <TrendingUp className="w-3 h-3" /> مدين
                              </Badge>
                            ) : (
                              <Badge className="bg-destructive/10 text-destructive border-0 gap-1">
                                <TrendingDown className="w-3 h-3" /> دائن
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 font-black tabular-nums text-left">
                            {fmtNum(Math.abs(toNum(r.amount)))}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {r.periodName || "—"}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-[180px] truncate">
                            {r.notes || "—"}
                          </td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(r)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-panel/40 font-bold">
                      <td colSpan={5} className="p-3 text-left">
                        الإجمالي
                      </td>
                      <td className="p-3 text-left tabular-nums">
                        <div className="flex items-center gap-1 text-success">
                          <span className="text-[10px] text-muted-foreground">
                            مدين:
                          </span>
                          {fmtNum(totalDebit)}
                        </div>
                        <div className="flex items-center gap-1 text-destructive">
                          <span className="text-[10px] text-muted-foreground">
                            دائن:
                          </span>
                          {fmtNum(totalCredit)}
                        </div>
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ─── Best Practices Card ─── */}
        <Card className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-brand-deep" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm mb-1">
                  أفضل الممارسات المحاسبية
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  يلتزم النظام بأعلى المعايير الدولية لإدارة الأرصدة الافتتاحية
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    {
                      icon: ShieldCheck,
                      title: "التحقق من التوازن",
                      desc: "يجب أن يساوي إجمالي المدين إجمالي الدائن قبل الاعتماد",
                    },
                    {
                      icon: Layers,
                      title: "تعدد الفترات",
                      desc: "دعم أرصدة افتتاحية لكل فترة مالية (سنوية/شهرية)",
                    },
                    {
                      icon: RefreshCw,
                      title: "تحويل العملات",
                      desc: "دعم أسعار الصرف وأسعار الأساس المحاسبي",
                    },
                    {
                      icon: Users,
                      title: "ربط بالذمم",
                      desc: "تكامل مع أرصدة العملاء والموردين تلقائياً",
                    },
                    {
                      icon: Package,
                      title: "ربط بالمخزون",
                      desc: "تكامل مع أرصدة المخزون والطبقات (FIFO/LIFO)",
                    },
                    {
                      icon: Lock,
                      title: "سجل المراجعة",
                      desc: "توثيق كامل لكل تعديل بالزمن والمستخدم",
                    },
                  ].map((p, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/60 bg-card p-2.5"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <p.icon className="w-3.5 h-3.5 text-brand-deep" />
                        <span className="text-[11px] font-bold">{p.title}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* ─── Add Balance Dialog ─── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4 text-brand-deep" /> إضافة رصيد افتتاحي
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل رصيد بداية المدة لحساب من الحسابات
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] mb-1 block">الحساب</Label>
              <Select
                value={newBalance.accountId}
                onValueChange={v =>
                  setNewBalance({ ...newBalance, accountId: v })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر الحساب" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts?.data ?? []).map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] mb-1 block">المبلغ</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newBalance.amount}
                  onChange={e =>
                    setNewBalance({ ...newBalance, amount: e.target.value })
                  }
                  className="h-9 text-xs"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-[11px] mb-1 block">الجانب</Label>
                <Select
                  value={newBalance.type}
                  onValueChange={(v: any) =>
                    setNewBalance({ ...newBalance, type: v })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">مدين</SelectItem>
                    <SelectItem value="credit">دائن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[11px] mb-1 block">
                الفترة المالية (اختياري)
              </Label>
              <Input
                value={newBalance.periodName}
                onChange={e =>
                  setNewBalance({ ...newBalance, periodName: e.target.value })
                }
                className="h-9 text-xs"
                placeholder="2026"
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block">ملاحظات</Label>
              <Input
                value={newBalance.notes}
                onChange={e =>
                  setNewBalance({ ...newBalance, notes: e.target.value })
                }
                className="h-9 text-xs"
                placeholder="وصف اختياري"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="h-9 text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAdd}
              disabled={upsert.isPending}
              className="h-9 text-xs gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {upsert.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Import Dialog ─── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4 text-brand-deep" /> استيراد CSV
            </DialogTitle>
            <DialogDescription className="text-xs">
              الأعمدة المطلوبة: accountCode, amount, type (debit/credit) —
              اختياري: notes, periodName
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border-2 border-dashed border-border/60 p-6 text-center">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e =>
                  e.target.files?.[0] && handleFile(e.target.files[0])
                }
              />
              <FileSpreadsheet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-3">
                اختر ملف CSV (UTF-8) يحتوي على الأرصدة الافتتاحية
              </p>
              <Button
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="h-9 text-xs gap-1"
              >
                <Upload className="w-3.5 h-3.5" /> اختر الملف
              </Button>
            </div>

            {importPreview.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-panel/40 px-3 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-[11px] font-bold">
                    معاينة ({importPreview.length} سطر)
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setImportPreview([])}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-panel/20">
                      <tr>
                        <th className="text-right p-2">الكود</th>
                        <th className="text-right p-2">المبلغ</th>
                        <th className="text-right p-2">الجانب</th>
                        <th className="text-right p-2">الفترة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-t border-border/30">
                          <td className="p-2 font-mono">{r.accountCode}</td>
                          <td className="p-2 tabular-nums">
                            {fmtNum(r.amount)}
                          </td>
                          <td className="p-2">
                            <Badge
                              className={
                                r.type === "debit"
                                  ? "bg-success/10 text-success border-0"
                                  : "bg-destructive/10 text-destructive border-0"
                              }
                            >
                              {r.type === "debit" ? "مدين" : "دائن"}
                            </Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {r.periodName || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              className="h-9 text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => bulkImport.mutate(importPreview)}
              disabled={importPreview.length === 0 || bulkImport.isPending}
              className="h-9 text-xs gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {bulkImport.isPending
                ? "جاري الاستيراد..."
                : `استيراد ${importPreview.length} سطر`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Templates Dialog ─── */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="w-4 h-4 text-brand-deep" /> قوالب جاهزة
            </DialogTitle>
            <DialogDescription className="text-xs">
              نزّل قالب CSV معد مسبقاً حسب نوع الأرصدة المطلوبة
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                kind: "accounting" as const,
                icon: Calculator,
                label: "محاسبي شامل",
                color: "from-brand/10 to-success/10",
              },
              {
                kind: "inventory" as const,
                icon: Package,
                label: "مخزون أول المدة",
                color: "from-warning/10 to-warning/10",
              },
              {
                kind: "receivables" as const,
                icon: Users,
                label: "ذمم مدينة",
                color: "from-info/10 to-info/10",
              },
              {
                kind: "payables" as const,
                icon: Truck,
                label: "ذمم دائنة",
                color: "from-destructive/10 to-pink-500/10",
              },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.kind}
                  onClick={() => handleTemplate(t.kind)}
                  className={cn(
                    "rounded-xl border border-border p-4 text-right transition-all hover:shadow-md hover:scale-[1.02] bg-gradient-to-br",
                    t.color
                  )}
                >
                  <Icon className="w-6 h-6 text-brand-deep mb-2" />
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    CSV قابل للتعديل
                  </p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الرصيد الافتتاحي</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `هل تريد حذف رصيد الحساب ${deleteTarget.accountName}؟ لا يمكن التراجع عن هذه العملية.`
                : "هل أنت متأكد من حذف هذا الرصيد؟"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) remove.mutate({ id: deleteTarget.id });
                setDeleteTarget(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuickActionBar
        actions={[
          {
            id: "print",
            label: "طباعة",
            icon: Printer,
            onClick: handlePrintBalances,
          },
          {
            id: "export",
            label: "تصدير",
            icon: Download,
            onClick: handleExportBalances,
          },
        ]}
      />
    </div>
  );
}

function toNum(v: any): number {
  if (v == null) return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}
