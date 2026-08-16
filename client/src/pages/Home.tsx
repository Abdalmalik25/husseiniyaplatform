import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useOffline } from "@/lib/offline/OfflineContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Building2, Plus, Search, Settings, 
  BookOpen, BarChart3, LogOut, Save, Check, 
  FileSpreadsheet, FileText, Sparkles, PieChart, Loader2, Filter, Layers, History, User, UserCheck, Wifi, WifiOff, Power, PowerOff, Network, ShieldAlert, GripVertical, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  let { user, isAuthenticated, logout, loading: authLoading, refresh } = useAuth();
  const utils = trpc.useUtils();
  const { isOnline, isSyncing, syncNow, lastSyncResult } = useOffline();

  const [activeTab, setActiveTab] = useState<"entry" | "accounts" | "reports" | "audit" | "analytics" | "profile">("entry");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Defer non-critical queries (audit log, branch comparison, AI advisor) so the
  // first paint only waits for the core batch (settings/accounts/tx/summary).
  const [deferHeavyQueries, setDeferHeavyQueries] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDeferHeavyQueries(true), 700);
    return () => clearTimeout(t);
  }, []);

  // Queries
  const { data: settingsData } = trpc.accounting.getSettings.useQuery();
  const { data: accountsData, refetch: refetchAccounts, isLoading: loadingAccounts } = trpc.accounting.getAccounts.useQuery();
  const { data: transactionsData, refetch: refetchTransactions, isLoading: loadingTx } = trpc.accounting.getTransactions.useQuery();
  const { data: summaryData, refetch: refetchSummary, isLoading: loadingSummary } = trpc.accounting.getDashboardSummary.useQuery();
  const { data: activityLogsData, refetch: refetchActivityLogs } = trpc.auth.getActivityLogs.useQuery(undefined, { enabled: deferHeavyQueries });
  const { data: branchComparisonData } = trpc.accounting.getBranchPerformanceComparison.useQuery(undefined, { enabled: deferHeavyQueries });
  const { data: aiAdvisorData, refetch: refetchAiAdvisor, isLoading: aiLoading } = trpc.accounting.getAiFinancialAdvisorAnalysis.useQuery(undefined, { enabled: deferHeavyQueries });

  // Local States
  const [instName, setInstName] = useState("ALHUSAINIA | مركز العمليات المالية");
  const [currency, setCurrency] = useState("ريال يمني (YER)");
  const [batchRows, setBatchRows] = useState<Record<number, { amount: string; narration: string }>>({});
  const [accountQuery, setAccountQuery] = useState("");
  const [accountViewMode, setAccountViewMode] = useState<"tree" | "list">("tree");
  const [draggedAccountId, setDraggedAccountId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null); // For visual highlight

  // Confirmation Modal for Drag & Drop Move
  const [pendingMove, setPendingMove] = useState<{ accountId: number; newParentAccountId: number | null; accountName: string; parentName: string } | null>(null);

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
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split('T')[0]);

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
  useEffect(() => {
    animateNumber("revenue", summaryData?.totalRevenue || 0);
    animateNumber("expense", summaryData?.totalExpense || 0);
    animateNumber("net", summaryData?.netIncome || 0);
    animateNumber("assets", summaryData?.totalAssets || 0);
  }, [summaryData]);
  const animateNumber = (key: string, target: number) => {
    const started = performance.now();
    const duration = 650;
    const from = kpiNumbers[key] || 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setKpiNumbers(prev => ({ ...prev, [key]: Math.round(from + (target - from) * eased) }));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const countUp = (key: string, value: number | undefined | null): string =>
    (kpiNumbers[key] !== undefined ? kpiNumbers[key] : Number(value || 0)).toLocaleString();

  // Mutations
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الملف الشخصي بنجاح");
      if (refresh) refresh();
      refetchActivityLogs();
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`)
  });

  const addBatchTransactionsMutation = trpc.accounting.addBatchTransactions.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ واعتماد الحركات بنجاح وتوثيقها في سجل التدقيق.");
      refetchTransactions();
      refetchSummary();
      refetchActivityLogs();
      setBatchRows({});
      setQuickAmount("");
      setQuickNarration("");
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`)
  });

  const updateAccountMutation = trpc.accounting.updateAccount.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الحساب وتسجيل التعديل في سجل التدقيق");
      refetchAccounts();
      refetchActivityLogs();
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`)
  });

  const moveAccountMutation = trpc.accounting.moveAccount.useMutation({
    onSuccess: () => {
      toast.success("تم نقل وإعادة ترتيب الحساب في الشجرة بنجاح وتوثيق العملية");
      refetchAccounts();
      refetchActivityLogs();
      setPendingMove(null);
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`)
  });

  const createAccountMutation = trpc.accounting.addAccount.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الحساب الجديد بنجاح وتوثيقه في سجل التدقيق");
      refetchAccounts();
      refetchActivityLogs();
      setNewAccCode("");
      setNewAccName("");
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`)
  });

  const updateSettingsMutation = trpc.accounting.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث إعدادات المؤسسة بنجاح");
      setIsSettingsOpen(false);
    },
    onError: (err: any) => toast.error(`خطأ: ${err.message}`)
  });

  // Filtered Accounts
  const activeAccountsForEntry = useMemo(() => {
    if (!accountsData) return [];
    return accountsData.filter(a => 
      a.isActive && (a.name.includes(accountQuery) || a.code.includes(accountQuery))
    );
  }, [accountsData, accountQuery]);

  const filteredAccountsManagement = useMemo(() => {
    if (!accountsData) return [];
    return accountsData.filter(a => 
      a.name.includes(accountQuery) || a.code.includes(accountQuery) || a.type.includes(accountQuery)
    );
  }, [accountsData, accountQuery]);

  // Grouped Accounts for Tree View with Parent-Child Support
  const accountsTree = useMemo(() => {
    if (!accountsData) return {};
    const categories: Record<string, { roots: any[], childrenMap: Record<number, any[]> }> = {
      asset: { roots: [], childrenMap: {} },
      liability: { roots: [], childrenMap: {} },
      equity: { roots: [], childrenMap: {} },
      revenue: { roots: [], childrenMap: {} },
      expense: { roots: [], childrenMap: {} }
    };

    filteredAccountsManagement.forEach(acc => {
      const cat = acc.type || 'asset';
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
  }, [filteredAccountsManagement]);

  // Filtered & Sorted Transactions with Totals
  const filteredRecords = useMemo(() => {
    if (!transactionsData) return [];
    return transactionsData.filter(tx => {
      const matchStatus = filterStatus === 'all' || tx.lifecycleStatus === filterStatus;
      const matchAccount = statementAccountId === 'all' || String(tx.accountId) === statementAccountId;
      
      let matchDate = true;
      const txDateStr = String(tx.transactionDate).split('T')[0];
      if (filterStartDate && txDateStr < filterStartDate) matchDate = false;
      if (filterEndDate && txDateStr > filterEndDate) matchDate = false;

      return matchStatus && matchAccount && matchDate;
    });
  }, [transactionsData, filterStatus, statementAccountId, filterStartDate, filterEndDate]);

  const filteredTotalAmount = useMemo(() => {
    return filteredRecords.reduce((sum, tx) => sum + parseFloat(String(tx.amount || 0)), 0);
  }, [filteredRecords]);

  const handleQuickEntry = () => {
    if (!quickAccountId || !quickAmount) {
      toast.error("الرجاء اختيار الحساب وإدخال القيمة المطلوبة");
      return;
    }
    addBatchTransactionsMutation.mutate({
      lifecycleStatus: "approved",
      rows: [{
        accountId: Number(quickAccountId),
        amount: quickAmount,
        narration: quickNarration || "حركة إدخال سريع",
        transactionDate: quickDate
      }]
    });
  };

  const handleExportExcel = () => {
    toast.success("جاري تصدير التقارير بصيغة Excel (CSV) الرسمية");
    let csv = "data:text/csv;charset=utf-8,\uFEFFالتاريخ,الحساب,الكود,القيمة,البيان,الحالة\n";
    filteredRecords.forEach(tx => {
      csv += `${String(tx.transactionDate).split('T')[0]},${tx.accountName},${tx.accountCode},${tx.amount},${tx.narration || ""},${tx.lifecycleStatus}\n`;
    });
    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ALHUSAINIA_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    toast.success("جاري تجهيز تقارير الطباعة والتصدير بصيغة PDF الرسمية");
    window.print();
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-[#0d1b1c] flex flex-col items-center justify-center p-4 text-white" dir="rtl">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="bg-[#b87945] text-[#102a2b] w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-bold shadow-lg">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold font-display">ALHUSAINIA | نظام الحسابات</h1>
          <p className="text-sm text-slate-400">مؤسسة الحسينية لخدمات الأعمال</p>
          <Card className="bg-[#162e30] border-[#1e3a3c] text-white p-6 space-y-4 shadow-xl">
            <p className="text-xs text-slate-400">الرجاء تسجيل الدخول للوصول لنظام الحسابات — عزل تام للبيانات ومعايير موثوقة</p>
            <Button onClick={() => startLogin()} className="w-full bg-[#b87945] hover:bg-[#a06838] text-xs h-10 font-bold text-[#102a2b]">
              تسجيل الدخول الآمن
            </Button>
          </Card>
          <div className="mt-4 rounded-2xl border border-[#1e3a3c] bg-[#0d1b1c]/80 p-5 text-right">
            <h3 className="text-sm font-bold text-[#b87945] mb-3">جرّب النظام مجاناً</h3>
            <p className="text-xs text-slate-400 leading-6 mb-3">نظام محاسبي متكامل لإدارة حساباتك — بدون بطاقة ائتمان، ابدأ الآن.</p>
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
    <div className={`min-h-screen ${themePref === 'dark' ? 'bg-[#0d1b1c] text-[#f0ebe3]' : 'bg-[#fbf8f2] text-[#102a2b]'} pb-28`} dir="rtl">
      {/* Header */}
      <header className="bg-[#102a2b] text-white shadow-md sticky top-0 z-50 border-b border-[#1e3a3c]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#b87945] text-[#102a2b] p-1.5 rounded-lg font-bold shadow">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold tracking-wide font-display">{instName}</h1>
              <div className="flex items-center gap-2 text-[10px] text-[#b87945] font-mono">
                <span className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => setActiveTab("profile")}>
                  <UserCheck className="w-3 h-3" /> المستخدم: {user?.name || "مشرف المؤسسة"}
                </span>
                {isOnline ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    {isSyncing ? (
                      <><RefreshCw className="w-2.5 h-2.5 animate-spin" /> جاري المزامنة...</>
                    ) : (
                      <><Wifi className="w-2.5 h-2.5" /> متصل</>
                    )}
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-0.5"><WifiOff className="w-2.5 h-2.5" /> أوفلاين — البيانات محفوظة محلياً</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-[#1e3a3c] border-[#2a4e50] text-white h-7 text-[11px] px-2 hover:bg-[#1e3a3c]">
              <Settings className="w-3 h-3 ml-1" /> إعدادات المؤسسة
            </Button>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="text-red-400 h-7 px-2 text-[11px] hover:bg-[#1e3a3c]">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {isSettingsOpen && (
          <div className="bg-[#1e3a3c] border-t border-[#2a4e50] px-4 py-2.5">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-300 font-medium">اسم المؤسسة:</span>
              <Input
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                className="bg-[#102a2b] border-[#2a4e50] text-white text-xs h-7 w-48"
              />
              <span className="text-slate-300 font-medium mr-2">العملة:</span>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-[#102a2b] border-[#2a4e50] text-white text-xs h-7 w-28"
              />
              <Button
                size="sm"
                className="bg-[#b87945] hover:bg-[#a06838] h-7 text-xs px-3 font-bold"
                onClick={() => {
                  updateSettingsMutation.mutate({
                    institutionName: instName,
                    currency: currency,
                    accountingPeriod: settingsData?.accountingPeriod || new Date().getFullYear().toString(),
                  });
                }}
              >
                حفظ التغييرات
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Download & Subscribe Banner */}
      <div className="bg-gradient-to-l from-[#102a2b] to-[#1a3d3f] text-white mx-3 mt-3 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-[#b87945] text-[#102a2b] w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display">جرّب نظام ALHUSAINIA المحاسبي مجاناً</h3>
            <p className="text-[11px] text-white/60">نظام متكامل لإدارة حساباتك — بدون بطاقة ائتمان</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs font-bold h-8 px-4" onClick={() => window.open('https://husseiniya-platform.vercel.app/credits', '_blank')}>
            اشترك الآن
          </Button>
          <Button size="sm" variant="outline" className="border-white/30 text-white text-xs h-8 px-4 hover:bg-white/10" onClick={() => window.open('https://husseiniya-platform.vercel.app', '_blank')}>
            زيارة الموقع
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 mt-3 space-y-4">
{/* KPI Summary Cards */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-4 bg-white shadow-sm flex items-center justify-center h-20">
              <Loader2 className="w-5 h-5 animate-spin text-[#b87945]" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card onClick={() => setActiveTab("reports")} className="p-3 bg-emerald-50 border-emerald-200 shadow-sm transition-all hover:shadow cursor-pointer group" title="عرض تقارير الإيرادات">
            <p className="text-[10px] text-emerald-700 font-bold">إجمالي الإيرادات</p>
            <p className="text-sm font-bold text-emerald-900 mt-1 font-mono group-hover:underline">{countUp("revenue", summaryData?.totalRevenue)} {currency}</p>
          </Card>
          <Card onClick={() => setActiveTab("reports")} className="p-3 bg-rose-50 border-rose-200 shadow-sm transition-all hover:shadow cursor-pointer group" title="عرض تقارير المصروفات">
            <p className="text-[10px] text-rose-700 font-bold">إجمالي المصروفات</p>
            <p className="text-sm font-bold text-rose-900 mt-1 font-mono group-hover:underline">{countUp("expense", summaryData?.totalExpense)} {currency}</p>
          </Card>
          <Card onClick={() => setActiveTab("analytics")} className="p-3 bg-blue-50 border-blue-200 shadow-sm transition-all hover:shadow cursor-pointer group" title="عرض التحليلات">
            <p className="text-[10px] text-blue-700 font-bold">صافي الدخل التشغيلي</p>
            <p className="text-sm font-bold text-blue-900 mt-1 font-mono group-hover:underline">{countUp("net", summaryData?.netIncome)} {currency}</p>
          </Card>
          <Card onClick={() => setActiveTab("accounts")} className="p-3 bg-slate-100 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer group" title="فتح دليل الحسابات">
            <p className="text-[10px] text-slate-700 font-bold">إجمالي الأصول</p>
            <p className="text-sm font-bold text-slate-900 mt-1 font-mono group-hover:underline">{countUp("assets", summaryData?.totalAssets)} {currency}</p>
          </Card>
        </div>
      )}

      {/* Onboarding empty state: first-time welcome + guided quick action */}
      {!loadingSummary && summaryData && summaryData.totalRevenue === 0 && summaryData.totalExpense === 0 && (transactionsData?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-[#e8c9a0] bg-gradient-to-l from-[#fbf6ee] to-[#f5ece0] p-4 md:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#b87945] text-[#102a2b] w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#5c3d1e]">مرحباً بك! منصة الحسينية جاهزة للانطلاق</h3>
              <p className="text-[11px] text-[#7a5228] mt-0.5">الأصول والدليل المحاسبي (12 حساباً) مُجهّزون. ابدأ بتسجيل أول حركة مالية — سيُترحّل فوراً ويرصد في السجل والتدقيق والتقارير.</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setActiveTab("entry")} className="bg-[#b87945] hover:bg-[#a06838] text-white text-xs font-bold h-8 px-4 shrink-0">
            <Plus className="w-3.5 h-3.5 ml-1" /> ابدأ الإدخال السريع
          </Button>
        </div>
      )}

      {/* Quick actions row */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setActiveTab("entry")} className="h-8 text-xs border-[#e8c9a0] bg-white text-[#5c3d1e] hover:bg-[#faf5ed]">
          <Plus className="w-3.5 h-3.5 ml-1 text-[#b87945]" /> إدخال سريع
        </Button>
        <Button size="sm" variant="outline" onClick={() => setActiveTab("reports")} className="h-8 text-xs border-[#e8c9a0] bg-white text-[#5c3d1e] hover:bg-[#faf5ed]">
          <FileText className="w-3.5 h-3.5 ml-1 text-[#b87945]" /> السجل والتقارير
        </Button>
        <Button size="sm" variant="outline" onClick={() => (window.location.href = "/commercial")} className="h-8 text-xs border-[#e8c9a0] bg-white text-[#5c3d1e] hover:bg-[#faf5ed]">
          <Layers className="w-3.5 h-3.5 ml-1 text-[#b87945]" /> المحاسبة التجارية
        </Button>
        <Button size="sm" variant="outline" onClick={() => setActiveTab("analytics")} className="h-8 text-xs border-[#e8c9a0] bg-white text-[#5c3d1e] hover:bg-[#faf5ed]">
          <BarChart3 className="w-3.5 h-3.5 ml-1 text-[#b87945]" /> التحليلات والمساعد الذكي
        </Button>
      </div>

        {/* Quick Transaction Entry Widget */}
        <Card className="border-[#e8c9a0] bg-[#faf5ed] shadow-sm">
          <CardHeader className="py-2.5 px-4 border-b border-[#f0dfc8] bg-[#f5ece0] flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-[#5c3d1e] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#7a5228]" /> أداة الإدخال السريع للمعاملات اليومية (اعتماد فوري)
            </CardTitle>
            <span className="text-[10px] text-[#7a5228] font-mono">تاريخ الحركة: {quickDate}</span>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
              <Select value={quickAccountId} onValueChange={setQuickAccountId}>
                <SelectTrigger className="h-8 text-xs bg-white border-[#e8c9a0]">
                  <SelectValue placeholder="اختر الحساب النشط..." />
                </SelectTrigger>
                <SelectContent>
                  {activeAccountsForEntry.map(acc => (
                    <SelectItem key={acc.id} value={String(acc.id)} className="text-xs">
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="قيمة المبلغ..."
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                className="h-8 text-xs bg-white border-[#e8c9a0] font-bold"
              />
              <Input
                placeholder="البيان أو وصف الحركة (اختياري)..."
                value={quickNarration}
                onChange={(e) => setQuickNarration(e.target.value)}
                className="h-8 text-xs bg-white border-[#e8c9a0]"
              />
              <Button
                onClick={handleQuickEntry}
                disabled={addBatchTransactionsMutation.isPending}
                className="h-8 bg-[#b87945] hover:bg-[#a06838] text-white text-xs font-bold"
              >
                {addBatchTransactionsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Check className="w-3 h-3 ml-1" />}
                تسجيل واعتماد سريع
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Operational Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid grid-cols-6 bg-slate-200 h-9 p-1 rounded-xl text-xs mb-3 shadow-inner">
            <TabsTrigger value="entry" className="text-[10px] sm:text-xs font-semibold">الإدخال</TabsTrigger>
            <TabsTrigger value="accounts" className="text-[10px] sm:text-xs font-semibold">الدليل الشجري</TabsTrigger>
            <TabsTrigger value="reports" className="text-[10px] sm:text-xs font-semibold">السجل والتقارير</TabsTrigger>
            <TabsTrigger value="audit" className="text-[10px] sm:text-xs font-semibold">سجل التدقيق</TabsTrigger>
            <TabsTrigger value="analytics" className="text-[10px] sm:text-xs font-semibold">التحليلات</TabsTrigger>
            <TabsTrigger value="profile" className="text-[10px] sm:text-xs font-semibold">الملف</TabsTrigger>
          </TabsList>

          {/* Tab 1: Batch Entry */}
          <TabsContent value="entry" className="space-y-3">
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b py-2.5 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#b87945]" /> جدول الإدخال السريع متعدد الحسابات (الحسابات النشطة فقط)
                </CardTitle>
                <div className="relative">
                  <Search className="absolute right-2.5 top-2 w-3 h-3 text-slate-400" />
                  <Input
                    placeholder="بحث في الحسابات النشطة..."
                    value={accountQuery}
                    onChange={(e) => setAccountQuery(e.target.value)}
                    className="pr-7 h-7 text-xs w-48 bg-white"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingAccounts ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-[#b87945]" /> جاري تحميل الحسابات النشطة...
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
                        <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded ml-2 border">{acc.code}</span>
                            <span className="font-medium text-slate-900">{acc.name}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <Input
                              type="number"
                              value={batchRows[acc.id]?.amount || ""}
                              onChange={(e) => setBatchRows({ ...batchRows, [acc.id]: { ...batchRows[acc.id], amount: e.target.value } })}
                              className="h-7 text-xs font-bold text-center font-mono bg-slate-50"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <Input
                              value={batchRows[acc.id]?.narration || ""}
                              onChange={(e) => setBatchRows({ ...batchRows, [acc.id]: { ...batchRows[acc.id], narration: e.target.value } })}
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
            <div className="flex justify-end gap-2 bg-[#102a2b] p-2.5 rounded-xl sticky bottom-16 shadow-lg border border-[#1e3a3c]">
              <Button
                size="sm"
                onClick={() => {
                  const rows = Object.entries(batchRows)
                    .filter(([_, val]) => val.amount && parseFloat(val.amount) > 0)
                    .map(([id, val]) => ({
                      accountId: Number(id),
                      amount: val.amount,
                      narration: val.narration || "حركة مجمعة",
                      transactionDate: new Date().toISOString().split('T')[0]
                    }));
                  if (rows.length === 0) {
                    toast.error("الرجاء إدخال قيمة في حساب واحد على الأقل");
                    return;
                  }
                  addBatchTransactionsMutation.mutate({ lifecycleStatus: "saved", rows });
                }}
                disabled={addBatchTransactionsMutation.isPending}
                className="bg-[#1e3a3c] hover:bg-[#1e3a3c] text-white text-xs h-8 px-3 font-semibold"
              >
                <Save className="w-3.5 h-3.5 ml-1 text-[#d4a574]" /> حفظ مسودة
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const rows = Object.entries(batchRows)
                    .filter(([_, val]) => val.amount && parseFloat(val.amount) > 0)
                    .map(([id, val]) => ({
                      accountId: Number(id),
                      amount: val.amount,
                      narration: val.narration || "حركة مجمعة",
                      transactionDate: new Date().toISOString().split('T')[0]
                    }));
                  if (rows.length === 0) {
                    toast.error("الرجاء إدخال قيمة في حساب واحد على الأقل");
                    return;
                  }
                  addBatchTransactionsMutation.mutate({ lifecycleStatus: "approved", rows });
                }}
                disabled={addBatchTransactionsMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-4 font-bold shadow"
              >
                {addBatchTransactionsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <Check className="w-3.5 h-3.5 ml-1" />}
                اعتماد وترحيل فوري
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: Chart of Accounts with Drag and Drop Tree View & Advanced Search */}
          <TabsContent value="accounts" className="space-y-4">
            {/* Add New Account Card */}
            <Card className="p-4 bg-white shadow-sm border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#b87945]" /> إضافة حساب جديد إلى الدليل الشجري
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center text-xs">
                <Input
                  placeholder="كود الحساب (مثال: 1020)..."
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="h-8 font-mono bg-slate-50"
                />
                <Input
                  placeholder="اسم الحساب..."
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="h-8 bg-slate-50"
                />
                <Select value={newAccCategory} onValueChange={setNewAccCategory}>
                  <SelectTrigger className="h-8 bg-slate-50">
                    <SelectValue placeholder="طبيعة الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset" className="text-xs">الأصول (Assets)</SelectItem>
                    <SelectItem value="liability" className="text-xs">الخصوم (Liabilities)</SelectItem>
                    <SelectItem value="equity" className="text-xs">حقوق الملكية (Equity)</SelectItem>
                    <SelectItem value="revenue" className="text-xs">الإيرادات (Revenues)</SelectItem>
                    <SelectItem value="expense" className="text-xs">المصروفات (Expenses)</SelectItem>
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
                      description: "حساب شجري فرعي"
                    });
                  }}
                  disabled={createAccountMutation.isPending}
                  className="h-8 bg-[#b87945] hover:bg-[#a06838] text-white font-bold"
                >
                  {createAccountMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <Plus className="w-3.5 h-3.5 ml-1" />}
                  إضافة الحساب
                </Button>
              </div>
            </Card>

            {/* Tree View / List View Header & Search with Drag and Drop */}
            <Card className="p-4 bg-white shadow-sm border-slate-200 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-[#b87945]" /> العرض الشجري المتقدم (اسحب وأفلت لإعادة الترتيب)
                  </h3>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px]">
                    <button
                      onClick={() => setAccountViewMode("tree")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${accountViewMode === 'tree' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                      شجري (Tree)
                    </button>
                    <button
                      onClick={() => setAccountViewMode("list")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${accountViewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
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
                    onChange={(e) => setAccountQuery(e.target.value)}
                    className="pr-7 h-7 text-xs bg-slate-50"
                  />
                </div>
              </div>

              {loadingAccounts ? (
                <div className="py-12 flex items-center justify-center gap-2 text-slate-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-[#b87945]" /> جاري تحميل الدليل الشجري...
                </div>
              ) : accountViewMode === 'tree' ? (
                <div className="space-y-3 pt-2">
                  {[
                    { key: 'asset', label: 'الأصول (Assets)', color: 'border-emerald-200 bg-emerald-50/40 text-emerald-900' },
                    { key: 'liability', label: 'الخصوم (Liabilities)', color: 'border-blue-200 bg-blue-50/40 text-blue-900' },
                    { key: 'equity', label: 'حقوق الملكية (Equity)', color: 'border-purple-200 bg-purple-50/40 text-purple-900' },
                    { key: 'revenue', label: 'الإيرادات (Revenues)', color: 'border-[#e8c9a0] bg-[#faf5ed] text-[#5c3d1e]' },
                    { key: 'expense', label: 'المصروفات (Expenses)', color: 'border-rose-200 bg-rose-50/40 text-rose-900' },
                  ].map(group => {
                    const groupData = accountsTree[group.key] || { roots: [], childrenMap: {} };
                    const roots = groupData.roots;
                    if (roots.length === 0 && Object.keys(groupData.childrenMap).length === 0) return null;

                    return (
                      <div 
                        key={group.key} 
                        className={`p-3 rounded-xl border ${group.color} space-y-2 transition-all ${dropTargetId === -100 ? 'ring-2 ring-[#b87945] bg-[#f5ece0]/60' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDropTargetId(-100);
                        }}
                        onDragLeave={() => setDropTargetId(null)}
                        onDrop={() => {
                          setDropTargetId(null);
                          if (draggedAccountId !== null) {
                            const accObj = accountsData?.find((a: any) => a.id === draggedAccountId);
                            setPendingMove({
                              accountId: draggedAccountId,
                              newParentAccountId: null,
                              accountName: accObj?.name || "الحساب",
                              parentName: "الجذر الرئيسي"
                            });
                            setDraggedAccountId(null);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center font-bold text-xs border-b pb-1.5 border-current/10">
                          <span>📁 {group.label} (أفلت هنا لتجعله جذراً رئيسياً)</span>
                          <span className="font-mono text-[10px] bg-white/80 px-2 py-0.5 rounded shadow-sm">({roots.length} جذر رئيسي)</span>
                        </div>
                        <div className="space-y-2 pr-2">
                          {roots.map((rootAcc: any) => {
                            const children = groupData.childrenMap[rootAcc.id] || [];
                            const isTarget = dropTargetId === rootAcc.id;
                            return (
                              <div
                                key={rootAcc.id}
                                draggable
                                onDragStart={() => setDraggedAccountId(rootAcc.id)}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDropTargetId(rootAcc.id);
                                }}
                                onDragLeave={() => setDropTargetId(null)}
                                onDrop={(e) => {
                                  e.stopPropagation();
                                  setDropTargetId(null);
                                  if (draggedAccountId !== null && draggedAccountId !== rootAcc.id) {
                                    const accObj = accountsData?.find((a: any) => a.id === draggedAccountId);
                                    setPendingMove({
                                      accountId: draggedAccountId,
                                      newParentAccountId: rootAcc.id,
                                      accountName: accObj?.name || "الحساب",
                                      parentName: rootAcc.name
                                    });
                                    setDraggedAccountId(null);
                                  }
                                }}
                                className={`p-2.5 rounded-lg bg-white/95 border transition-all ${isTarget ? 'border-amber-500 ring-2 ring-[#d4a574] bg-[#b87945]/10 shadow-md scale-[1.01]' : 'border-slate-200 shadow-sm'} space-y-2 cursor-grab active:cursor-grabbing`}
                              >
                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border text-slate-800 font-bold">{rootAcc.code}</span>
                                    <span className="font-bold text-slate-900">{rootAcc.name}</span>
                                    <Badge variant="outline" className={`text-[9px] ${rootAcc.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                      {rootAcc.isActive ? 'نشط' : 'موقف'}
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
                                        isActive: newStatus
                                      });
                                    }}
                                    className={`h-6 px-2 text-[10px] ${rootAcc.isActive ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                                  >
                                    {rootAcc.isActive ? <><PowerOff className="w-3 h-3 ml-1" /> إيقاف</> : <><Power className="w-3 h-3 ml-1" /> تنشيط</>}
                                  </Button>
                                </div>

                                {/* Children Sub-accounts */}
                                {children.length > 0 && (
                                  <div className="pr-6 border-r-2 border-[#b87945] space-y-1.5 pt-1">
                                    {children.map((child: any) => (
                                      <div
                                        key={child.id}
                                        draggable
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          setDraggedAccountId(child.id);
                                        }}
                                        className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between items-center text-xs shadow-xs cursor-grab active:cursor-grabbing"
                                      >
                                        <div className="flex items-center gap-2">
                                          <GripVertical className="w-3 h-3 text-slate-400" />
                                          <span className="text-slate-400">└─</span>
                                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border text-slate-700 font-bold text-[11px]">{child.code}</span>
                                          <span className="font-medium text-slate-900">{child.name}</span>
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
                                              isActive: newStatus
                                            });
                                          }}
                                          className={`h-5 px-1.5 text-[9px] ${child.isActive ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                                        >
                                          {child.isActive ? 'إيقاف' : 'تنشيط'}
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
                    <div key={acc.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex justify-between items-center text-xs shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono bg-white px-2.5 py-1 rounded border text-slate-800 font-bold">{acc.code}</span>
                        <div>
                          <span className="font-bold text-slate-900 block">{acc.name}</span>
                          <span className="text-[10px] text-slate-500">التصنيف: {acc.category || acc.type}</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${acc.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {acc.isActive ? 'نشط' : 'موقف'}
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
                            isActive: newStatus
                          });
                        }}
                        className={`h-7 px-2 text-[11px] ${acc.isActive ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                      >
                        {acc.isActive ? <><PowerOff className="w-3 h-3 ml-1" /> إيقاف</> : <><Power className="w-3 h-3 ml-1" /> تنشيط</>}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab 3: Records & Reports with advanced filtering and bottom totals */}
          <TabsContent value="reports" className="space-y-3">
            <Card className="p-4 bg-white shadow-sm border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <h2 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-[#b87945]" /> تصفية وفرز السجلات المالية والتقارير الرسمية
                </h2>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" onClick={handleExportExcel} className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    <FileSpreadsheet className="w-3.5 h-3.5 ml-1" /> Excel
                  </Button>
                  <Button size="sm" onClick={handleExportPDF} className="h-7 px-2.5 text-xs bg-[#b87945] hover:bg-[#a06838] text-white font-semibold">
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
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="h-7 text-xs font-mono bg-slate-50"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">إلى تاريخ:</span>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="h-7 text-xs font-mono bg-slate-50"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-7 text-xs bg-slate-50">
                    <SelectValue placeholder="حالة الحركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">كافة الحالات</SelectItem>
                    <SelectItem value="saved" className="text-xs">مسودة</SelectItem>
                    <SelectItem value="approved" className="text-xs">معتمد</SelectItem>
                    <SelectItem value="sent" className="text-xs">مرسل</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statementAccountId} onValueChange={setStatementAccountId}>
                  <SelectTrigger className="h-7 text-xs bg-slate-50">
                    <SelectValue placeholder="تخصيص الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">كافة الحسابات</SelectItem>
                    {accountsData?.map((acc: any) => (
                      <SelectItem key={acc.id} value={String(acc.id)} className="text-xs">
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
                    <Loader2 className="w-5 h-5 animate-spin text-[#b87945]" /> جاري تحميل السجلات المالية...
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
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{String(tx.transactionDate).split('T')[0]}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              <span className="font-mono text-[10px] bg-slate-100 px-1 rounded ml-1.5 text-slate-600">{tx.accountCode}</span>
                              {tx.accountName}
                            </td>
                            <td className="py-2 px-3 font-bold font-mono text-slate-900">{parseFloat(tx.amount).toLocaleString()}</td>
                            <td className="py-2 px-3 text-slate-600">{tx.narration || "-"}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${tx.lifecycleStatus === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#b87945]/10 text-[#7a5228] border-[#e8c9a0]'}`}>
                                {tx.lifecycleStatus === 'approved' ? 'معتمد ومرحل' : tx.lifecycleStatus === 'sent' ? 'مرسل' : 'مسودة'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            لا توجد سجلات مطابقة لمعايير التصفية والفرز المحددة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {/* Bottom Totals Summary Row */}
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-slate-800">إجمالي السجلات المعروضة ({filteredRecords.length} حركة):</td>
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
                <ShieldAlert className="w-4 h-4 text-[#b87945]" /> سجل التدقيق الشامل وتتبع الحركات (Audit Trail)
              </h3>
              <p className="text-[11px] text-slate-500">يتتبع هذا السجل بدقة متناهية كافة العمليات الحساسة، تعديلات الدليل المحاسبي، السحب والإفلات، وحفظ واعتماد الحركات المالية.</p>

              <div className="space-y-2 pt-2">
                {activityLogsData && activityLogsData.length > 0 ? (
                  activityLogsData.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center text-xs shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{log.action}</span>
                          <span className="text-[10px] bg-[#f5ece0] text-[#5c3d1e] px-1.5 py-0.5 rounded font-mono">{log.userName || "المشرف"}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-8 text-xs">لا توجد سجلات تدقيق مسجلة حتى الآن.</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Tab 5: Analytics & AI Advisor */}
          <TabsContent value="analytics" className="space-y-4">
            <Card className="border-[#e8c9a0] bg-[#faf5ed] shadow-sm">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-[#f0dfc8]">
                <CardTitle className="flex items-center gap-2 text-[#5c3d1e] text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-[#b87945]" /> تحليل المساعد المالي الذكي (Forge LLM)
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => refetchAiAdvisor()} disabled={aiLoading} className="h-7 text-[10px] bg-white border-[#b87945]">
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : "تحديث التحليل"}
                </Button>
              </CardHeader>
              <CardContent className="p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-800">
                {aiLoading ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-[#b87945]" /> جاري استنتاج التوصيات المالية بدقة...
                  </div>
                ) : (
                  aiAdvisorData?.analysis || "لا توجد بيانات كافية للتحليل حالياً."
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-blue-600" /> مقارنة أداء الفروع والمؤسسات المتعددة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {branchComparisonData?.comparison?.map((b: any) => (
                  <div key={b.id} className="p-3.5 border rounded-xl bg-slate-50 shadow-sm space-y-2">
                    <div className="flex justify-between items-center"><span className="font-bold text-slate-900 text-xs">{b.name}</span><Badge variant="outline" className="text-[10px] font-mono">{b.code}</Badge></div>
                    <div className="space-y-1 text-[11px] pt-1 border-t">
                      <div className="flex justify-between"><span className="text-slate-500">الإيرادات:</span><span className="font-bold font-mono text-emerald-600">{b.revenue.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">المصروفات:</span><span className="font-bold font-mono text-rose-600">{b.expenses.toLocaleString()}</span></div>
                      <div className="flex justify-between border-t pt-1 font-bold text-slate-900"><span>صافي الدخل:</span><span className="font-mono text-blue-700">{b.netProfit.toLocaleString()}</span></div>
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
                <div className="bg-[#f5ece0] text-[#5c3d1e] w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                  {(profileName || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">{profileName || "المستخدم الحالي"}</h2>
                  <p className="text-slate-500 text-[11px]">{profileEmail || "user@al-husainia.com"} • الدور الوظيفي: <span className="font-semibold text-[#b87945]">{user?.role || "admin"}</span></p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] text-slate-700 mb-1 block font-medium">الاسم الشخصي / الوظيفي</Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-700 mb-1 block font-medium">البريد الإلكتروني للإشعارات</Label>
                  <Input
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
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
                  className="w-full bg-[#102a2b] hover:bg-[#1e3a3c] text-white text-xs h-9 font-bold mt-2 shadow"
                >
                  حفظ وتحديث الملف الشخصي
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirmation Modal for Drag and Drop Move */}
      <Dialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Network className="w-4 h-4 text-[#b87945]" /> تأكيد إعادة ترتيب الحساب الشجري
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2">
              هل أنت متأكد من رغبتك في نقل الحساب <span className="font-bold text-slate-900">"{pendingMove?.accountName}"</span> ليكون تابعاً تحت الحساب الرئيسي <span className="font-bold text-[#7a5228]">"{pendingMove?.parentName}"</span>؟
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
                    newParentAccountId: pendingMove.newParentAccountId
                  });
                }
              }}
              disabled={moveAccountMutation.isPending}
              className="text-xs h-8 bg-[#b87945] hover:bg-[#a06838] text-white font-bold"
            >
              {moveAccountMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Check className="w-3 h-3 ml-1" />}
              تأكيد وحفظ النقل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#102a2b] border-t border-[#1e3a3c] z-50 text-white py-1.5 px-4 shadow-2xl">
        <div className="max-w-md mx-auto flex justify-around items-center text-[10px]">
          <button onClick={() => setActiveTab("entry")} className={`flex flex-col items-center gap-0.5 ${activeTab === 'entry' ? 'text-[#d4a574] font-bold' : 'text-slate-400 hover:text-white'}`}>
            <Plus className="w-4 h-4" />
            <span>الإدخال</span>
          </button>
          <button onClick={() => setActiveTab("accounts")} className={`flex flex-col items-center gap-0.5 ${activeTab === 'accounts' ? 'text-[#d4a574] font-bold' : 'text-slate-400 hover:text-white'}`}>
            <BookOpen className="w-4 h-4" />
            <span>الدليل</span>
          </button>
          <button onClick={() => setActiveTab("reports")} className={`flex flex-col items-center gap-0.5 ${activeTab === 'reports' ? 'text-[#d4a574] font-bold' : 'text-slate-400 hover:text-white'}`}>
            <BarChart3 className="w-4 h-4" />
            <span>التقارير</span>
          </button>
          <button onClick={() => setActiveTab("audit")} className={`flex flex-col items-center gap-0.5 ${activeTab === 'audit' ? 'text-[#d4a574] font-bold' : 'text-slate-400 hover:text-white'}`}>
            <History className="w-4 h-4" />
            <span>التدقيق</span>
          </button>
          <button onClick={() => setActiveTab("analytics")} className={`flex flex-col items-center gap-0.5 ${activeTab === 'analytics' ? 'text-[#d4a574] font-bold' : 'text-slate-400 hover:text-white'}`}>
            <Sparkles className="w-4 h-4" />
            <span>التحليلات</span>
          </button>
          <button onClick={() => setActiveTab("profile")} className={`flex flex-col items-center gap-0.5 ${activeTab === 'profile' ? 'text-[#d4a574] font-bold' : 'text-slate-400 hover:text-white'}`}>
            <User className="w-4 h-4" />
            <span>الملف</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
