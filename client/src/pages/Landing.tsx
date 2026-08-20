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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Building2,
  BookOpen,
  Compass,
  Cpu,
  Layers,
  ShieldCheck,
  Wrench,
  Smartphone,
  FileText,
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Send,
  ShoppingCart,
  ArrowRight,
  Award,
  Users,
  Check,
  MessageSquare,
  Clock,
  HelpCircle,
  FileCheck,
  Search,
  HardHat,
  Map,
  Ruler,
  Calculator,
  Truck,
  Scale,
  Home as HomeIcon,
  CheckSquare,
  Lock,
  UserCheck,
  Star,
  Play,
  Zap,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { SiteFooter } from "@/components/SiteFooter";
import { brand } from "@/lib/brand";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [trialMode, setTrialMode] = useState<"register" | "login">("register");

  // Registration/Trial Form States
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCompany, setRegCompany] = useState("");

  const onboardMutation = trpc.auth.onboard.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المؤسسة بنجاح! جاري التحويل...");
      setAuthModalOpen(false);
      setLocation("/app");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء المؤسسة");
    },
  });

  const handleStartFreeTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) {
      toast.error("يرجى إدخال الاسم ورقم الهاتف لإتاحة الفترة التجريبية");
      return;
    }
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    onboardMutation.mutate({
      institutionName: regCompany.trim() || `${regName} - مؤسسة جديدة`,
    });
  };

  return (
    <div
      className="min-h-screen bg-sand text-ink dark:bg-background dark:text-foreground pb-20 font-display"
      dir="rtl"
    >
      {/* Header Navbar */}
      <HeaderNavbar />

      {/* 🚀 HERO SECTION: التسويق العالمي والتعريفي */}
      <section className="relative brand-gradient text-white py-20 px-4 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-10 brand-dotgrid"></div>

        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur border border-brand/50 text-brand-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Sparkles className="w-4 h-4 text-brand" />
            {brand.tagline}
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-display tracking-tight leading-tight text-balance animate-in fade-in slide-in-from-bottom-3 duration-700">
            مؤسسة الحسينية لخدمات الأعمال <br />
            <span className="text-brand-300">ومكتبة الحسينية الحديثة</span>
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-lg text-white/70 leading-relaxed font-light text-pretty animate-in fade-in slide-in-from-bottom-4 duration-700">
            {brand.promise}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Button
              onClick={() => setAuthModalOpen(true)}
              className="bg-brand hover:bg-brand-deep text-ink font-black text-sm sm:text-base h-12 px-8 shadow-xl rounded-2xl flex items-center gap-2 transition-all hover:scale-105"
            >
              <Zap className="w-5 h-5 fill-current" />
              ابدأ الفترة التجريبية المجانية (14 يوماً)
            </Button>

            <Button
              onClick={() => setLocation("/app")}
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 text-sm h-12 px-6 rounded-2xl flex items-center gap-2"
            >
              <Building2 className="w-5 h-5 text-brand-300" />
              استكشاف مساحات العمل والأنظمة
            </Button>

            <Button
              onClick={() => setLocation("/store")}
              variant="ghost"
              className="text-white/70 hover:text-white text-sm h-12 px-4 flex items-center gap-1.5"
            >
              <ShoppingCart className="w-4 h-4 text-brand-300" />
              المتجر الإلكتروني
            </Button>
          </div>

          {/* Guarantee Badges */}
          <div className="flex flex-wrap justify-center items-center gap-6 pt-4 text-xs text-white/70 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> بدون بطاقة
              ائتمان
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> تفعيل فوري
              لكافة الوحدات
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> تعمل أوفلاين
              وسحابياً
            </span>
          </div>

          {/* KPI Numbers Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-10 text-right">
            <div className="bg-white/5 backdrop-blur border border-white/10 p-4 rounded-2xl text-center shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-2xl font-black text-brand-300 font-mono">
                +1,200
              </div>
              <div className="text-xs text-white/70 mt-1">
                مشروع وتثبيت أرض مساحي
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 p-4 rounded-2xl text-center shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-2xl font-black text-brand-300 font-mono">
                +450
              </div>
              <div className="text-xs text-white/70 mt-1">
                جدول كميات (BOQ) ومخطط تنفيذي
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 p-4 rounded-2xl text-center shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-2xl font-black text-brand-300 font-mono">
                +15,000
              </div>
              <div className="text-xs text-white/70 mt-1">
                معاملة مالية ومخدمية منجزة
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 p-4 rounded-2xl text-center shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-2xl font-black text-brand-300 font-mono">
                %99.6
              </div>
              <div className="text-xs text-white/70 mt-1">
                نسبة رضا العملاء والمقاولين
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🏢 SHOWCASE: الوحدات التشغيلية والمساحات الموزعة (Modular Workspaces Hub) */}
      <main className="max-w-7xl mx-auto px-4 py-16 space-y-16">
        <div className="text-center space-y-3 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Badge className="bg-brand text-ink font-bold text-xs px-3 py-1">
            معمارية موزعة وتناغم تشغيلي
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-foreground">
            وحدات تشغيلية ومساحات عمل تخصصية (Workspaces)
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            تم تصميم المنصة لتمنح كل قطاع مساحة عمل مستقلة ومتكاملة مع النظام
            المحاسبي المركزي.
          </p>
        </div>

        {/* 4 Workspaces Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Workspace 1: Accounting */}
          <Card className="surface transition-all overflow-hidden hover:-translate-y-1 group">
            <CardHeader className="bg-gradient-to-r from-[#102a2b] to-[#1a3d3f] text-white p-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-[#b87945] text-[#102a2b] font-bold shadow">
                  <Building2 className="w-6 h-6" />
                </div>
                <Badge className="bg-[#b87945] text-[#102a2b] font-bold text-xs">
                  الوحدة المحاسبية والمالية
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold font-display text-white mt-4">
                النظام المحاسبي والمالي المتقدم
              </CardTitle>
              <CardDescription className="text-xs text-slate-300 leading-relaxed mt-1">
                إدارة القيد المزدوج، دليل الحسابات الشجري، ميزان المراجعة، قائمة
                الدخل، وإقفال السنوات المالية.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> دليل
                  حسابات شجري قابل للتخصيص الكامل
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> إثبات
                  وإدارة السندات والعمليات بدقة مدين/دائن
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ميزان
                  المراجعة والميزانية العمومية والتحليلات
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> إقفال
                  الدورة المحاسبية السنوية التلقائي
                </li>
              </ul>
              <Button
                onClick={() => setLocation("/app")}
                className="w-full bg-ink hover:bg-ink-deep text-white text-xs h-10 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                الدخول للمساحة المحاسبية
                <ArrowRight className="w-4 h-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>

          {/* Workspace 2: Engineering */}
          <Card className="border-2 border-[#b87945]/30 shadow-md hover:shadow-xl transition-all overflow-hidden bg-white group">
            <CardHeader className="bg-gradient-to-r from-[#b87945] to-amber-900 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-[#102a2b] text-[#d4a574] font-bold shadow">
                  <HardHat className="w-6 h-6" />
                </div>
                <Badge className="bg-[#102a2b] text-[#d4a574] font-bold text-xs">
                  الوحدة الهندسية والمقاولات
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold font-display text-white mt-4">
                جناح الاستشارات الهندسية والمقاولات والأراضي
              </CardTitle>
              <CardDescription className="text-xs text-[#f5e6d3] leading-relaxed mt-1">
                مخططات تنفيذي Shop Drawings، رفع مساحي GPS/درون، جداول BOQ،
                وحساب الحفر والردم.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> المخططات
                  المعمارية والإنشائية 2D/3D ونمذجة BIM
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> الرفع
                  المساحي الرقمي وتثبيت المحاور والفرز العقاري
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> جداول
                  الكميات (BOQ) وحصر حديد التسليح والخرسانة
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> الرفع
                  الطبوغرافي وحساب كميات القطع والردم Cut & Fill
                </li>
              </ul>
              <Button
                onClick={() => setLocation("/about")}
                className="w-full bg-brand hover:bg-brand-deep text-ink text-xs h-10 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                الدخول للمساحة الهندسية
                <ArrowRight className="w-4 h-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>

          {/* Workspace 3: Commercial */}
          <Card className="border-2 border-emerald-600/30 shadow-md hover:shadow-xl transition-all overflow-hidden bg-white group">
            <CardHeader className="bg-gradient-to-r from-emerald-800 to-teal-950 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-white text-emerald-900 font-bold shadow">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-xs">
                  وحدة المبيعات والمخزون
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold font-display text-white mt-4">
                إدارة العمليات التجارية والمخازن والعملاء
              </CardTitle>
              <CardDescription className="text-xs text-emerald-100 leading-relaxed mt-1">
                فواتير المبيعات والمشتريات، ضبط المخزون الفعلي، وإدارة مستحقات
                العملاء والموردين.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> إصدار
                  فواتير المبيعات والمشتريات والربط المحاسبي
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> حركة
                  المخزون التلقائية والتنبيه عند انخفاض الكميات
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ربط
                  طلبات المتجر الإلكتروني بكتالوج المنتجات
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> إدارة
                  كشوفات ديون ومستحقات العملاء والموردين
                </li>
              </ul>
              <Button
                onClick={() => setLocation("/commercial")}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs h-10 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                الدخول للمساحة التجارية
                <ArrowRight className="w-4 h-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>

          {/* Workspace 4: Library */}
          <Card className="border-2 border-sky-600/30 shadow-md hover:shadow-xl transition-all overflow-hidden bg-white group">
            <CardHeader className="bg-gradient-to-r from-sky-800 to-blue-950 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-white text-sky-900 font-bold shadow">
                  <BookOpen className="w-6 h-6" />
                </div>
                <Badge className="bg-sky-400 text-slate-950 font-bold text-xs">
                  وحدة المكتبة والخدمات
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold font-display text-white mt-4">
                مكتبة الحسينية الحديثة وصيانة الأجهزة
              </CardTitle>
              <CardDescription className="text-xs text-sky-100 leading-relaxed mt-1">
                الخدمات الطلابية والمكتبية، التصاميم الإبداعية، الأبحاث، وصيانة
                الكمبيوتر والموبايل.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> طباعة
                  وتغليف وتنسيق رسائل ومشاريع التخرج
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> تصميم
                  الهويات البصرية والشعارات والمطبوعات
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> إعداد
                  الأوراق الأكاديمية والتحليل الإحصائي (SPSS)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> صيانة
                  أجهزة الموبايل واللاب توب والبرمجيات
                </li>
              </ul>
              <Button
                onClick={() => setLocation("/store")}
                className="w-full bg-sky-800 hover:bg-sky-900 text-white text-xs h-10 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                الدخول لمساحة المكتبة والخدمات
                <ArrowRight className="w-4 h-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 🌟 TESTIMONIALS: Social proof from contractors, engineers & students */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Badge className="bg-brand text-ink font-bold text-xs px-3 py-1">
            ثقة عملائنا ومقاولينا
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground text-balance">
            مؤسسات وطلاب ومقاولون يبنون أعمالهم على منصتنا
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {brand.testimonials.map((t, i) => (
            <Card
              key={i}
              className="surface p-6 rounded-2xl hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <div className="flex items-center gap-1 text-brand mb-3">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                «{t.quote}»
              </p>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full brand-gradient-warm flex items-center justify-center text-ink font-black text-sm">
                  {t.author.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{t.author}</p>
                  <p className="text-[11px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 🚀 MODAL: التسجيل ودخول التجربة المجانية */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-md font-display" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Zap className="w-5 h-5 text-brand" />
              ابدأ الفترة التجريبية المجانية (14 يوماً)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              وصول كامل ومجاني لكافة مساحات العمل والميزات بدون بطاقة ائتمان.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStartFreeTrial} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                الاسم الكامل *
              </Label>
              <Input
                required
                placeholder="مثال: المهندس / محمد علي"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                رقم الهاتف / الواتساب *
              </Label>
              <Input
                required
                placeholder="770000000"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                className="h-9 text-xs bg-background font-mono text-left"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                اسم المؤسسة / المكتب (اختياري)
              </Label>
              <Input
                placeholder="مثال: مؤسسة الحسينية المقاولات"
                value={regCompany}
                onChange={e => setRegCompany(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">✨ مميزات الفترة التجريبية المجانية:</p>
              <p>• تجربة شمولية 14 يوماً لكل الوحدات والمساحات.</p>
              <p>• حفظ آمن وحماية كاملة لبياناتك.</p>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAuthModalOpen(false)}
                className="text-xs h-9"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs h-9 bg-brand hover:bg-brand-deep text-ink font-black flex-1"
              >
                تفعيل التجربة المجانية والدخول
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
