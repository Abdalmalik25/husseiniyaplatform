import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { goLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { downloadCsv } from "@/lib/csv";
import { useOffline } from "@/lib/offline/OfflineContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Building2,
  Plus,
  Search,
  BookOpen,
  BarChart3,
  Save,
  Check,
  FileSpreadsheet,
  FileText,
  Sparkles,
  PieChart,
  Loader2,
  Filter,
  Layers,
  History,
  User,
  Power,
  PowerOff,
  Network,
  ShieldAlert,
  GripVertical,
  Upload,
  ClipboardCopy,
  Scale,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import BudgetsPanel from "@/components/BudgetsPanel";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { put } from "@/lib/offline/db";

type ImportRow = {
  accountId: number;
  amount: string;
  type: "debit" | "credit";
  transactionDate: string;
  narration?: string;
};

function parseImportCsv(
  text: string,
  accountsData: any
): { parsed: ImportRow[]; skipped: { line: number; reason: string }[] } {
  const skipped: { line: number; reason: string }[] = [];
  const parsed: ImportRow[] = [];
  const lines = String(text || "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (!lines.length) return { parsed, skipped };

  const splitLine = (ln: string) => {
    const cells: string[] = [];
    let cur = "",
      inQ = false;
    for (const ch of ln) {
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if ((ch === "," || ch === ";" || ch === "\t") && !inQ) {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  };

  const first = splitLine(lines[0]);
  const hasHeader = first.some(c =>
    /التاريخ|date|الحساب|القيمة|المبلغ|amount|البيان|narration|الكود|code|النوع/i.test(
      c
    )
  );
  const findCol = (names: string, fallback: number) => {
    const i = first.findIndex(c =>
      names
        .split("|")
        .some(k => String(c).toLowerCase().includes(k.toLowerCase()))
    );
    return i >= 0 ? i : fallback;
  };
  const ciDate = hasHeader ? findCol("التاريخ|date", 0) : 0;
  const ciAccount = hasHeader ? findCol("الحساب|account", 1) : 1;
  const ciCode = hasHeader ? findCol("الكود|code", 2) : 2;
  const ciAmount = hasHeader ? findCol("المبلغ|القيمة|amount|قيمة", 3) : 3;
  const ciNarration = hasHeader ? findCol("البيان|narration|الوصف", 4) : 4;
  const ciType = hasHeader ? findCol("النوع|type", 5) : 5;

  const startIdx = hasHeader ? 1 : 0;
  const normAr = (s: string) => s.replace(/\s+/g, " ").trim();
  const acctByCode = new Map<string, any>();
  for (const a of accountsData || []) acctByCode.set(normAr(String(a.code)), a);

  const parseDate = (raw: string): string | null => {
    const s = raw.trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m) {
      const y = m[3].length === 2 ? "20" + m[3] : m[3];
      return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
    const t = new Date(s);
    return isNaN(t.getTime()) ? null : t.toISOString().split("T")[0];
  };

  const parseAmount = (
    raw: string
  ): { amt: number; negative: boolean } | null => {
    const s = raw.trim().replace(/,/g, "").replace(/\s+/g, "");
    if (!s) return null;
    const v = parseFloat(s);
    return isNaN(v) ? null : { amt: Math.abs(v), negative: v < 0 };
  };

  lines.slice(startIdx).forEach((ln, i) => {
    const lineNo = startIdx + i + 1;
    const cells = splitLine(ln);
    if (cells.every(c => !c)) return;

    const date = parseDate(cells[ciDate] || "");
    if (!date) {
      skipped.push({
        line: lineNo,
        reason: "تاريخ غير صالح: " + (cells[ciDate] || "فارغ"),
      });
      return;
    }

    const codeKey = normAr(cells[ciCode] || "");
    const nameKey = normAr(cells[ciAccount] || "");
    let acc: any = codeKey ? acctByCode.get(codeKey) : null;
    if (!acc && codeKey) {
      const mc = (accountsData || []).filter(
        (a: any) => normAr(String(a.code)) === codeKey
      );
      if (mc.length === 1) acc = mc[0];
      else if (mc.length > 1) {
        skipped.push({
          line: lineNo,
          reason: "كود الحساب «" + codeKey + "» غير فريد",
        });
        return;
      }
    }
    if (!acc && nameKey && codeKey !== nameKey) {
      const mn = (accountsData || []).filter(
        (a: any) => normAr(String(a.name)) === nameKey
      );
      if (mn.length === 1) acc = mn[0];
      else if (mn.length > 1) {
        skipped.push({
          line: lineNo,
          reason: "اسم الحساب «" + nameKey + "» غير فريد",
        });
        return;
      }
    }
    if (!acc) {
      skipped.push({
        line: lineNo,
        reason: "الحساب غير موجود في الدليل: " + (codeKey || nameKey || "فارغ"),
      });
      return;
    }

    const amtRes = parseAmount(cells[ciAmount] || "");
    if (!amtRes || amtRes.amt <= 0) {
      skipped.push({
        line: lineNo,
        reason: "مبلغ غير صالح: " + (cells[ciAmount] || "فارغ"),
      });
      return;
    }

    const typeRaw = String(cells[ciType] || "")
      .trim()
      .toLowerCase();
    let type: "debit" | "credit" = amtRes.negative ? "credit" : "debit";
    if (typeRaw.startsWith("c") || typeRaw === "دائن") type = "credit";
    else if (typeRaw.startsWith("d") || typeRaw === "مدين") type = "debit";

    parsed.push({
      accountId: acc.id,
      amount: String(amtRes.amt),
      type,
      transactionDate: date,
      narration: (cells[ciNarration] || "").trim() || undefined,
    });
  });

  return { parsed, skipped };
}

export default function Home() {
  const { user, isAuthenticated, loading: authLoading, refresh } = useAuth();
  const utils = trpc.useUtils();
  const { isOnline } = useOffline();

  const [activeTab, setActiveTab] = useState<
    "entry" | "accounts" | "reports" | "audit" | "analytics" | "profile"
  >("entry");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Defer non-critical queries (audit log, branch comparison, AI advisor) so the
  // first paint only waits for the core batch (settings/accounts/tx/summary).
  const [deferHeavyQueries, setDeferHeavyQueries] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importLifecycle, setImportLifecycle] = useState<
    "saved" | "approved" | "sent"
  >("approved");
  const [importResult, setImportResult] = useState<{
    total: number;
    imported: number;
    skipped: { line: number; reason: string }[];
  } | null>(null);
  const [obOpen, setObOpen] = useState(false);
  const [obPeriod, setObPeriod] = useState("");
  const [obRows, setObRows] = useState<
    {
      accountId: number;
      code: string;
      name: string;
      amount: string;
      type: string;
    }[]
  >([]);
  const [obLoading, setObLoading] = useState(false);
  const saveOpeningBalancesMutation =
    trpc.accounting.saveOpeningBalances.useMutation({
      onSuccess: () => {
        toast.success("تم حفظ الأرصدة الافتتاحية بنجاح");
        setObOpen(false);
      },
      onError: (e: any) =>
        toast.error("فشل الحفظ: " + (e?.message || "خطأ غير معروف")),
    });
  useEffect(() => {
    const t = setTimeout(() => setDeferHeavyQueries(true), 700);
    return () => clearTimeout(t);
  }, []);

  // Queries
  const { data: settingsData } = trpc.accounting.getSettings.useQuery();
  const {
    data: accountsData,
    refetch: refetchAccounts,
    isLoading: loadingAccounts,
  } = trpc.accounting.getAccounts.useQuery();
  const {
    data: transactionsData,
    refetch: refetchTransactions,
    isLoading: loadingTx,
  } = trpc.accounting.getTransactions.useQuery(undefined, {
    staleTime: 60_000,
  });
  const {
    data: summaryData,
    refetch: refetchSummary,
    isLoading: loadingSummary,
  } = trpc.accounting.getDashboardSummary.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: commercialStats, isLoading: commercialLoading } =
    trpc.commercial.getStats.useQuery(undefined, { staleTime: 60_000 });
  const lowStockAlerts = commercialStats?.lowStock ?? [];
  const topCustomerDebts = commercialStats?.topCustomers ?? [];
  const hasCommercialAlerts =
    lowStockAlerts.length > 0 || topCustomerDebts.length > 0;
  const { data: activityLogsData, refetch: refetchActivityLogs } =
    trpc.auth.getActivityLogs.useQuery(undefined, {
      enabled: deferHeavyQueries,
    });
  const { data: branchComparisonData } =
    trpc.accounting.getBranchPerformanceComparison.useQuery(undefined, {
      enabled: deferHeavyQueries,
    });
  const {
    data: aiAdvisorData,
    refetch: refetchAiAdvisor,
    isLoading: aiLoading,
  } = trpc.accounting.getAiFinancialAdvisorAnalysis.useQuery(undefined, {
    enabled: deferHeavyQueries,
  });

  // Local States
  const [instName, setInstName] = useState(
    "ALHUSAINIA | مركز العمليات المالية"
  );
  const [currency, setCurrency] = useState("ريال يمني (YER)");
  const [batchRows, setBatchRows] = useState<
    Record<number, { amount: string; narration: string }>
  >({});
  const [accountQuery, setAccountQuery] = useState("");
  const [accountViewMode, setAccountViewMode] = useState<"tree" | "list">(
    "tree"
  );
  const [draggedAccountId, setDraggedAccountId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null); // For visual highlight

  // Confirmation Modal for Drag & Drop Move
  const [pendingMove, setPendingMove] = useState<{
    accountId: number;
    newParentAccountId: number | null;
    accountName: string;
    parentName: string;
  } | null>(null);

  // Chart of Accounts Management States
  const [newAccCode, setNewAccCode] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccCategory, setNewAccCategory] = useState("asset");

  // Filtering & Sorting States
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [statementAccountId, setStatementAccountId] = useState("all");

  // Quick Single-Entry Widget States
  const [quickAccountId, setQuickAccountId] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickNarration, setQuickNarration] = useState("");
  const [quickDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Period Closing State
  const [closingPeriod, setClosingPeriod] = useState("السنة المالية 2026");
  const [closingDate, setClosingDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [closingPreviewParams, setClosingPreviewParams] = useState<{
    periodName: string;
    asOfDate?: string;
  } | null>(null);
  const closingPreview = trpc.accounting.closing.preview.useQuery(
    {
      periodName: closingPreviewParams?.periodName ?? "السنة المالية 2026",
      asOfDate: closingPreviewParams?.asOfDate,
    },
    { enabled: !!closingPreviewParams }
  );
  const executeClosing = trpc.accounting.closing.execute.useMutation({
    onSuccess: r => {
      toast.success(
        `تم إقفال الدورة بنجاح — ${r.entries} حساباً بإجمالي ${Number(r.total).toLocaleString("en-US")} YER`
      );
      setClosingPreviewParams(null);
    },
    onError: e => toast.error(String(e.message || "فشل الإقفال")),
  });

  // Profile Form States
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [themePref, setThemePref] = useState("light");
  const [emailNotif, setEmailNotif] = useState(true);
  const [whatsappNotif, setWhatsappNotif] = useState(true);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileEmail(user.email || "");
      setThemePref((user as any).themePreference || "light");
      setEmailNotif(Boolean((user as any).emailNotifications));
      setWhatsappNotif(Boolean((user as any).whatsappNotifications));
    }
  }, [user]);

  useEffect(() => {
    if (settingsData) {
      setInstName(settingsData.institutionName);
      setCurrency(settingsData.currency);
    }
  }, [settingsData]);

  // Animated count-up for KPI numbers (premium feel, no layout thrash).
  const [kpiNumbers, setKpiNumbers] = useState<Record<string, number>>({});
  const animationFramesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const frames = animationFramesRef.current;
    const targets: [string, number][] = [
      ["revenue", summaryData?.totalRevenue || 0],
      ["expense", summaryData?.totalExpense || 0],
      ["net", summaryData?.netIncome || 0],
      ["assets", summaryData?.totalAssets || 0],
    ];

    const animateNumber = (key: string, target: number) => {
      // Cancel previous animation for this key
      const prevFrame = animationFramesRef.current.get(key);
      if (prevFrame) cancelAnimationFrame(prevFrame);

      const started = performance.now();
      const duration = 650;

      const tick = (now: number) => {
        const p = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setKpiNumbers(prev => ({
          ...prev,
          [key]: Math.round(
            (prev[key] || 0) + (target - (prev[key] || 0)) * eased
          ),
        }));
        if (p < 1) {
          const frameId = requestAnimationFrame(tick);
          animationFramesRef.current.set(key, frameId);
        } else {
          animationFramesRef.current.delete(key);
        }
      };
      const frameId = requestAnimationFrame(tick);
      animationFramesRef.current.set(key, frameId);
    };

    targets.forEach(([key, target]) => animateNumber(key, target));

    // Cleanup all animations on unmount
    return () => {
      frames.forEach(frameId => cancelAnimationFrame(frameId));
      frames.clear();
    };
  }, [summaryData]);
  const countUp = (key: string, value: number | undefined | null): string =>
    (kpiNumbers[key] !== undefined
      ? kpiNumbers[key]
      : Number(value || 0)
    ).toLocaleString();

  // Mutations
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الملف الشخصي بنجاح");
      if (refresh) refresh();
      refetchActivityLogs();
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`),
  });

  const addBatchTransactionsMutation =
    trpc.accounting.addBatchTransactions.useMutation({
      onSuccess: () => {
        toast.success("تم حفظ واعتماد الحركات بنجاح وتوثيقها في سجل التدقيق.");
        refetchTransactions();
        refetchSummary();
        refetchActivityLogs();
        setBatchRows({});
        setQuickAmount("");
        setQuickNarration("");
      },
      onError: (err: any) => toast.error(`خطأ: ${err.message}`),
    });

  const updateAccountMutation = trpc.accounting.updateAccount.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الحساب وتسجيل التعديل في سجل التدقيق");
      refetchAccounts();
      refetchActivityLogs();
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`),
  });

  const moveAccountMutation = trpc.accounting.moveAccount.useMutation({
    onSuccess: () => {
      toast.success(
        "تم نقل وإعادة ترتيب الحساب في الشجرة بنجاح وتوثيق العملية"
      );
      refetchAccounts();
      refetchActivityLogs();
      setPendingMove(null);
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`),
  });

  const createAccountMutation = trpc.accounting.addAccount.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الحساب الجديد بنجاح وتوثيقه في سجل التدقيق");
      refetchAccounts();
      refetchActivityLogs();
      setNewAccCode("");
      setNewAccName("");
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`),
  });

  const updateSettingsMutation = trpc.accounting.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث إعدادات المؤسسة بنجاح");
      setIsSettingsOpen(false);
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`),
  });

  // Filtered Accounts
  const activeAccountsForEntry = useMemo(() => {
    if (!accountsData) return [];
    return accountsData.filter(
      a =>
        a.isActive &&
        (a.name.includes(accountQuery) || a.code.includes(accountQuery))
    );
  }, [accountsData, accountQuery]);

  const filteredAccountsManagement = useMemo(() => {
    if (!accountsData) return [];
    return accountsData.filter(
      a =>
        a.name.includes(accountQuery) ||
        a.code.includes(accountQuery) ||
        a.type.includes(accountQuery)
    );
  }, [accountsData, accountQuery]);

  // Grouped Accounts for Tree View with Parent-Child Support
  const accountsTree = useMemo(() => {
    if (!accountsData) return {};
    const categories: Record<
      string,
      { roots: any[]; childrenMap: Record<number, any[]> }
    > = {
      asset: { roots: [], childrenMap: {} },
      liability: { roots: [], childrenMap: {} },
      equity: { roots: [], childrenMap: {} },
      revenue: { roots: [], childrenMap: {} },
      expense: { roots: [], childrenMap: {} },
    };

    filteredAccountsManagement.forEach(acc => {
      const cat = acc.type || "asset";
      if (!categories[cat]) {
        categories[cat] = { roots: [], childrenMap: {} };
      }
      if (acc.parentAccountId) {
        if (!categories[cat].childrenMap[acc.parentAccountId]) {
          categories[cat].childrenMap[acc.parentAccountId] = [];
        }
        categories[cat].childrenMap[acc.parentAccountId].push(acc);
      } else {
        categories[cat].roots.push(acc);
      }
    });

    return categories;
  }, [accountsData, filteredAccountsManagement]);

  // Filtered & Sorted Transactions with Totals
  const filteredRecords = useMemo(() => {
    if (!transactionsData) return [];
    return transactionsData.filter(tx => {
      const matchStatus =
        filterStatus === "all" || tx.lifecycleStatus === filterStatus;
      const matchAccount =
        statementAccountId === "all" ||
        String(tx.accountId) === statementAccountId;

      let matchDate = true;
      const txDateStr = String(tx.transactionDate).split("T")[0];
      if (filterStartDate && txDateStr < filterStartDate) matchDate = false;
      if (filterEndDate && txDateStr > filterEndDate) matchDate = false;

      return matchStatus && matchAccount && matchDate;
    });
  }, [
    transactionsData,
    filterStatus,
    statementAccountId,
    filterStartDate,
    filterEndDate,
  ]);

  const filteredTotalAmount = useMemo(() => {
    return filteredRecords.reduce(
      (sum, tx) => sum + parseFloat(String(tx.amount || 0)),
      0
    );
  }, [filteredRecords]);

  const handleQuickEntry = async () => {
    if (!quickAccountId || !quickAmount) {
      toast.error("الرجاء اختيار الحساب وإدخال القيمة المطلوبة");
      return;
    }
    if (!isOnline) {
      try {
        await put("transactions", {
          id: -Date.now(),
          accountId: Number(quickAccountId),
          amount: quickAmount,
          type: "debit",
          transactionDate: quickDate || new Date().toISOString().split("T")[0],
          narration: quickNarration || "حركة إدخال سريع",
          lifecycleStatus: "approved",
          isReversed: false,
          userId: 0,
        });
        toast.success(
          "حُفظت محلياً (وضع آفلداين) — ستتزامن تلقائياً عند عودة الاتصال"
        );
        setQuickAmount("");
        setQuickNarration("");
      } catch (e: any) {
        toast.error("فشل الحفظ المحلي: " + (e?.message || "خطأ غير معروف"));
      }
      return;
    }
    addBatchTransactionsMutation.mutate({
      lifecycleStatus: "approved",
      rows: [
        {
          accountId: Number(quickAccountId),
          amount: quickAmount,
          narration: quickNarration || "حركة إدخال سريع",
          transactionDate: quickDate,
        },
      ],
    });
  };

  const handleExportExcel = () => {
    const n = downloadCsv(
      `ALHUSAINIA_Report_${new Date().toISOString().split("T")[0]}.csv`,
      ["التاريخ", "الحساب", "الكود", "القيمة", "البيان", "الحالة"],
      filteredRecords.map(tx => [
        String(tx.transactionDate).split("T")[0],
        tx.accountName,
        tx.accountCode,
        tx.amount,
        tx.narration || "",
        tx.lifecycleStatus,
      ])
    );
    toast.success(`تم تصدير ${n} سجل كملف CSV`);
  };

  const handleExportPDF = () => {
    toast.success("جاري تجهيز تقارير الطباعة والتصدير بصيغة PDF الرسمية");
    window.print();
  };

  const updateObRow = (
    accountId: number,
    field: "amount" | "type",
    value: string
  ) => {
    setObRows(prev =>
      prev.map(r => (r.accountId === accountId ? { ...r, [field]: value } : r))
    );
  };

  const openOpeningBalances = async () => {
    setObOpen(true);
    const period = settingsData?.accountingPeriod || "السنة المالية 2026";
    setObPeriod(period);
    const financial = (accountsData || []).filter((a: any) =>
      ["asset", "liability", "equity"].includes(a.type)
    );
    setObRows(
      financial.map((a: any) => ({
        accountId: a.id,
        code: a.code,
        name: a.name,
        amount: "",
        type: "debit",
      }))
    );
    try {
      setObLoading(true);
      const existing = await utils.accounting.getOpeningBalances.fetch({
        periodName: period,
      });
      if (existing?.length) {
        setObRows(prev =>
          prev.map(r => {
            const ex = existing.find((e: any) => e.accountId === r.accountId);
            return ex
              ? {
                  ...r,
                  amount: String(ex.amount ?? ""),
                  type: ex.type || "debit",
                }
              : r;
          })
        );
      }
    } catch {
      /* ignore load errors */
    } finally {
      setObLoading(false);
    }
  };

  const handleObSave = () => {
    const balances = obRows
      .filter(r => parseFloat(r.amount || "0") > 0)
      .map(r => ({
        accountId: r.accountId,
        amount: r.amount,
        type: r.type as "debit" | "credit",
      }));
    if (!balances.length) {
      toast.error("أدخل مبلغاً واحداً على الأقل لحفظ الأرصدة");
      return;
    }
    saveOpeningBalancesMutation.mutate({
      periodName: obPeriod.trim(),
      balances,
    });
  };

  const handleCopyImportTemplate = () => {
    const tpl =
      "التاريخ,الحساب,الكود,المبلغ,البيان,النوع\n2026-08-01,الصندوق الرئيسي,1010,5000,مبيعات نقدية,debit\n2026-08-03,البنك الأهلي,1020,2200,سداد فاتورة مورد,credit";
    navigator.clipboard
      ?.writeText(tpl)
      .then(() => toast.success("تم نسخ القالب — الصقه ثم عدّل الصفوف"))
      .catch(() =>
        toast.error("تعذر النسخ التلقائي — انسخ القالب يدوياً من الدليل")
      );
  };

  const handleImportFromText = () => {
    const parsed = parseImportCsv(importText, accountsData);
    if (!parsed.parsed.length) {
      setImportResult({
        total: parsed.skipped.length,
        imported: 0,
        skipped: parsed.skipped,
      });
      toast.error("لا توجد صفوف صالحة للاستيراد — راجع الأخطاء المبيّنة");
      return;
    }
    addBatchTransactionsMutation.mutate(
      { lifecycleStatus: importLifecycle, rows: parsed.parsed },
      {
        onSuccess: (res: any) => {
          const imported = res?.count ?? parsed.parsed.length;
          setImportResult({
            total: parsed.parsed.length + parsed.skipped.length,
            imported,
            skipped: parsed.skipped,
          });
          refetchTransactions();
          refetchSummary();
          toast.success(`تم استيراد ${imported} حركة بنجاح`);
        },
        onError: (e: any) =>
          toast.error("فشل الاستيراد: " + (e?.message || "خطأ غير معروف")),
      }
    );
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div
        className="min-h-screen bg-ink-deep flex flex-col items-center justify-center p-4 text-white"
        dir="rtl"
      >
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="bg-brand text-ink-deep w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-bold shadow-lg">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold font-display">
            ALHUSAINIA | نظام الحسابات
          </h1>
          <p className="text-sm text-slate-400">
            مؤسسة الحسينية لخدمات الأعمال
          </p>
          <Card className="bg-ink-800 border-ink-600 text-white p-6 space-y-4 shadow-xl">
            <p className="text-xs text-slate-400">
              الرجاء تسجيل الدخول للوصول لنظام الحسابات — عزل تام للبيانات
              ومعايير موثوقة
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => goLogin()}
                  className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-xs h-10 font-bold text-ink-deep"
                >
                  تسجيل الدخول الآمن
                </Button>
              </TooltipTrigger>
              <TooltipContent
                sideOffset={5}
                className="text-xs bg-ink-600 text-white border border-ink-500"
              >
                تسجيل الدخول باستخدام بيانات الاعتماد الشخصية
              </TooltipContent>
            </Tooltip>
          </Card>
          <div className="mt-4 rounded-2xl border border-ink-600 bg-ink-deep/80 p-5 text-right">
            <h3 className="text-sm font-bold text-brand mb-3">
              جرّب النظام مجاناً
            </h3>
            <p className="text-xs text-slate-400 leading-6 mb-3">
              نظام محاسبي متكامل لإدارة حساباتك — بدون بطاقة ائتمان، ابدأ الآن.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <span>✅ إدارة الحسابات</span>
              <span>✅ المعاملات</span>
              <span>✅ التقارير</span>
              <span>✅ التحليلات</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand text-ink pb-28" dir="rtl">
      {/* Unified Header Navbar */}
      <HeaderNavbar onOpenSettings={() => setIsSettingsOpen(!isSettingsOpen)} />

      {isSettingsOpen && (
        <div className="bg-ink-600 border-b border-ink-500 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2 text-xs text-white">
            <span className="text-slate-300 font-medium">اسم المؤسسة:</span>
            <Input
              value={instName}
              onChange={e => setInstName(e.target.value)}
              className="bg-ink border-ink-500 text-white text-xs h-7 w-48"
            />
            <span className="text-slate-300 font-medium mr-2">العملة:</span>
            <Input
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="bg-ink border-ink-500 text-white text-xs h-7 w-28"
            />
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-deep hover:text-sand h-7 text-xs px-3 font-bold text-ink-deep"
              onClick={() => {
                updateSettingsMutation.mutate({
                  institutionName: instName,
                  currency: currency,
                  accountingPeriod:
                    settingsData?.accountingPeriod ||
                    new Date().getFullYear().toString(),
                });
              }}
            >
              حفظ التغييرات
            </Button>
          </div>
        </div>
      )}

      {/* Download & Services Banner */}
      <div className="brand-gradient text-white mx-3 mt-3 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-brand text-ink-deep w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display">
              الحسينية لخدمات الأعمال
            </h3>
            <p className="text-[11px] text-white/70">
              الحلول المؤسسية Uamex_erp · الحلول الهندسية · الخدمات المعرفية
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs font-bold h-8 px-4"
            onClick={() => (window.location.href = "/about")}
          >
            التعريف بالمؤسسة والمكتبة
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white text-xs h-8 px-4 hover:bg-white/10"
            onClick={() => (window.location.href = "/store")}
          >
            المتجر الإلكتروني
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 mt-3 space-y-4">
        {/* KPI Summary Cards */}
        {loadingSummary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => (
              <Card
                key={i}
                className="p-4 bg-white shadow-sm flex items-center justify-center h-20"
              >
                <Loader2 className="w-5 h-5 animate-spin text-brand" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card
              onClick={() => setActiveTab("reports")}
              className="p-3 bg-emerald-50 border-emerald-200 shadow-sm transition-all hover:shadow cursor-pointer group"
              title="عرض تقارير الإيرادات"
            >
              <p className="text-[10px] text-emerald-700 font-bold">
                إجمالي الإيرادات
              </p>
              <p className="text-sm font-bold text-emerald-900 mt-1 font-mono group-hover:underline">
                {countUp("revenue", summaryData?.totalRevenue)} {currency}
              </p>
            </Card>
            <Card
              onClick={() => setActiveTab("reports")}
              className="p-3 bg-rose-50 border-rose-200 shadow-sm transition-all hover:shadow cursor-pointer group"
              title="عرض تقارير المصروفات"
            >
              <p className="text-[10px] text-rose-700 font-bold">
                إجمالي المصروفات
              </p>
              <p className="text-sm font-bold text-rose-900 mt-1 font-mono group-hover:underline">
                {countUp("expense", summaryData?.totalExpense)} {currency}
              </p>
            </Card>
            <Card
              onClick={() => setActiveTab("analytics")}
              className="p-3 bg-blue-50 border-blue-200 shadow-sm transition-all hover:shadow cursor-pointer group"
              title="عرض التحليلات"
            >
              <p className="text-[10px] text-blue-700 font-bold">
                صافي الدخل التشغيلي
              </p>
              <p className="text-sm font-bold text-blue-900 mt-1 font-mono group-hover:underline">
                {countUp("net", summaryData?.netIncome)} {currency}
              </p>
            </Card>
            <Card
              onClick={() => setActiveTab("accounts")}
              className="p-3 bg-slate-100 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer group"
              title="فتح دليل الحسابات"
            >
              <p className="text-[10px] text-slate-700 font-bold">
                إجمالي الأصول
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1 font-mono group-hover:underline">
                {countUp("assets", summaryData?.totalAssets)} {currency}
              </p>
            </Card>
          </div>
        )}

        {/* Onboarding empty state: first-time welcome + guided quick action */}
        {!loadingSummary &&
          summaryData &&
          summaryData.totalRevenue === 0 &&
          summaryData.totalExpense === 0 &&
          (transactionsData?.length ?? 0) === 0 && (
            <div className="rounded-2xl border border-brand-200 bg-gradient-to-l from-brand-50 to-muted p-4 md:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-brand text-ink-deep w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-800">
                    مرحباً بك! منصة الحسينية جاهزة للانطلاق
                  </h3>
                  <p className="text-[11px] text-brand-700 mt-0.5">
                    الأصول والدليل المحاسبي (12 حساباً) مُجهّزون. ابدأ بتسجيل
                    أول حركة مالية — سيُترحّل فوراً ويرصد في السجل والتدقيق
                    والتقارير.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab("entry")}
                className="bg-brand hover:bg-brand-deep text-white text-xs font-bold h-8 px-4 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 ml-1" /> ابدأ الإدخال السريع
              </Button>
            </div>
          )}

        {/* Quick actions row */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("entry")}
            className="h-8 text-xs border-brand-200 bg-white text-brand-800 hover:bg-brand-50"
          >
            <Plus className="w-3.5 h-3.5 ml-1 text-brand" /> إدخال سريع
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("reports")}
            className="h-8 text-xs border-brand-200 bg-white text-brand-800 hover:bg-brand-50"
          >
            <FileText className="w-3.5 h-3.5 ml-1 text-brand" /> السجل
            والتقارير
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => (window.location.href = "/commercial")}
            className="h-8 text-xs border-brand-200 bg-white text-brand-800 hover:bg-brand-50"
          >
            <Layers className="w-3.5 h-3.5 ml-1 text-brand" /> المحاسبة
            التجارية
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => (window.location.href = "/store")}
            className="h-8 text-xs border-brand-200 bg-white text-brand-800 hover:bg-brand-50"
          >
            <ShoppingCart className="w-3.5 h-3.5 ml-1 text-brand" /> المتجر
            الإلكتروني
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("analytics")}
            className="h-8 text-xs border-brand-200 bg-white text-brand-800 hover:bg-brand-50"
          >
            <BarChart3 className="w-3.5 h-3.5 ml-1 text-brand" /> التحليلات
            والمساعد ألياس
          </Button>
        </div>

        {/* Commercial Overview Panel */}
        <Card className="border-brand-200 bg-brand-50 shadow-sm">
          <CardHeader className="py-2.5 px-4 border-b border-brand-100 bg-muted flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-brand-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-700" /> نظرة تجارية سريعة —
              المخزون والمبيعات والذمم
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => (window.location.href = "/commercial")}
              className="h-6 text-[10px] text-brand font-bold hover:bg-muted"
            >
              فتح المحاسبة التجارية
            </Button>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {commercialLoading ? (
              <div className="h-16 bg-white/60 rounded-lg animate-pulse" />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div
                    className="p-2.5 rounded-lg bg-white border border-brand-100 text-center"
                    title="مبيعات الشهر الجاري"
                  >
                    <p className="text-[9px] font-bold text-slate-500 flex items-center justify-center gap-1">
                      <ShoppingCart className="w-3 h-3 text-emerald-600" />{" "}
                      مبيعات الشهر
                    </p>
                    <p className="text-xs font-bold text-emerald-800 mt-0.5 font-mono">
                      {(
                        commercialStats?.monthStats?.salesTotal || 0
                      ).toLocaleString("en-US")}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-lg bg-white border border-brand-100 text-center"
                    title="مشتريات الشهر الجاري"
                  >
                    <p className="text-[9px] font-bold text-slate-500 flex items-center justify-center gap-1">
                      <ShoppingCart className="w-3 h-3 text-rose-600" /> مشتريات
                      الشهر
                    </p>
                    <p className="text-xs font-bold text-rose-800 mt-0.5 font-mono">
                      {(
                        commercialStats?.monthStats?.purchasesTotal || 0
                      ).toLocaleString("en-US")}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-lg bg-white border border-brand-100 text-center"
                    title="المنتجات النشطة في المخزون"
                  >
                    <p className="text-[9px] font-bold text-slate-500 flex items-center justify-center gap-1">
                      <Package className="w-3 h-3 text-brand" /> منتجات نشطة
                    </p>
                    <p className="text-xs font-bold text-brand-800 mt-0.5 font-mono">
                      {commercialStats?.counts?.products || 0}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-lg bg-white border border-brand-100 text-center"
                    title="عدد العملاء النشطين"
                  >
                    <p className="text-[9px] font-bold text-slate-500 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3 text-blue-600" /> عملاء نشطون
                    </p>
                    <p className="text-xs font-bold text-blue-900 mt-0.5 font-mono">
                      {commercialStats?.counts?.customers || 0}
                    </p>
                  </div>
                </div>
                {hasCommercialAlerts && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {lowStockAlerts.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                        <p className="text-[10px] font-bold text-amber-800 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> تنبيه نفاد
                          المخزون ({lowStockAlerts.length})
                        </p>
                        {lowStockAlerts.slice(0, 4).map((p: any) => (
                          <p
                            key={p.id}
                            className="text-[10px] text-amber-900 py-0.5"
                          >
                            • {p.name} — متبقي <b>{p.currentStock}</b> {p.unit}{" "}
                            (الحد الأدنى {p.minStock})
                          </p>
                        ))}
                      </div>
                    )}
                    {topCustomerDebts.length > 0 && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5">
                        <p className="text-[10px] font-bold text-rose-800 mb-1">
                          ذمم عملاء غير مسددة ({topCustomerDebts.length})
                        </p>
                        {topCustomerDebts.slice(0, 4).map((c: any) => (
                          <p
                            key={c.id}
                            className="text-[10px] text-rose-900 py-0.5"
                          >
                            • {c.name} —{" "}
                            <b>{Number(c.balance).toLocaleString("en-US")}</b>{" "}
                            {currency}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!hasCommercialAlerts && (
                  <p className="text-[10px] text-slate-400 text-center py-1">
                    لا تنبيهات حالياً — المخزون والذمم في وضع سليم.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Transaction Entry Widget */}
        <Card className="border-brand-200 bg-brand-50 shadow-sm">
          <CardHeader className="py-2.5 px-4 border-b border-brand-100 bg-muted flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-brand-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-brand-700" /> أداة الإدخال السريع
              للمعاملات اليومية (اعتماد فوري)
            </CardTitle>
            <span className="text-[10px] text-brand-700 font-mono">
              تاريخ الحركة: {quickDate}
            </span>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
              <Select value={quickAccountId} onValueChange={setQuickAccountId}>
                <SelectTrigger className="h-8 text-xs bg-white border-brand-200">
                  <SelectValue placeholder="اختر الحساب النشط..." />
                </SelectTrigger>
                <SelectContent>
                  {activeAccountsForEntry.map(acc => (
                    <SelectItem
                      key={acc.id}
                      value={String(acc.id)}
                      className="text-xs"
                    >
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="قيمة المبلغ..."
                value={quickAmount}
                onChange={e => setQuickAmount(e.target.value)}
                className="h-8 text-xs bg-white border-brand-200 font-bold"
              />
              <Input
                placeholder="البيان أو وصف الحركة (اختياري)..."
                value={quickNarration}
                onChange={e => setQuickNarration(e.target.value)}
                className="h-8 text-xs bg-white border-brand-200"
              />
              <Button
                onClick={handleQuickEntry}
                disabled={addBatchTransactionsMutation.isPending}
                className="h-8 bg-brand hover:bg-brand-deep text-white text-xs font-bold"
              >
                {addBatchTransactionsMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin ml-1" />
                ) : (
                  <Check className="w-3 h-3 ml-1" />
                )}
                تسجيل واعتماد سريع
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Operational Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 bg-slate-200 h-9 p-1 rounded-xl text-xs mb-3 shadow-inner">
            <TabsTrigger
              value="entry"
              className="text-[10px] sm:text-xs font-semibold"
            >
              الإدخال
            </TabsTrigger>
            <TabsTrigger
              value="accounts"
              className="text-[10px] sm:text-xs font-semibold"
            >
              الدليل الشجري
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="text-[10px] sm:text-xs font-semibold"
            >
              السجل والتقارير
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="text-[10px] sm:text-xs font-semibold"
            >
              سجل التدقيق
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="text-[10px] sm:text-xs font-semibold"
            >
              التحليلات
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="text-[10px] sm:text-xs font-semibold"
            >
              الملف
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Batch Entry */}
          <TabsContent value="entry" className="space-y-3">
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b py-2.5 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand" /> جدول الإدخال
                  السريع متعدد الحسابات (الحسابات النشطة فقط)
                </CardTitle>
                <div className="relative">
                  <Search className="absolute right-2.5 top-2 w-3 h-3 text-slate-400" />
                  <Input
                    placeholder="بحث في الحسابات النشطة..."
                    value={accountQuery}
                    onChange={e => setAccountQuery(e.target.value)}
                    className="pr-7 h-7 text-xs w-48 bg-white"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {loadingAccounts ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-brand" />{" "}
                    جاري تحميل الحسابات النشطة...
                  </div>
                ) : (
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">كود الحساب واسمه النشط</th>
                        <th className="py-2.5 px-4 w-32">القيمة</th>
                        <th className="py-2.5 px-4">بيان الحركة (اختياري)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeAccountsForEntry.map(acc => (
                        <tr
                          key={acc.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-2.5 px-4">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded ml-2 border">
                              {acc.code}
                            </span>
                            <span className="font-medium text-slate-900">
                              {acc.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <Input
                              type="number"
                              value={batchRows[acc.id]?.amount || ""}
                              onChange={e =>
                                setBatchRows({
                                  ...batchRows,
                                  [acc.id]: {
                                    ...batchRows[acc.id],
                                    amount: e.target.value,
                                  },
                                })
                              }
                              className="h-7 text-xs font-bold text-center font-mono bg-slate-50"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <Input
                              value={batchRows[acc.id]?.narration || ""}
                              onChange={e =>
                                setBatchRows({
                                  ...batchRows,
                                  [acc.id]: {
                                    ...batchRows[acc.id],
                                    narration: e.target.value,
                                  },
                                })
                              }
                              className="h-7 text-xs bg-slate-50"
                              placeholder="ملاحظات أو بيان الحركة..."
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Floating Action Bar */}
            <div className="flex justify-end gap-2 bg-ink p-2.5 rounded-xl sticky bottom-16 shadow-lg border border-ink-600">
              <Button
                size="sm"
                onClick={() => {
                  const rows = Object.entries(batchRows)
                    .filter(
                      ([_, val]) => val.amount && parseFloat(val.amount) > 0
                    )
                    .map(([id, val]) => ({
                      accountId: Number(id),
                      amount: val.amount,
                      narration: val.narration || "حركة مجمعة",
                      transactionDate: new Date().toISOString().split("T")[0],
                    }));
                  if (rows.length === 0) {
                    toast.error("الرجاء إدخال قيمة في حساب واحد على الأقل");
                    return;
                  }
                  addBatchTransactionsMutation.mutate({
                    lifecycleStatus: "saved",
                    rows,
                  });
                }}
                disabled={addBatchTransactionsMutation.isPending}
                className="bg-ink-600 hover:bg-ink-600 text-white text-xs h-8 px-3 font-semibold"
              >
                <Save className="w-3.5 h-3.5 ml-1 text-brand-300" /> حفظ مسودة
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const rows = Object.entries(batchRows)
                    .filter(
                      ([_, val]) => val.amount && parseFloat(val.amount) > 0
                    )
                    .map(([id, val]) => ({
                      accountId: Number(id),
                      amount: val.amount,
                      narration: val.narration || "حركة مجمعة",
                      transactionDate: new Date().toISOString().split("T")[0],
                    }));
                  if (rows.length === 0) {
                    toast.error("الرجاء إدخال قيمة في حساب واحد على الأقل");
                    return;
                  }
                  addBatchTransactionsMutation.mutate({
                    lifecycleStatus: "approved",
                    rows,
                  });
                }}
                disabled={addBatchTransactionsMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-4 font-bold shadow"
              >
                {addBatchTransactionsMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
                ) : (
                  <Check className="w-3.5 h-3.5 ml-1" />
                )}
                اعتماد وترحيل فوري
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: Chart of Accounts with Drag and Drop Tree View & Advanced Search */}
          <TabsContent value="accounts" className="space-y-4">
            {/* Opening Balances Banner */}
            <Card className="p-4 bg-white shadow-sm border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-brand" />
                  <h3 className="text-xs font-bold text-slate-800">
                    الأرصدة الافتتاحية للفترة — ترحيل أرصدة بداية السنة
                  </h3>
                </div>
                <Button
                  size="sm"
                  onClick={openOpeningBalances}
                  className="h-7 px-2.5 text-xs bg-brand hover:bg-brand-deep text-white font-semibold"
                >
                  <Scale className="w-3.5 h-3.5 ml-1" /> إدارة الأرصدة
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                أدخل أرصدة بداية الفترة لحسابات الميزانية (أصول / خصوم / حقوق
                ملكية) — تُرحّل تلقائياً إلى ميزان المراجعة والميزانية العمومية.
                حسابات الإيرادات والمصروفات تبدأ من صفر.
              </p>
            </Card>

            {/* Add New Account Card */}
            <Card className="p-4 bg-white shadow-sm border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand" /> إضافة حساب جديد إلى
                الدليل الشجري
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center text-xs">
                <Input
                  placeholder="كود الحساب (مثال: 1020)..."
                  value={newAccCode}
                  onChange={e => setNewAccCode(e.target.value)}
                  className="h-8 font-mono bg-slate-50"
                />
                <Input
                  placeholder="اسم الحساب..."
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  className="h-8 bg-slate-50"
                />
                <Select
                  value={newAccCategory}
                  onValueChange={setNewAccCategory}
                >
                  <SelectTrigger className="h-8 bg-slate-50">
                    <SelectValue placeholder="طبيعة الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset" className="text-xs">
                      الأصول (Assets)
                    </SelectItem>
                    <SelectItem value="liability" className="text-xs">
                      الخصوم (Liabilities)
                    </SelectItem>
                    <SelectItem value="equity" className="text-xs">
                      حقوق الملكية (Equity)
                    </SelectItem>
                    <SelectItem value="revenue" className="text-xs">
                      الإيرادات (Revenues)
                    </SelectItem>
                    <SelectItem value="expense" className="text-xs">
                      المصروفات (Expenses)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (!newAccCode || !newAccName) {
                      toast.error("الرجاء إدخال الكود واسم الحساب");
                      return;
                    }
                    createAccountMutation.mutate({
                      code: newAccCode,
                      name: newAccName,
                      type: newAccCategory as any,
                      description: "حساب شجري فرعي",
                    });
                  }}
                  disabled={createAccountMutation.isPending}
                  className="h-8 bg-brand hover:bg-brand-deep text-white font-bold"
                >
                  {createAccountMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 ml-1" />
                  )}
                  إضافة الحساب
                </Button>
              </div>
            </Card>

            {/* Tree View / List View Header & Search with Drag and Drop */}
            <Card className="p-4 bg-white shadow-sm border-slate-200 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-brand" /> العرض الشجري
                    المتقدم (اسحب وأفلت لإعادة الترتيب)
                  </h3>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px]">
                    <button
                      onClick={() => setAccountViewMode("tree")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${accountViewMode === "tree" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}
                    >
                      شجري (Tree)
                    </button>
                    <button
                      onClick={() => setAccountViewMode("list")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${accountViewMode === "list" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}
                    >
                      قائمة (List)
                    </button>
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-2.5 top-2 w-3 h-3 text-slate-400" />
                  <Input
                    placeholder="بحث متقدم (بالكود، الاسم، أو التصنيف)..."
                    value={accountQuery}
                    onChange={e => setAccountQuery(e.target.value)}
                    className="pr-7 h-7 text-xs bg-slate-50"
                  />
                </div>
              </div>

              {loadingAccounts ? (
                <div className="py-12 flex items-center justify-center gap-2 text-slate-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-brand" />{" "}
                  جاري تحميل الدليل الشجري...
                </div>
              ) : accountViewMode === "tree" ? (
                <div className="space-y-3 pt-2">
                  {[
                    {
                      key: "asset",
                      label: "الأصول (Assets)",
                      color:
                        "border-emerald-200 bg-emerald-50/40 text-emerald-900",
                    },
                    {
                      key: "liability",
                      label: "الخصوم (Liabilities)",
                      color: "border-blue-200 bg-blue-50/40 text-blue-900",
                    },
                    {
                      key: "equity",
                      label: "حقوق الملكية (Equity)",
                      color:
                        "border-purple-200 bg-purple-50/40 text-purple-900",
                    },
                    {
                      key: "revenue",
                      label: "الإيرادات (Revenues)",
                      color: "border-brand-200 bg-brand-50 text-brand-800",
                    },
                    {
                      key: "expense",
                      label: "المصروفات (Expenses)",
                      color: "border-rose-200 bg-rose-50/40 text-rose-900",
                    },
                  ].map(group => {
                    const groupData = accountsTree[group.key] || {
                      roots: [],
                      childrenMap: {},
                    };
                    const roots = groupData.roots;
                    if (
                      roots.length === 0 &&
                      Object.keys(groupData.childrenMap).length === 0
                    )
                      return null;

                    return (
                      <div
                        key={group.key}
                        className={`p-3 rounded-xl border ${group.color} space-y-2 transition-all ${dropTargetId === -100 ? "ring-2 ring-brand bg-muted/60" : ""}`}
                        onDragOver={e => {
                          e.preventDefault();
                          setDropTargetId(-100);
                        }}
                        onDragLeave={() => setDropTargetId(null)}
                        onDrop={() => {
                          setDropTargetId(null);
                          if (draggedAccountId !== null) {
                            const accObj = accountsData?.find(
                              (a: any) => a.id === draggedAccountId
                            );
                            setPendingMove({
                              accountId: draggedAccountId,
                              newParentAccountId: null,
                              accountName: accObj?.name || "الحساب",
                              parentName: "الجذر الرئيسي",
                            });
                            setDraggedAccountId(null);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center font-bold text-xs border-b pb-1.5 border-current/10">
                          <span>
                            📁 {group.label} (أفلت هنا لتجعله جذراً رئيسياً)
                          </span>
                          <span className="font-mono text-[10px] bg-white/80 px-2 py-0.5 rounded shadow-sm">
                            ({roots.length} جذر رئيسي)
                          </span>
                        </div>
                        <div className="space-y-2 pr-2">
                          {roots.map((rootAcc: any) => {
                            const children =
                              groupData.childrenMap[rootAcc.id] || [];
                            const isTarget = dropTargetId === rootAcc.id;
                            return (
                              <div
                                key={rootAcc.id}
                                draggable
                                onDragStart={() =>
                                  setDraggedAccountId(rootAcc.id)
                                }
                                onDragOver={e => {
                                  e.preventDefault();
                                  setDropTargetId(rootAcc.id);
                                }}
                                onDragLeave={() => setDropTargetId(null)}
                                onDrop={e => {
                                  e.stopPropagation();
                                  setDropTargetId(null);
                                  if (
                                    draggedAccountId !== null &&
                                    draggedAccountId !== rootAcc.id
                                  ) {
                                    const accObj = accountsData?.find(
                                      (a: any) => a.id === draggedAccountId
                                    );
                                    setPendingMove({
                                      accountId: draggedAccountId,
                                      newParentAccountId: rootAcc.id,
                                      accountName: accObj?.name || "الحساب",
                                      parentName: rootAcc.name,
                                    });
                                    setDraggedAccountId(null);
                                  }
                                }}
                                className={`p-2.5 rounded-lg bg-white/95 border transition-all ${isTarget ? "border-amber-500 ring-2 ring-brand-300 bg-brand/10 shadow-md scale-[1.01]" : "border-slate-200 shadow-sm"} space-y-2 cursor-grab active:cursor-grabbing`}
                              >
                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border text-slate-800 font-bold">
                                      {rootAcc.code}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {rootAcc.name}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] ${rootAcc.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}
                                    >
                                      {rootAcc.isActive ? "نشط" : "موقف"}
                                    </Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const newStatus = !rootAcc.isActive;
                                      updateAccountMutation.mutate({
                                        id: rootAcc.id,
                                        name: rootAcc.name,
                                        code: rootAcc.code,
                                        type: rootAcc.type || "asset",
                                        isActive: newStatus,
                                      });
                                    }}
                                    className={`h-6 px-2 text-[10px] ${rootAcc.isActive ? "text-rose-600 border-rose-200 hover:bg-rose-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                                  >
                                    {rootAcc.isActive ? (
                                      <>
                                        <PowerOff className="w-3 h-3 ml-1" />{" "}
                                        إيقاف
                                      </>
                                    ) : (
                                      <>
                                        <Power className="w-3 h-3 ml-1" /> تنشيط
                                      </>
                                    )}
                                  </Button>
                                </div>

                                {/* Children Sub-accounts */}
                                {children.length > 0 && (
                                  <div className="pr-6 border-r-2 border-brand space-y-1.5 pt-1">
                                    {children.map((child: any) => (
                                      <div
                                        key={child.id}
                                        draggable
                                        onDragStart={e => {
                                          e.stopPropagation();
                                          setDraggedAccountId(child.id);
                                        }}
                                        className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between items-center text-xs shadow-xs cursor-grab active:cursor-grabbing"
                                      >
                                        <div className="flex items-center gap-2">
                                          <GripVertical className="w-3 h-3 text-slate-400" />
                                          <span className="text-slate-400">
                                            └─
                                          </span>
                                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border text-slate-700 font-bold text-[11px]">
                                            {child.code}
                                          </span>
                                          <span className="font-medium text-slate-900">
                                            {child.name}
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const newStatus = !child.isActive;
                                            updateAccountMutation.mutate({
                                              id: child.id,
                                              name: child.name,
                                              code: child.code,
                                              type: child.type || "asset",
                                              isActive: newStatus,
                                            });
                                          }}
                                          className={`h-5 px-1.5 text-[9px] ${child.isActive ? "text-rose-600 border-rose-200 hover:bg-rose-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                                        >
                                          {child.isActive ? "إيقاف" : "تنشيط"}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  {filteredAccountsManagement?.map((acc: any) => (
                    <div
                      key={acc.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex justify-between items-center text-xs shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono bg-white px-2.5 py-1 rounded border text-slate-800 font-bold">
                          {acc.code}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {acc.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            التصنيف: {acc.category || acc.type}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${acc.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}
                        >
                          {acc.isActive ? "نشط" : "موقف"}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newStatus = !acc.isActive;
                          updateAccountMutation.mutate({
                            id: acc.id,
                            name: acc.name,
                            code: acc.code,
                            type: acc.type || "asset",
                            isActive: newStatus,
                          });
                        }}
                        className={`h-7 px-2 text-[11px] ${acc.isActive ? "text-rose-600 border-rose-200 hover:bg-rose-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                      >
                        {acc.isActive ? (
                          <>
                            <PowerOff className="w-3 h-3 ml-1" /> إيقاف
                          </>
                        ) : (
                          <>
                            <Power className="w-3 h-3 ml-1" /> تنشيط
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Period Closing Card */}
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b py-2.5 px-4">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-brand" /> إقفال الدورة
                  المحاسبية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600">
                      اسم الدورة / الفترة
                    </Label>
                    <Input
                      value={closingPeriod}
                      onChange={e => setClosingPeriod(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="مثال: السنة المالية 2026"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600">
                      إقفال حتى تاريخ
                    </Label>
                    <Input
                      type="date"
                      value={closingDate}
                      onChange={e => setClosingDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <Button
                  className="w-full h-8 text-xs bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold"
                  onClick={() =>
                    setClosingPreviewParams({
                      periodName: closingPeriod.trim() || "السنة المالية 2026",
                      asOfDate: closingDate || undefined,
                    })
                  }
                >
                  <Scale className="w-3.5 h-3.5 ml-1" /> معاينة الأرصدة قبل
                  الإقفال
                </Button>

                {closingPreview.isLoading && (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />{" "}
                    جاري حساب أرصدة الدورة...
                  </div>
                )}

                {closingPreview.data &&
                  closingPreview.data.rows.length === 0 && (
                    <p className="text-center text-slate-400 text-xs py-4">
                      لا توجد أرصدة إيرادات/مصروفات مُقفلة في هذه الدورة
                    </p>
                  )}

                {closingPreview.data && closingPreview.data.rows.length > 0 && (
                  <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full text-right text-[11px] border-collapse">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">الكود</th>
                          <th className="py-2 px-3">الحساب</th>
                          <th className="py-2 px-3">النوع</th>
                          <th className="py-2 px-3 text-left">الرصيد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {closingPreview.data.rows.map((r: any) => (
                          <tr key={r.accountId} className="bg-white">
                            <td className="py-1.5 px-3 font-mono text-slate-500">
                              {r.code}
                            </td>
                            <td className="py-1.5 px-3 font-bold text-slate-800">
                              {r.name}
                            </td>
                            <td className="py-1.5 px-3">
                              <Badge
                                variant="outline"
                                className={`text-[9px] ${r.side === "debit" ? "text-rose-600 border-rose-200" : "text-emerald-600 border-emerald-200"}`}
                              >
                                {r.type === "revenue"
                                  ? "إيراد"
                                  : r.type === "expense"
                                    ? "مصروف"
                                    : r.type}
                              </Badge>
                            </td>
                            <td className="py-1.5 px-3 text-left font-mono font-bold text-slate-800">
                              {Number(r.balance).toLocaleString("en-US")}{" "}
                              {r.side === "debit" ? "مدين" : "دائن"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {closingPreview.data && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
                    <p className="flex justify-between">
                      <span className="text-slate-500">إجمالي الإيرادات</span>
                      <b className="text-emerald-700">
                        {Number(
                          closingPreview.data.revenueTotal
                        ).toLocaleString("en-US")}{" "}
                        YER
                      </b>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">إجمالي المصروفات</span>
                      <b className="text-rose-700">
                        {Number(
                          closingPreview.data.expenseTotal
                        ).toLocaleString("en-US")}{" "}
                        YER
                      </b>
                    </p>
                    <p className="flex justify-between border-t border-slate-200 pt-1.5">
                      <span className="font-bold text-slate-700">
                        صافي النتيجة (أرباح/خسائر)
                      </span>
                      <b
                        className={
                          closingPreview.data.netProfit >= 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }
                      >
                        {Number(closingPreview.data.netProfit).toLocaleString(
                          "en-US"
                        )}{" "}
                        YER
                      </b>
                    </p>
                  </div>
                )}

                <Button
                  className="w-full h-9 text-xs bg-ink hover:bg-ink-600 text-white font-bold"
                  disabled={
                    !closingPreview.data ||
                    closingPreview.data.rows.length === 0 ||
                    executeClosing.isPending
                  }
                  onClick={() => {
                    if (
                      !confirm(
                        `تنفيذ الإقفال لـ "${closingPeriod}"؟ ستُنشأ قيود إقفال نهائية ولا يمكن تكرارها.`
                      )
                    )
                      return;
                    executeClosing.mutate({
                      periodName: closingPeriod.trim() || "السنة المالية 2026",
                      asOfDate: closingDate || undefined,
                    });
                  }}
                >
                  {executeClosing.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-1" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 ml-1" />
                  )}
                  تنفيذ الإقفال وإنشاء قيود الإقفال
                </Button>
                <p className="text-[10px] text-slate-400 text-center">
                  تُنقل أرصدة الإيرادات والمصروفات إلى حساب النتائج (رأس المال
                  3010) كقيود مرجعية، ولا يمكن تكرارها
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Records & Reports with advanced filtering and bottom totals */}
          <TabsContent value="reports" className="space-y-3">
            <Card className="p-4 bg-white shadow-sm border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <h2 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-brand" /> تصفية وفرز
                  السجلات المالية والتقارير الرسمية
                </h2>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => setImportOpen(true)}
                    className="h-7 px-2.5 text-xs bg-sky-700 hover:bg-sky-800 text-white font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5 ml-1" /> استيراد
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExportExcel}
                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 ml-1" /> CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExportPDF}
                    className="h-7 px-2.5 text-xs bg-brand hover:bg-brand-deep text-white font-semibold"
                  >
                    <FileText className="w-3.5 h-3.5 ml-1" /> PDF / طباعة
                  </Button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">من تاريخ:</span>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                    className="h-7 text-xs font-mono bg-slate-50"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">إلى تاريخ:</span>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                    className="h-7 text-xs font-mono bg-slate-50"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-7 text-xs bg-slate-50">
                    <SelectValue placeholder="حالة الحركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      كافة الحالات
                    </SelectItem>
                    <SelectItem value="saved" className="text-xs">
                      مسودة
                    </SelectItem>
                    <SelectItem value="approved" className="text-xs">
                      معتمد
                    </SelectItem>
                    <SelectItem value="sent" className="text-xs">
                      مرسل
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statementAccountId}
                  onValueChange={setStatementAccountId}
                >
                  <SelectTrigger className="h-7 text-xs bg-slate-50">
                    <SelectValue placeholder="تخصيص الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      كافة الحسابات
                    </SelectItem>
                    {accountsData?.map((acc: any) => (
                      <SelectItem
                        key={acc.id}
                        value={String(acc.id)}
                        className="text-xs"
                      >
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto pt-2">
                {loadingTx ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-brand" />{" "}
                    جاري تحميل السجلات المالية...
                  </div>
                ) : (
                  <table className="w-full text-right border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">التاريخ الرسمي</th>
                        <th className="py-2.5 px-3">الحساب</th>
                        <th className="py-2.5 px-3">القيمة</th>
                        <th className="py-2.5 px-3">البيان</th>
                        <th className="py-2.5 px-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords && filteredRecords.length > 0 ? (
                        filteredRecords.map(tx => (
                          <tr
                            key={tx.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                              {String(tx.transactionDate).split("T")[0]}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              <span className="font-mono text-[10px] bg-slate-100 px-1 rounded ml-1.5 text-slate-600">
                                {tx.accountCode}
                              </span>
                              {tx.accountName}
                            </td>
                            <td className="py-2 px-3 font-bold font-mono text-slate-900">
                              {parseFloat(tx.amount).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {tx.narration || "-"}
                            </td>
                            <td className="py-2 px-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0.5 ${tx.lifecycleStatus === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-brand/10 text-brand-700 border-brand-200"}`}
                              >
                                {tx.lifecycleStatus === "approved"
                                  ? "معتمد ومرحل"
                                  : tx.lifecycleStatus === "sent"
                                    ? "مرسل"
                                    : "مسودة"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-slate-400 text-xs"
                          >
                            لا توجد سجلات مطابقة لمعايير التصفية والفرز المحددة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {/* Bottom Totals Summary Row */}
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-slate-800">
                          إجمالي السجلات المعروضة ({filteredRecords.length}{" "}
                          حركة):
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 font-mono text-sm text-emerald-700">
                          {filteredTotalAmount.toLocaleString()} {currency}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Tab 4: Audit Trail (سجل التدقيق الشامل) */}
          <TabsContent value="audit" className="space-y-3">
            <Card className="p-4 bg-white shadow-sm border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b pb-3">
                <ShieldAlert className="w-4 h-4 text-brand" /> سجل التدقيق
                الشامل وتتبع الحركات (Audit Trail)
              </h3>
              <p className="text-[11px] text-slate-500">
                يتتبع هذا السجل بدقة متناهية كافة العمليات الحساسة، تعديلات
                الدليل المحاسبي، السحب والإفلات، وحفظ واعتماد الحركات المالية.
              </p>

              <div className="space-y-2 pt-2">
                {activityLogsData && activityLogsData.length > 0 ? (
                  activityLogsData.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center text-xs shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {log.action}
                          </span>
                          <span className="text-[10px] bg-muted text-brand-800 px-1.5 py-0.5 rounded font-mono">
                            {log.userName || "المشرف"}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          {log.details}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-8 text-xs">
                    لا توجد سجلات تدقيق مسجلة حتى الآن.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Tab 5: Analytics & AI Advisor */}
          <TabsContent value="analytics" className="space-y-4">
            <BudgetsPanel
              transactionsData={transactionsData as any}
              currency={currency}
            />

            <Card className="border-brand-200 bg-brand-50 shadow-sm">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-brand-100">
                <CardTitle className="flex items-center gap-2 text-brand-800 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-brand" /> تحليل المساعد
                  المالي الذكي (Forge LLM)
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchAiAdvisor()}
                  disabled={aiLoading}
                  className="h-7 text-[10px] bg-white border-brand"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin ml-1" />
                  ) : (
                    "تحديث التحليل"
                  )}
                </Button>
              </CardHeader>
              <CardContent className="p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-800">
                {aiLoading ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-brand" />{" "}
                    جاري استنتاج التوصيات المالية بدقة...
                  </div>
                ) : (
                  aiAdvisorData?.analysis ||
                  "لا توجد بيانات كافية للتحليل حالياً."
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-blue-600" /> مقارنة أداء
                  الفروع والمؤسسات المتعددة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {branchComparisonData?.comparison?.map((b: any) => (
                  <div
                    key={b.id}
                    className="p-3.5 border rounded-xl bg-slate-50 shadow-sm space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-xs">
                        {b.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono"
                      >
                        {b.code}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-[11px] pt-1 border-t">
                      <div className="flex justify-between">
                        <span className="text-slate-500">الإيرادات:</span>
                        <span className="font-bold font-mono text-emerald-600">
                          {b.revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">المصروفات:</span>
                        <span className="font-bold font-mono text-rose-600">
                          {b.expenses.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-bold text-slate-900">
                        <span>صافي الدخل:</span>
                        <span className="font-mono text-blue-700">
                          {b.netProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: User Profile */}
          <TabsContent value="profile" className="space-y-3">
            <Card className="p-4 space-y-4 bg-white shadow-sm border-slate-200 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="bg-muted text-brand-800 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                  {(profileName || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">
                    {profileName || "المستخدم الحالي"}
                  </h2>
                  <p className="text-slate-500 text-[11px]">
                    {profileEmail || "user@al-husainia.com"} • الدور الوظيفي:{" "}
                    <span className="font-semibold text-brand">
                      {user?.role || "admin"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] text-slate-700 mb-1 block font-medium">
                    الاسم الشخصي / الوظيفي
                  </Label>
                  <Input
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-700 mb-1 block font-medium">
                    البريد الإلكتروني للإشعارات
                  </Label>
                  <Input
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <Button
                  onClick={() => {
                    updateProfileMutation.mutate({
                      name: profileName,
                      email: profileEmail,
                      themePreference: themePref,
                      emailNotifications: emailNotif,
                      whatsappNotifications: whatsappNotif,
                      compactMode: false,
                    });
                  }}
                  className="w-full bg-ink hover:bg-ink-600 text-white text-xs h-9 font-bold mt-2 shadow"
                >
                  حفظ وتحديث الملف الشخصي
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Bulk CSV Import Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={open => {
          setImportOpen(open);
          if (!open) {
            setImportResult(null);
            setImportText("");
          }
        }}
      >
        <DialogContent
          className="max-w-lg font-sans"
          dir="rtl"
          aria-describedby="import-desc"
        >
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 text-brand" /> استيراد جماعي
              للحركات (Excel/CSV)
            </DialogTitle>
            <DialogDescription
              id="import-desc"
              className="text-xs text-slate-600 pt-2 space-y-2"
            >
              <p>
                الصق صفوفاً بصيغة CSV — الأعمدة بالترتيب:{" "}
                <b>التاريخ، الحساب، الكود، المبلغ، البيان، النوع</b> (النوع
                اختياري). يدعم أيضاً اللصق المباشر من ملف Excel المُصدَّر.
              </p>
              <p className="text-[11px] bg-sand border border-brand-200 rounded-lg p-2.5 text-slate-700 leading-relaxed">
                <span className="font-bold text-brand">دليل سريع:</span>{" "}
                التاريخ <b>2026-08-01</b> أو <b>01/08/2026</b> · المبلغ أرقام
                فقط · النوع <b>debit</b> (مدين) أو <b>credit</b> (دائن) ويُفترض{" "}
                <b>debit</b> إن تُرك فارغاً، والمبلغ السالب يُحول دائناً
                تلقائياً · يجد النظام الحساب بكوده أو اسمه من الدليل.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={
                "التاريخ,الحساب,الكود,المبلغ,البيان,النوع\n2026-08-01,الصندوق الرئيسي,1010,5000,مبيعات نقدية,debit"
              }
              className="min-h-[140px] text-xs font-mono dir-ltr text-left rounded-lg border-slate-300"
            />
            <div className="flex items-center justify-between gap-2">
              <Select
                value={importLifecycle}
                onValueChange={v => setImportLifecycle(v as any)}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-50 w-40">
                  <SelectValue placeholder="حالة الحركات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">معتمدة</SelectItem>
                  <SelectItem value="saved">مسودة</SelectItem>
                  <SelectItem value="sent">مرسلة</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[11px] text-slate-500">
                تُطبق الحالة على كل الحركات المستوردة
              </span>
            </div>
            {importResult && (
              <div
                className={`rounded-lg border p-2.5 text-xs space-y-1.5 ${importResult.skipped.length ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}
              >
                <p className="font-bold text-slate-800">
                  النتيجة: استُورد {importResult.imported} من{" "}
                  {importResult.total}{" "}
                  {importResult.skipped.length
                    ? `— ${importResult.skipped.length} صف متخطّى`
                    : "— تم استيراد الكل بنجاح"}
                </p>
                {importResult.skipped.slice(0, 6).map((s, i) => (
                  <p key={i} className="text-[11px] text-slate-600">
                    سطر {s.line}: {s.reason}
                  </p>
                ))}
                {importResult.skipped.length > 6 && (
                  <p className="text-[11px] text-slate-500">
                    + {importResult.skipped.length - 6} ملاحظات أخرى…
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyImportTemplate}
              className="text-xs h-8"
            >
              <ClipboardCopy className="w-3.5 h-3.5 ml-1" /> نسخ قالب
            </Button>
            <Button
              size="sm"
              onClick={handleImportFromText}
              disabled={
                !importText.trim() || addBatchTransactionsMutation.isPending
              }
              className="text-xs h-8 bg-sky-700 hover:bg-sky-800 text-white font-bold"
            >
              {addBatchTransactionsMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <Upload className="w-3 h-3 ml-1" />
              )}
              استيراد الحركات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opening Balances Dialog */}
      <Dialog open={obOpen} onOpenChange={setObOpen}>
        <DialogContent className="max-w-lg font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Scale className="w-4 h-4 text-brand" /> الأرصدة الافتتاحية
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2">
              أدخل أرصدة بداية الفترة لحسابات الميزانية — الإيرادات والمصروفات
              تبدأ من صفر.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold whitespace-nowrap text-slate-700">
                الفترة:
              </Label>
              <Input
                value={obPeriod}
                onChange={e => setObPeriod(e.target.value)}
                className="h-8 text-xs bg-slate-50"
              />
            </div>
            <div className="max-h-[44vh] overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
              {obLoading && (
                <p className="text-xs text-slate-500 py-4 text-center">
                  جاري تحميل الأرصدة…
                </p>
              )}
              {!obLoading && obRows.length === 0 && (
                <p className="text-xs text-slate-500 py-4 text-center">
                  لا توجد حسابات ميزانية (أصول/خصوم/حقوق ملكية) — أضفها أولاً من
                  دليل الحسابات.
                </p>
              )}
              {!obLoading &&
                obRows.map(r => (
                  <div
                    key={r.accountId}
                    className="flex items-center gap-2 text-xs py-1.5 border-b border-dashed border-slate-200 last:border-0"
                  >
                    <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-700">
                      {r.code}
                    </span>
                    <span className="flex-1 truncate text-slate-800">
                      {r.name}
                    </span>
                    <Select
                      value={r.type}
                      onValueChange={v => updateObRow(r.accountId, "type", v)}
                    >
                      <SelectTrigger className="h-7 w-20 text-[11px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit" className="text-xs">
                          مدين
                        </SelectItem>
                        <SelectItem value="credit" className="text-xs">
                          دائن
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={r.amount}
                      onChange={e =>
                        updateObRow(r.accountId, "amount", e.target.value)
                      }
                      className="h-7 w-28 text-xs font-mono text-left bg-white"
                    />
                  </div>
                ))}
            </div>
            <p className="text-[11px] text-slate-500">
              الأرصدة تدخل مباشرة في ميزان المراجعة والميزانية العمومية لنفس
              الفترة.
            </p>
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setObOpen(false)}
              className="text-xs h-8"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleObSave}
              disabled={saveOpeningBalancesMutation.isPending}
              className="text-xs h-8 bg-brand hover:bg-brand-deep text-white font-bold"
            >
              {saveOpeningBalancesMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <Save className="w-3 h-3 ml-1" />
              )}
              حفظ الأرصدة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Drag and Drop Move */}
      <Dialog
        open={!!pendingMove}
        onOpenChange={open => !open && setPendingMove(null)}
      >
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Network className="w-4 h-4 text-brand" /> تأكيد إعادة ترتيب
              الحساب الشجري
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2">
              هل أنت متأكد من رغبتك في نقل الحساب{" "}
              <span className="font-bold text-slate-900">
                "{pendingMove?.accountName}"
              </span>{" "}
              ليكون تابعاً تحت الحساب الرئيسي{" "}
              <span className="font-bold text-brand-700">
                "{pendingMove?.parentName}"
              </span>
              ؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingMove(null)}
              className="text-xs h-8"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (pendingMove) {
                  moveAccountMutation.mutate({
                    accountId: pendingMove.accountId,
                    newParentAccountId: pendingMove.newParentAccountId,
                  });
                }
              }}
              disabled={moveAccountMutation.isPending}
              className="text-xs h-8 bg-brand hover:bg-brand-deep text-white font-bold"
            >
              {moveAccountMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <Check className="w-3 h-3 ml-1" />
              )}
              تأكيد وحفظ النقل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-ink border-t border-ink-600 z-50 text-white py-1.5 px-4 shadow-2xl">
        <div className="max-w-md mx-auto flex justify-around items-center text-[10px]">
          <button
            onClick={() => setActiveTab("entry")}
            className={`flex flex-col items-center gap-0.5 ${activeTab === "entry" ? "text-brand-300 font-bold" : "text-slate-400 hover:text-white"}`}
          >
            <Plus className="w-4 h-4" />
            <span>الإدخال</span>
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`flex flex-col items-center gap-0.5 ${activeTab === "accounts" ? "text-brand-300 font-bold" : "text-slate-400 hover:text-white"}`}
          >
            <BookOpen className="w-4 h-4" />
            <span>الدليل</span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex flex-col items-center gap-0.5 ${activeTab === "reports" ? "text-brand-300 font-bold" : "text-slate-400 hover:text-white"}`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>التقارير</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex flex-col items-center gap-0.5 ${activeTab === "audit" ? "text-brand-300 font-bold" : "text-slate-400 hover:text-white"}`}
          >
            <History className="w-4 h-4" />
            <span>التدقيق</span>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex flex-col items-center gap-0.5 ${activeTab === "analytics" ? "text-brand-300 font-bold" : "text-slate-400 hover:text-white"}`}
          >
            <Sparkles className="w-4 h-4" />
            <span>التحليلات</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-0.5 ${activeTab === "profile" ? "text-brand-300 font-bold" : "text-slate-400 hover:text-white"}`}
          >
            <User className="w-4 h-4" />
            <span>الملف</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
