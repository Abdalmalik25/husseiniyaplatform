import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  KeyRound,
  Building2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserPlus,
  Sparkles,
  CheckCircle2,
  HardHat,
  Boxes,
  Briefcase,
  Layers,
  ArrowRight,
  Check,
  Coins,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandLogo } from "@/components/BrandLogo";

const COUNTRIES = [
  "اليمن",
  "السعودية",
  "الإمارات العربية المتحدة",
  "مصر",
  "الأردن",
  "قطر",
  "الكويت",
  "عمان",
  "البحرين",
  "السودان",
  "العراق",
  "سوريا",
  "لبنان",
  "أخرى",
];

const INDUSTRIES = [
  {
    id: "trade",
    title: "تجارة جملة وتجزئة ومخازن",
    sub: "محلات، مستودعات، شركات توزيع",
    icon: Boxes,
    color: "bg-brand/10 text-brand border-brand/20",
    modules: ["المحاسبة العامة", "المبيعات ونقاط البيع", "المخازن والأصناف", "المشتريات والموردين"],
    currencyDefault: "YER",
  },
  {
    id: "contracting",
    title: "مقاولات وإنشاءات وهندسة",
    sub: "شركات مقاولات، مكاتب هندسية، تطوير عقاري",
    icon: HardHat,
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    modules: ["المحاسبة العامة", "المشاريع ومراكز التكلفة", "المشتريات والمستخلصات", "المخازن"],
    currencyDefault: "YER",
  },
  {
    id: "services",
    title: "شركات واستشارات وخدمات",
    sub: "مؤسسات خدمية، استشارات، مكاتب مهنية",
    icon: Briefcase,
    color: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    modules: ["المحاسبة العامة", "فواتير الخدمات والعملاء", "المصروفات والميزانيات", "الموارد البشرية"],
    currencyDefault: "YER",
  },
  {
    id: "library",
    title: "مكتبات وخدمات طلابية وتقنية",
    sub: "مكتبات، خدمات تصوير، صيانة حواسيب وموبايل",
    icon: BookOpen,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    modules: ["المحاسبة العامة", "المبيعات ونقاط البيع", "الأصناف المكتبية", "خدمات الصيانة والطلاب"],
    currencyDefault: "YER",
  },
  {
    id: "enterprise",
    title: "منشأة شاملة متعددة الأنشطة",
    sub: "شركات قابضة، فروع متعددة، أنشطة مدمجة",
    icon: Layers,
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    modules: ["المحاسبة العامة", "المبيعات", "المخازن", "المشتريات", "المشاريع", "الموارد البشرية"],
    currencyDefault: "YER",
  },
];

