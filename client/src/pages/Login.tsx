import React, { useState } from "react";
import { useLocation } from "wouter";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Building2,
  Lock,
  Mail,
  Phone,
  User,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Zap,
  KeyRound,
  HardHat,
  BookOpen,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandLogo } from "@/components/BrandLogo";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form States
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      toast.error("الرجاء أدخل البريد الإلكتروني أو رقم الهاتف");
      return;
    }
    setIsSubmitting(true);
    toast.success("جاري تسجيل الدخول الآمن...");
    setTimeout(() => {
      startLogin();
      setIsSubmitting(false);
    }, 600);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) {
      toast.error("الرجاء إدخال الاسم ورقم الهاتف لتفعيل الاشتراك");
      return;
    }
    toast.success("تم تفعيل التجربة المجانية لمدة 14 يوماً بنجاح!");
    setLocation("/app");
  };

  const handleDemoLogin = () => {
    toast.success("تم الدخول الحساب التجريبي المباشر بنجاح!");
    setLocation("/app");
  };

  return (
    <div
      className="min-h-screen bg-ink-deep text-white flex flex-col justify-between font-display"
      dir="rtl"
    >
      {/* Top Simple Nav Header */}
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
            <span>العودة للرئيسية</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Brand Value Proposition & Proof */}
        <div className="lg:col-span-6 space-y-6 text-right">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-brand/40 text-brand-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            بوابة تسجيل الدخول الرقمي المشفر والمستقر
          </div>

          <h2 className="text-2xl sm:text-4xl font-black font-display text-white leading-tight">
            مرحباً بك في المنظومة التشاركية المؤسسية <br />
            <span className="text-brand-300">
              لأعمالك وخدماتك المحاسبية والهندسية
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
            إدارة الحسابات، الاستشارات الهندسية للمقاولين والأراضي، الرفع
            المساحي وجداول الكميات (BOQ)، والخدمات الطلابية والمكتبية وصيانة
            الأجهزة في مكان واحد.
          </p>

          <div className="space-y-3 pt-2 text-xs text-slate-200">
            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="p-2 bg-brand rounded-xl text-ink font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  النظام المحاسبي والمالي المتقدم
                </span>
                <span className="text-[11px] text-slate-400">
                  القيد المزدوج، الدليل الشجري، القوائم والتقارير المالية
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#162e30] border border-[#1e3a3c] rounded-2xl">
              <div className="p-2 bg-amber-700 rounded-xl text-white font-bold">
                <HardHat className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  الاستشارات الهندسية وجداول BOQ
                </span>
                <span className="text-[11px] text-slate-400">
                  الرفع المساحي، Shop Drawings، وحساب الحفر والردم
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#162e30] border border-[#1e3a3c] rounded-2xl">
              <div className="p-2 bg-sky-700 rounded-xl text-white font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  مكتبة الحسينية الحديثة وصيانة الأجهزة
                </span>
                <span className="text-[11px] text-slate-400">
                  الخدمات الطلابية، الأبحاث، التصاميم، وصيانة الحاسوب
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card Container */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <Card className="bg-white/5 border-2 border-white/10 text-white shadow-2xl rounded-3xl p-2 overflow-hidden">
            <CardHeader className="p-5 pb-3">
              <Tabs
                value={activeTab}
                onValueChange={v => setActiveTab(v as any)}
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
                    حساب جديد (تجربة 14 يوماً)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="p-5 pt-2">
              {/* TAB 1: LOGIN FORM */}
              {activeTab === "login" && (
                <form
                  onSubmit={handleLoginSubmit}
                  className="space-y-4 animate-in fade-in duration-200"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-brand-300" /> البريد
                      الإلكتروني أو رقم الهاتف
                    </Label>
                    <Input
                      required
                      type="text"
                      placeholder="admin@husseiniya-business.com / 770000000"
                      value={emailOrPhone}
                      onChange={e => setEmailOrPhone(e.target.value)}
                      className="h-10 bg-ink border-white/15 text-white text-xs rounded-xl font-mono text-left"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-bold text-slate-300 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-brand-300" /> كلمة
                        المرور
                      </Label>
                      <button
                        type="button"
                        onClick={() =>
                          toast.info(
                            "تواصل مع إدارة المؤسسة لإعادة تعيين كلمة المرور"
                          )
                        }
                        className="text-[11px] text-brand-300 hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    </div>

                    <div className="relative">
                      <Input
                        required
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-10 bg-ink border-white/15 text-white text-xs rounded-xl font-mono pl-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="rounded border-white/15 bg-ink text-brand focus:ring-0"
                      />
                      <span>تذكرني في هذا الجهاز</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand hover:bg-brand-deep text-ink font-black text-xs h-11 rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {isSubmitting
                      ? "جاري التحقق والاتصال..."
                      : "تسجيل الدخول الآمن"}
                  </Button>

                  <div className="pt-2 border-t border-white/10 text-center space-y-2">
                    <p className="text-[11px] text-white/50">
                      أو التجربة المباشرة الفورية بدون كلمة مرور:
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDemoLogin}
                      className="w-full border-white/15 bg-ink text-white hover:bg-white/10 text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 font-bold"
                    >
                      <Zap className="w-4 h-4 text-brand-300" />
                      الدخول الفوري بنقرة واحدة (Demo Mode)
                    </Button>
                  </div>
                </form>
              )}

              {/* TAB 2: REGISTER FORM */}
              {activeTab === "register" && (
                <form
                  onSubmit={handleRegisterSubmit}
                  className="space-y-3.5 animate-in fade-in duration-200"
                >
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">
                      الاسم الكامل *
                    </Label>
                    <Input
                      required
                      placeholder="مثال: المهندس / محمد علي"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">
                      رقم الهاتف / الواتساب *
                    </Label>
                    <Input
                      required
                      placeholder="770000000"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl font-mono text-left"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">
                      اسم المنشأة / المكتبة
                    </Label>
                    <Input
                      placeholder="مثال: مؤسسة الحسينية لخدمات الأعمال"
                      value={regCompany}
                      onChange={e => setRegCompany(e.target.value)}
                      className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">
                      كلمة المرور الجديدة
                    </Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl font-mono"
                    />
                  </div>

                  <div className="p-2.5 bg-ink rounded-xl border border-white/15 text-[11px] text-white/70 space-y-1">
                    <p className="font-bold text-brand-300">
                      ✨ مميزات التجربة المجانية:
                    </p>
                    <p>
                      • فترة تجريبية 14 يوماً كاملة لكافة الوحدات ومساحات العمل.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-brand hover:bg-brand-deep text-ink font-black text-xs h-10 rounded-xl shadow-lg"
                  >
                    تفعيل الاشتراك والدخول
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