const CURRENCIES = [
  { code: "YER", label: "ريال يمني (YER)" },
  { code: "SAR", label: "ريال سعودي (SAR)" },
  { code: "USD", label: "دولار أمريكي (USD)" },
  { code: "AED", label: "درهم إماراتي (AED)" },
  { code: "EGP", label: "جنيه مصري (EGP)" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const redirectTo = new URLSearchParams(window.location.search).get("redirect");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

  // Login States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);

  // Multi-Step Registration Wizard States
  const [regStep, setRegStep] = useState<number>(1);
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCountry, setRegCountry] = useState("اليمن");
  const [regCurrency, setRegCurrency] = useState("YER");
  const [regEmail, setRegEmail] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("trade");
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "المحاسبة العامة",
    "المبيعات ونقاط البيع",
    "المخازن والأصناف",
    "المشتريات والموردين",
  ]);

  // Provisioning Simulation state
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [provisionStep, setProvisionStep] = useState<number>(0);

  const goApp = () => {
    setLocation(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/app");
  };

  const login = trpc.auth.login.useMutation({
    onSuccess: () => goApp(),
    onError: (err: any) => {
      const code = err?.data?.code || err?.code;
      const msg = err?.message || "";
      if (code === "NOT_FOUND" || msg === "ACCOUNT_NOT_FOUND") {
        setNotFound(true);
        toast.error("لا يوجد حساب مسجّل بهذا الاسم");
        return;
      }
      if (code === "FORBIDDEN" && msg.startsWith("LOCKED:")) {
        const mins = msg.split(":")[1];
        setLocked(mins);
        return;
      }
      toast.error(msg || "تعذر تسجيل الدخول");
    },
  });

  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      // Launch live provisioning animation sequence
      setIsProvisioning(true);
      setProvisionStep(1);
      setTimeout(() => setProvisionStep(2), 500);
      setTimeout(() => setProvisionStep(3), 1000);
      setTimeout(() => setProvisionStep(4), 1500);
      setTimeout(() => {
        setProvisionStep(5);
        toast.success("تم تهيئة منشأتك وتفعيل الفترة التجريبية بنجاح!");
        setTimeout(() => goApp(), 600);
      }, 2000);
    },
    onError: (err: any) => {
      setIsProvisioning(false);
      const msg = err?.message || "";
      const code = err?.data?.code || err?.code;
      if (code === "CONFLICT") {
        toast.error("اسم المستخدم مُستخدم مسبقاً، اختر اسماً آخر");
        return;
      }
      toast.error(msg || "تعذر إنشاء الحساب");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setNotFound(false);
    setLocked(null);
    if (!username.trim() || !password) {
      toast.error("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    login.mutate({ username: username.trim(), password });
  };

  const handleIndustrySelect = (indId: string) => {
    setSelectedIndustry(indId);
    const found = INDUSTRIES.find((i) => i.id === indId);
    if (found) {
      setSelectedModules(found.modules);
      if (regCountry === "السعودية") {
        setRegCurrency("SAR");
      } else {
        setRegCurrency(found.currencyDefault);
      }
    }
  };

  const toggleModule = (modName: string) => {
    if (selectedModules.includes(modName)) {
      if (selectedModules.length > 1) {
        setSelectedModules(selectedModules.filter((m) => m !== modName));
      } else {
        toast.error("يجب تفعيل وحدة واحدة على الأقل");
      }
    } else {
      setSelectedModules([...selectedModules, modName]);
    }
  };

  const handleNextStep = () => {
    if (regStep === 1) {
      if (!regName.trim() || !regUsername.trim() || !regPassword) {
        toast.error("الرجاء تعبئة اسم المنشأة واسم المستخدم وكلمة المرور");
        return;
      }
      if (regPassword.length < 6) {
        toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
        return;
      }
      setRegStep(2);
    } else if (regStep === 2) {
      setRegStep(3);
    } else if (regStep === 3) {
      setRegStep(4);
    }
  };

  const handleFinalRegister = () => {
    register.mutate({
      name: regName.trim(),
      username: regUsername.trim(),
      password: regPassword,
      country: regCountry,
      currency: regCurrency,
      email: regEmail.trim() || undefined,
    });
  };

  return (
    <div
      className="min-h-screen bg-ink-deep text-white flex flex-col justify-between font-display"
      dir="rtl"
    >
      {/* ── Header ───────────────────────────────────── */}
      <header className="border-b border-white/10 bg-ink/80 backdrop-blur px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setLocation("/")}
          >
            <BrandLogo size={38} />
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="border-white/15 text-white/80 hover:text-white bg-white/5 text-xs h-8 px-3 rounded-lg flex items-center gap-1"
          >
            <span>العودة للموقع الرئيسي</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Main Container ───────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left / Info Column */}
        <div className="lg:col-span-5 space-y-6 text-right">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-brand/40 text-brand-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow">
            <img src="/uamex-favicon-32.png" alt="" width={16} height={16} className="rounded-[4px]" />
            بوابة نظام Uamex_erp ERP الموحدة
          </div>
          <h2 className="text-2xl sm:text-4xl font-black font-display text-white leading-tight">
            منظومة الأعمال المتكاملة
            <br />
            <span className="text-brand-300">المهيأة لبيئة عملك الحقيقية</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
            سواء كنت تسجل لأول مرة أو تدخل لمتابعة أعمالك، يوفر لك Uamex_erp شجرة
            حسابات مهيأة، مخازن مضبوطة، وتقارير فورية تدعم اتخاذ قراراتك.
          </p>

          <div className="space-y-3 pt-2 text-xs text-slate-200">
            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="p-2 bg-brand rounded-xl text-ink font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  فترة تجريبية مجانية 14 يوماً
                </span>
                <span className="text-[11px] text-slate-400">
                  وصول كامل لجميع الوحدات المحاسبية والمخزنية دون أي شروط
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="p-2 bg-emerald-600 rounded-xl text-white font-bold">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  تهيئة ذكية وتلقائية للبيانات
                </span>
                <span className="text-[11px] text-slate-400">
                  توليد شجرة الحسابات والسياسات المالية المناسبة لقطاع نشاطك
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right / Interactive Form Column */}
        <div className="lg:col-span-7 w-full max-w-lg mx-auto">
          <Card className="bg-white/5 border-2 border-white/10 text-white shadow-2xl rounded-3xl p-2 overflow-hidden backdrop-blur-xl">
            <CardHeader className="p-5 pb-3">
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as any);
                  setNotFound(false);
                  setLocked(null);
                }}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 bg-ink p-1 rounded-xl border border-white/15 h-10">
                  <TabsTrigger
                    value="login"
                    className="text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-ink"
                  >
                    تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-ink"
                  >
                    فتح حساب وتهيئة منشأة
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="p-5 pt-2">
              {/* ── Tab 1: Existing User Login ─────────────── */}
              {activeTab === "login" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {locked && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[11px] text-rose-200">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      تم قفل الحساب مؤقتاً بسبب محاولات متكررة. حاول بعد {locked} دقيقة.
                    </div>
                  )}
                  {notFound && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <AlertTriangle className="w-4 h-4" /> لا يوجد حساب مسجل بهذا الاسم
                      </div>
                      <p className="mb-2">يمكنك فتح حساب وتهيئة منشأتك مجاناً في دقيقة.</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveTab("register");
                          setNotFound(false);
                        }}
                        className="bg-brand hover:bg-brand-deep text-ink font-bold text-[11px] h-8"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> فتح حساب جديد
                      </Button>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-brand-300" /> اسم المستخدم
                      </Label>
                      <Input
                        required
                        placeholder="اسم المستخدم"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-10 bg-ink border-white/15 text-white text-xs rounded-xl"
                        autoComplete="username"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-brand-300" /> كلمة المرور
                      </Label>
                      <div className="relative">
                        <Input
                          required
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-10 bg-ink border-white/15 text-white text-xs rounded-xl font-mono pl-10"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={login.isPending}
                      className="w-full bg-brand hover:bg-brand-deep text-ink font-black text-xs h-11 rounded-xl shadow-lg flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      {login.isPending ? "جاري التحقق…" : "دخول النظام"}
                    </Button>

                    <div className="relative flex items-center justify-center my-2">
                      <div className="border-t border-white/10 w-full" />
                      <span className="bg-ink px-2 text-[10px] text-white/40 absolute font-mono">أو للتجربة الفورية</span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUsername("admin");
                        setPassword("admin123");
                        login.mutate({ username: "admin", password: "admin123" });
                      }}
                      className="w-full border-white/15 text-white/80 hover:text-white bg-white/5 text-xs h-10 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-white/10"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                      <span>تجربة النظام بحساب تجريبي (Demo)</span>
                    </Button>
                  </form>
                </div>
              )}

              {/* ── Tab 2: Smart Multi-Step Onboarding Wizard ─ */}
              {activeTab === "register" && (
                <div className="animate-in fade-in duration-200">
                  {isProvisioning ? (
                    /* Live Provisioning Sequence */
                    <div className="py-8 px-2 text-center space-y-5">
                      <div className="w-16 h-16 rounded-2xl bg-brand/15 border border-brand/40 flex items-center justify-center mx-auto text-brand-300 shadow-xl animate-pulse">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">
                          جاري تهيئة بيئة العمل الخاصة بك...
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          يتم إعداد الدليل المحاسبي والمخازن والسياسات المالية
                        </p>
                      </div>

                      <div className="space-y-2.5 text-right max-w-xs mx-auto text-xs bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className={"flex items-center gap-2.5 " + (provisionStep >= 1 ? "text-emerald-400 font-bold" : "text-white/30")}>
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>إنشاء المنشأة والفرع الرئيسي...</span>
                        </div>
                        <div className={"flex items-center gap-2.5 " + (provisionStep >= 2 ? "text-emerald-400 font-bold" : "text-white/30")}>
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>توليد شجرة الحسابات لقطاع النشاط...</span>
                        </div>
                        <div className={"flex items-center gap-2.5 " + (provisionStep >= 3 ? "text-emerald-400 font-bold" : "text-white/30")}>
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>ضبط العملة وسياسات التسعير والمخزن...</span>
                        </div>
                        <div className={"flex items-center gap-2.5 " + (provisionStep >= 4 ? "text-emerald-400 font-bold" : "text-white/30")}>
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>تفعيل 14 يوماً تجريبية كاملة الصلاحيات...</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Step by Step Wizard */
                    <div>
                      {/* Step indicator bar */}
                      <div className="flex items-center justify-between gap-1 mb-5 px-1">
                        {[
                          { num: 1, label: "المنشأة" },
                          { num: 2, label: "القطاع" },
                          { num: 3, label: "الوحدات" },
                          { num: 4, label: "التهيئة" },
                        ].map((s) => (
                          <div key={s.num} className="flex items-center gap-1.5 flex-1">
                            <div
                              className={
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all " +
                                (regStep === s.num
                                  ? "bg-brand text-ink shadow-md scale-110"
                                  : regStep > s.num
                                  ? "bg-emerald-500 text-white"
                                  : "bg-white/10 text-white/40")
                              }
                            >
                              {regStep > s.num ? "✓" : s.num}
                            </div>
                            <span
                              className={
                                "text-[11px] hidden sm:inline " +
                                (regStep === s.num ? "text-white font-bold" : "text-white/40")
                              }
                            >
                              {s.label}
                            </span>
                            {s.num < 4 && <div className="flex-1 h-0.5 bg-white/10 mr-1" />}
                          </div>
                        ))}
                      </div>

                      {/* Step 1: Basic Info */}
                      {regStep === 1 && (
                        <div className="space-y-3.5 animate-in fade-in duration-150">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-300">
                              اسم المنشأة / الشركة *
                            </Label>
                            <Input
                              required
                              placeholder="مثال: شركة الأمل للتجارة والمقاولات"
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-300">
                                اسم المستخدم *
                              </Label>
                              <Input
                                required
                                placeholder="حروف وأرقام فقط"
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                                className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl font-mono"
                                dir="ltr"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-300">
                                كلمة المرور *
                              </Label>
                              <Input
                                required
                                type="password"
                                placeholder="6 أحرف على الأقل"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-300">
                                الدولة
                              </Label>
                              <select
                                value={regCountry}
                                onChange={(e) => {
                                  setRegCountry(e.target.value);
                                  if (e.target.value === "السعودية") setRegCurrency("SAR");
                                }}
                                className="h-9 w-full bg-ink border border-white/15 text-white text-xs rounded-xl px-2"
                              >
                                {COUNTRIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-300">
                                البريد (اختياري)
                              </Label>
                              <Input
                                type="email"
                                placeholder="name@company.com"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl"
                              />
                            </div>
                          </div>

                          <Button
                            type="button"
                            onClick={handleNextStep}
                            className="w-full bg-brand hover:bg-brand-deep text-ink font-black text-xs h-10 rounded-xl gap-2 mt-2"
                          >
                            <span>التالي: اختيار قطاع النشاط</span>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Step 2: Industry Selection */}
                      {regStep === 2 && (
                        <div className="space-y-3 animate-in fade-in duration-150">
                          <div className="text-xs text-slate-300 font-bold mb-2">
                            اختر قطاع عملك لتهيئة شجرة الحسابات المناسبة:
                          </div>

                          <div className="space-y-2">
                            {INDUSTRIES.map((ind) => {
                              const Icon = ind.icon;
                              const isSelected = selectedIndustry === ind.id;
                              return (
                                <button
                                  key={ind.id}
                                  type="button"
                                  onClick={() => handleIndustrySelect(ind.id)}
                                  className={
                                    "w-full flex items-center justify-between p-3 rounded-2xl border text-right transition-all " +
                                    (isSelected
                                      ? "bg-white/10 border-brand shadow-lg"
                                      : "bg-white/5 border-white/10 hover:bg-white/[0.08]")
                                  }
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={"w-9 h-9 rounded-xl flex items-center justify-center " + ind.color}>
                                      <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-white">{ind.title}</div>
                                      <div className="text-[10px] text-slate-400">{ind.sub}</div>
                                    </div>
                                  </div>
                                  <div className={"w-5 h-5 rounded-full border flex items-center justify-center " + (isSelected ? "border-brand bg-brand text-ink" : "border-white/20")}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setRegStep(1)}
                              className="border-white/15 text-white/70 hover:text-white bg-white/5 text-xs h-10 rounded-xl"
                            >
                              السابق
                            </Button>
                            <Button
                              type="button"
                              onClick={handleNextStep}
                              className="flex-1 bg-brand hover:bg-brand-deep text-ink font-black text-xs h-10 rounded-xl gap-1.5"
                            >
                              <span>التالي: تأكيد الوحدات</span>
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Workspaces / Modules Selection */}
                      {regStep === 3 && (
                        <div className="space-y-3 animate-in fade-in duration-150">
                          <div className="text-xs text-slate-300 font-bold mb-1">
                            الوحدات ومساحات العمل المقترحة لمنشأتك:
                          </div>
                          <p className="text-[11px] text-slate-400 mb-3">
                            تم تحديد الوحدات النموذجية لقطاعك، يمكنك تفعيل أو إلغاء ما تريد:
                          </p>

                          <div className="grid grid-cols-2 gap-2">
                            {[
                              "المحاسبة العامة",
                              "المبيعات ونقاط البيع",
                              "المخازن والأصناف",
                              "المشتريات والموردين",
                              "المشاريع ومراكز التكلفة",
                              "الموارد البشرية",
                              "التقارير والقوائم المالية",
                              "الأمن وسجل التدقيق",
                            ].map((mod) => {
                              const isChecked = selectedModules.includes(mod);
                              return (
                                <button
                                  key={mod}
                                  type="button"
                                  onClick={() => toggleModule(mod)}
                                  className={
                                    "flex items-center gap-2 p-2.5 rounded-xl border text-right text-xs font-semibold transition-all " +
                                    (isChecked
                                      ? "bg-brand/15 border-brand/40 text-white"
                                      : "bg-white/5 border-white/10 text-white/50")
                                  }
                                >
                                  <div
                                    className={
                                      "w-4 h-4 rounded-md border flex items-center justify-center shrink-0 " +
                                      (isChecked
                                        ? "bg-brand border-brand text-ink"
                                        : "border-white/30")
                                    }
                                  >
                                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">{mod}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex gap-2 pt-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setRegStep(2)}
                              className="border-white/15 text-white/70 hover:text-white bg-white/5 text-xs h-10 rounded-xl"
                            >
                              السابق
                            </Button>
                            <Button
                              type="button"
                              onClick={handleNextStep}
                              className="flex-1 bg-brand hover:bg-brand-deep text-ink font-black text-xs h-10 rounded-xl gap-1.5"
                            >
                              <span>التالي: العملة والتفعيل</span>
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Step 4: Currency & Free Trial Activation */}
                      {regStep === 4 && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-300">
                              العملة الرئيسية للدفاتر والحسابات:
                            </Label>
                            <select
                              value={regCurrency}
                              onChange={(e) => setRegCurrency(e.target.value)}
                              className="h-10 w-full bg-ink border border-white/15 text-white text-xs rounded-xl px-3 font-semibold"
                            >
                              {CURRENCIES.map((cur) => (
                                <option key={cur.code} value={cur.code}>
                                  {cur.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Free Trial Banner */}
                          <div className="p-4 rounded-2xl bg-brand/10 border border-brand/30 space-y-2 text-right">
                            <div className="flex items-center gap-2 text-xs font-black text-brand-300">
                              <Sparkles className="w-4 h-4 text-brand" />
                              <span>فترة تجريبية مجانية 14 يوماً</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              وصول كامل لكافة مساحات العمل والميزات بدون أي متطلبات بطاقة ائتمان.
                              بياناتك محفوظة وآمنة بالكامل ويمكنك الترقية في أي وقت.
                            </p>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setRegStep(3)}
                              className="border-white/15 text-white/70 hover:text-white bg-white/5 text-xs h-11 rounded-xl"
                            >
                              السابق
                            </Button>
                            <Button
                              type="button"
                              disabled={register.isPending}
                              onClick={handleFinalRegister}
                              className="flex-1 bg-brand hover:bg-brand-deep text-ink font-black text-xs h-11 rounded-xl gap-2 shadow-xl"
                            >
                              <Zap className="w-4 h-4" />
                              <span>{register.isPending ? "جاري تهيئة المنشأة..." : "إطلاق المنصة وبدء العمل"}</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
