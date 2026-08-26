import React, { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Building2,
  BookOpen,
  Layers,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Phone,
  ArrowRight,
  Users,
  Check,
  MessageSquare,
  HardHat,
  Map,
  Ruler,
  Calculator,
  Zap,
  Globe,
  TrendingUp,
  BarChart3,
  Wifi,
  Package,
  FileText,
  Star,
  ChevronDown,
  Play,
  ArrowUpRight,
  Cpu,
  Database,
  Lock,
  RefreshCw,
  FolderKanban,
  Wrench,
  GraduationCap,
  Home,
  ClipboardList,
} from "lucide-react";
import { goLogin } from "@/const";
import { SiteFooter } from "@/components/SiteFooter";
import { brand, whatsappLink, uamexDemoLink, engineeringConsultLink } from "@/lib/brand";
import { methodology, standardsGlossary } from "@/lib/methodology";
import { HeroBackground } from "@/components/ModernBackground";
import { HeroAurora } from "@/components/HeroAurora";
import { AnimatedCounter } from "@/components/AnimatedCounter";

// ── قصص التحوّل — أدلة كمّية قبل/بعد (لا صفات تسويقية) ──────────────
const CASE_STUDIES = [
  {
    sector: "شركة مقاولات وبناء",
    icon: HardHat,
    challenge: "فواتير ومستخلصات تُعدّ يدويًا على Excel، وتحصيل متأخر يخنق السيولة.",
    results: [
      { metric: "زمن إعداد الفاتورة والمستخلص", before: "٣ أيام عمل", after: "٢٥ دقيقة" },
      { metric: "متوسط تأخّر تحصيل المستحقات", before: "٤٥ يومًا", after: "١٢ يومًا" },
      { metric: "أخطاء جداول الكميات", before: "متكررة يدويًا", after: "٠ — مراجعة آلية" },
    ],
  },
  {
    sector: "مؤسسة تجارة وتوريد",
    icon: Package,
    challenge: "جرد شهري يوقف البيع يومًا كاملًا، وأرباح «تقديرية» لا تكشف ربحية الصنف.",
    results: [
      { metric: "معرفة المخزون الحالي", before: "جرد يوم كامل", after: "لحظي مستمر" },
      { metric: "ربحية كل صنف", before: "تقدير إجمالي", after: "دقيقة للقطعة" },
      { metric: "قرارات الشراء", before: "بالحدس", after: "بيانات طلب ذكية" },
    ],
  },
  {
    sector: "مكتبة وخدمات طلابية",
    icon: GraduationCap,
    challenge: "طلبات تضيع بين واتساب والدفتر، والعميل يسأل: «وين وصلت طلبيتي؟».",
    results: [
      { metric: "طلبات ضائعة شهريًا", before: "نحو ١٠٪", after: "٠ — تتبع بكود" },
      { metric: "شفافية زمن التسليم", before: "غير معروف", after: "مؤشر يومي" },
      { metric: "عودة العميل", before: "عشوائي", after: "متابعة ونظام ولاء" },
    ],
  },
];

/** بنية الثقة المؤسسية — كل بند قابل للتحقق في معمارية المنصة فعليًا. */
const ENTERPRISE_ASSURANCES = [
  { icon: Lock, label: "تشفير AES-256-GCM", detail: "النسخ الاحتياطية مشفّرة بمفتاح يُحفظ خارج قاعدة البيانات تمامًا" },
  { icon: Database, label: "عزل صارم للمستأجرين", detail: "بيانات كل مؤسسة معزولة على مستوى استعلامات الخادم ذاتها" },
  { icon: RefreshCw, label: "نسخ ليلي تلقائي", detail: "نسخة مشفّرة يوميًا وفحص سلامة SHA-256 قبل أي استعادة" },
  { icon: ShieldCheck, label: "جلسات محصّنة", detail: "JWT داخل كوكيز httpOnly مع حدّ معدل ضد هجمات التخمين" },
  { icon: Globe, label: "عمل دون إنترنت", detail: "وضع أوفلاين كامل مع مزامنة تلقائية آمنة عند عودة الاتصال" },
  { icon: Cpu, label: "مراقبة أداء حقيقية", detail: "قياس مؤشرات Web Vitals من متصفحات مستخدمي المنصة الفعليين" },
];

// ── Typewriter Hook ──────────────────────────────────────────────
function useTypewriter(phrases: string[], speed = 60, pause = 2200) {
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    const delay = deleting
      ? speed / 2
      : charIdx === current.length
        ? pause
        : speed;

    const t = setTimeout(() => {
      if (!deleting && charIdx < current.length) {
        setDisplayed(current.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      } else if (!deleting && charIdx === current.length) {
        setDeleting(true);
      } else if (deleting && charIdx > 0) {
        setDisplayed(current.slice(0, charIdx - 1));
        setCharIdx(c => c - 1);
      } else {
        setDeleting(false);
        setPhraseIdx(i => (i + 1) % phrases.length);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause]);

  return displayed;
}

// ── Scroll Reveal Hook ───────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      entries =>
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          // تدرّج ظهور متسلسل اختياري لكل عنصر عبر data-reveal-delay (ms)
          const delay = Number(el.dataset.revealDelay ?? 0) || 0;
          window.setTimeout(() => el.classList.add("revealed"), delay);
          obs.unobserve(el);
        }),
      { threshold: 0.12 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const [activeUamexModule, setActiveUamexModule] = useState(0);
  /* حاسبة «الخسارة الصامتة» — تسويق استشاري كمّي بالأرقام */
  const [teamSize, setTeamSize] = useState(5);
  const [hoursLost, setHoursLost] = useState(6);
  useScrollReveal();

  const heroPhrase = useTypewriter([
    "مدير مؤسسة",
    "مقاول ومهندس",
    "صاحب أرض",
    "طالب جامعي",
    "صاحب مشروع",
  ]);

  const UAMEX_MODULES = brand.uamex.modules;

  return (
    <div
      className="min-h-screen bg-sand text-ink dark:bg-background dark:text-foreground font-display"
      dir="rtl"
    >
      <HeaderNavbar />

      {/* ═══════════════════════════════════════════════════════════
          HERO — رسالة قيمة، ليست مجرد عنوان
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative text-white overflow-hidden">
        <HeroBackground />
        <HeroAurora />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/80 to-ink" />

        {/* شريط التنبيه */}
        <div className="relative z-10 bg-gradient-to-l from-brand/20 to-transparent border-b border-brand/20 text-center text-[11px] sm:text-xs py-2 px-4 flex items-center justify-center gap-3 text-white/80">
          <span className="inline-flex items-center gap-1.5 bg-brand/15 border border-brand/30 px-3 py-0.5 rounded-full font-bold text-brand-300">
            <Sparkles className="w-3 h-3" /> Uamex_erp v2.0 متاح الآن
          </span>
          <span className="hidden sm:inline text-white/60">
            نظام إدارة الأعمال الموحّد — جاهز للبدء الفوري
          </span>
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10 px-4 pt-16 pb-24 space-y-8">
          {/* الوسم الرئيسي */}
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur border border-brand/40 text-brand-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            مؤسسة الحسينية — خدمات الأعمال والاستشارات
          </div>

          {/* العنوان الرئيسي */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-balance">
              إذا كنت{" "}
              <span className="text-brand border-b-2 border-brand/50 pb-1">
                {heroPhrase}
                <span className="animate-pulse">|</span>
              </span>
            </h1>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-white/90">
              لدينا الحل الذي تبحث عنه
            </h2>
          </div>

          {/* الرسالة الداعمة — نتائج لا قوائم خدمات */}
          <p className="max-w-3xl mx-auto text-base sm:text-xl text-white/65 leading-relaxed font-light text-pretty">
            قرارات مالية مبنية على أرقامٍ لا تقديرات، مشاريع تُسلَّم في موعدها وداخل ميزانيتها،
            وعمليات تُدار من جيبك بأمان —{" "}
            <strong className="text-brand-300 font-bold">شريك واحد</strong> يتكفّل بالتعقيد كي
            تتفرّغ أنت للنمو، مع نظام{" "}
            <strong className="text-brand-300 font-bold">Uamex_erp</strong> الذي يوحّد كل ذلك في
            مكان واحد.
          </p>

          {/* الـ CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              onClick={() => setLocation("/about")}
              className="bg-brand hover:bg-brand-deep text-ink font-black text-sm sm:text-base h-12 px-8 shadow-2xl rounded-2xl flex items-center gap-2 transition-all hover:scale-105"
            >
              <Zap className="w-5 h-5 fill-current" />
              اكتشف الحل المناسب لك
            </Button>
            <a
              href={uamexDemoLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm h-12 px-6 rounded-2xl font-medium transition-all"
            >
              <MessageSquare className="w-5 h-5 text-brand-300" />
              تحدث إلى خبير الآن
            </a>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("alias:open"))}
              className="inline-flex items-center gap-2 border border-[#d4a574]/40 bg-[#d4a574]/10 hover:bg-[#d4a574]/20 text-[#e8c9a0] text-sm h-12 px-6 rounded-2xl font-bold transition-all hover:scale-105"
            >
              <img
                src="/elias-avatar-sm.jpg"
                alt=""
                decoding="async"
                className="w-7 h-7 rounded-full object-cover ring-1 ring-[#d4a574]/60"
              />
              اسأل ألياس — الذكاء الاصطناعي
            </button>
          </div>

          {/* ضمانات */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              بدون التزامات مسبقة
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              تجربة Uamex_erp مجانية 14 يوماً
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              استشارة أولية مجانية
            </span>
          </div>

          {/* الإحصاءات */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-4">
            {brand.stats.map((stat, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur border border-white/10 p-4 rounded-2xl text-center shadow-lg"
              >
                <div className="text-2xl font-black text-brand-300 font-mono">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-[11px] text-white/60 mt-1 leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          شريط الثقة
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-ink/95 border-y border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 text-xs text-white/50">
          {brand.trustBadges.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-300" />
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          قسم: الخسارة الصامتة — Cost of Inaction (تسويق كمّي استشاري)
      ═══════════════════════════════════════════════════════════ */}
      <section id="cost-of-inaction" className="py-20 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto reveal">
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-12">
            <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold text-xs px-3 py-1">
              لماذا الآن؟ — التكلفة الحقيقية للتأجيل
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight">
              كل شهر تأجيل له ثمن محدد —{" "}
              <span className="text-[#b87945]">احسبه بنفسك</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              لا نطلب منك أن تؤمن بوعودنا تسويقية، بل بأرقامك أنت: حرّك المؤشرين
              وشاهد ما تُكلّفه المتابعة اليدوية مؤسستك فعليًا كل شهر.
            </p>
          </div>

          {(() => {
            const HOURLY_COST = 3000; // متوسط تكلفة ساعة العمل الإداري (ريال)
            const monthly =
              Math.round((teamSize * hoursLost * HOURLY_COST * 4.33) / 1000) * 1000;
            const fmt = (n: number) => n.toLocaleString("en-US");
            return (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
                {/* المدخلات التفاعلية */}
                <div className="lg:col-span-3 surface rounded-3xl p-8 space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label htmlFor="roi-team" className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#b87945]" />
                        حجم الفريق الإداري
                      </label>
                      <span className="font-mono font-black text-brand text-lg">{teamSize} فرد</span>
                    </div>
                    <input id="roi-team" type="range" min={1} max={50} value={teamSize}
                      onChange={e => setTeamSize(Number(e.target.value))}
                      aria-valuetext={`${teamSize} فرد`}
                      className="w-full accent-[#b87945]" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>١</span><span>٥٠</span></div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label htmlFor="roi-hours" className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-[#b87945]" />
                        ساعات مهدرة أسبوعيًا للفرد في المتابعة اليدوية
                      </label>
                      <span className="font-mono font-black text-brand text-lg">{hoursLost} ساعة</span>
                    </div>
                    <input id="roi-hours" type="range" min={1} max={20} value={hoursLost}
                      onChange={e => setHoursLost(Number(e.target.value))}
                      aria-valuetext={`${hoursLost} ساعة`}
                      className="w-full accent-[#b87945]" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>١</span><span>٢٠</span></div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-4">
                    التقدير مبني على متوسط تكلفة الساعة الإدارية (٣٬٠٠٠ ريال) وساعات تُصرف فعليًا
                    في نسخ البيانات والبحث عن الفواتير القديمة وتصحيح أخطاء الإدخال اليدوي.
                    للحصول على دراسة دقة مفصّلة لمؤسستك، اطلب استشارتك المجانية.
                  </p>
                </div>
                {/* النتيجة الكمّية + CTA */}
                <div className="lg:col-span-2 bg-gradient-to-br from-[#102a2b] to-[#1a3d3f] rounded-3xl p-8 text-white flex flex-col justify-between relative overflow-hidden">
                  <TrendingUp className="absolute -bottom-4 -left-4 w-28 h-28 text-white/[0.04] rotate-12" />
                  <div className="relative">
                    <p className="text-white/55 text-xs font-bold mb-2">متوسط خسارتك الشهرية</p>
                    <p className="font-mono font-black text-4xl sm:text-5xl text-brand-300 tabular-nums">
                      {fmt(monthly)}
                      <span className="text-base mr-2 text-white/50">ريال</span>
                    </p>
                    <p className="text-white/65 text-sm leading-relaxed mt-4">
                      أي ما يعادل{" "}
                      <span className="font-black text-white tabular-nums">{fmt(monthly * 12)}</span>{" "}
                      ريال سنويًا تتبخّر في أعمال ورقية يمكن أتمتتها بالكامل خلال أسبوع واحد.
                    </p>
                  </div>
                  <div className="relative mt-6 space-y-2.5">
                    <button onClick={() => goLogin()}
                      className="w-full bg-brand hover:bg-brand-deep text-ink font-black py-3 rounded-xl text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 shadow-lg shadow-brand/30">
                      <Zap className="w-4 h-4 fill-current" />
                      استعد هذه الساعات — ابدأ مجاناً
                    </button>
                    <a href={whatsappLink("السلام عليكم، حسبت خسائر الإدارة اليدوية على موقعكم وأود مناقشة الأرقام مع خبير.")}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 border border-white/20 hover:bg-white/10 text-white font-medium py-3 rounded-xl text-xs transition-all">
                      <MessageSquare className="w-4 h-4 text-brand-300" />
                      ناقش هذه الأرقام مع خبير
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          قسم ١: الاستشارات المؤسسية والإدارية
      ═══════════════════════════════════════════════════════════ */}
      <section id="corporate" className="py-20 px-4 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-14 reveal">
            <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
              ١ · الاستشارات المؤسسية والإدارية
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight">
              {brand.divisions.corporate.heroQuestion}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {brand.divisions.corporate.heroAnswer}
            </p>
          </div>

          {/* المشاكل والحلول */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {brand.divisions.corporate.problems.map((item, i) => {
              const icons: Record<string, React.ComponentType<any>> = {
                TrendingUp, ShieldCheck, Calculator, Building2,
              };
              const Icon = icons[item.icon] || TrendingUp;
              return (
                <div
                  key={i}
                  className="reveal surface rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all group"
                  data-reveal-delay={i * 100}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
                      <Icon className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm mb-2 flex items-start gap-2">
                        <span className="text-brand mt-0.5">⟵</span>
                        {item.q}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* الخدمات */}
          <div className="bg-ink rounded-3xl p-8 reveal">
            <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand" />
              ما نقدمه في الاستشارات المؤسسية
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {brand.divisions.corporate.services.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-sm text-white/70 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                  {s}
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={whatsappLink("السلام عليكم، أود طلب استشارة مؤسسية وإدارية.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand hover:bg-brand-deep text-ink font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105"
              >
                <MessageSquare className="w-4 h-4" />
                اطلب استشارة مجانية
              </a>
              <Button
                onClick={() => goLogin()}
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 text-sm px-6 py-3 rounded-xl h-auto"
              >
                دخول نظام Uamex_erp
                <ArrowRight className="w-4 h-4 rotate-180 mr-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          قسم ٢: الخدمات الهندسية والعقارية والمقاولات
      ═══════════════════════════════════════════════════════════ */}
      <section
        id="engineering"
        className="py-20 px-4 scroll-mt-20 bg-gradient-to-b from-sand to-[#f5ede0] dark:from-background dark:to-card"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-14 reveal">
            <Badge className="bg-[#b87945]/10 text-[#b87945] border border-[#b87945]/30 font-bold text-xs px-3 py-1">
              ٢ · الخدمات الهندسية والعقارية والمقاولات
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight">
              {brand.divisions.engineering.heroQuestion}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {brand.divisions.engineering.heroAnswer}
            </p>
            {/* الجمهور المستهدف */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {brand.divisions.engineering.personas.map(p => (
                <span
                  key={p}
                  className="text-xs bg-[#b87945]/10 border border-[#b87945]/20 text-[#9a6334] dark:text-brand-300 px-3 py-1 rounded-full font-medium"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* المشاكل والحلول */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {brand.divisions.engineering.problems.map((item, i) => {
              const icons: Record<string, React.ComponentType<any>> = {
                Calculator, Map, Ruler, HardHat,
              };
              const Icon = icons[item.icon] || Calculator;
              return (
                <div
                  key={i}
                  className="reveal surface rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all group border border-[#b87945]/10"
                  data-reveal-delay={i * 100}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#b87945]/10 border border-[#b87945]/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#b87945]" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm mb-2">
                        <span className="text-[#b87945]">السؤال: </span>
                        {item.q}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-emerald-600 font-bold">الجواب: </span>
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* بطاقة الخدمات + كيفية التواصل */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 reveal">
            <div className="lg:col-span-2 bg-gradient-to-br from-[#102a2b] to-[#1a3d3f] rounded-3xl p-8 text-white">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <HardHat className="w-5 h-5 text-brand" />
                الخدمات الهندسية والمساحية
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {brand.divisions.engineering.services.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 text-xs text-white/75 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Card */}
            <div className="bg-gradient-to-br from-[#b87945] to-[#9a6334] rounded-3xl p-8 text-ink flex flex-col justify-between">
              <div>
                <HardHat className="w-10 h-10 mb-4 opacity-80" />
                <h3 className="font-black text-xl mb-2">
                  احسب تكلفة مشروعك قبل البدء
                </h3>
                <p className="text-[13px] opacity-80 leading-relaxed">
                  نُعدّ لك جدول الكميات الكامل — حديد، خرسانة، بلوك — بأسعار السوق الحالية.
                </p>
              </div>
              <div className="mt-6 space-y-2.5">
                <a
                  href={engineeringConsultLink("تقييم وجدول كميات BOQ لمشروع بناء")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-ink/90 hover:bg-ink text-white font-bold py-3 rounded-xl text-sm transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  طلب جدول كميات BOQ
                </a>
                <a
                  href={engineeringConsultLink("رفع مساحي وتحديد حدود الأرض")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-ink font-bold py-3 rounded-xl text-sm transition-all"
                >
                  <Map className="w-4 h-4" />
                  طلب رفع مساحي
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          قسم ٣: الخدمات الطلابية والمكتبة والصيانة
      ═══════════════════════════════════════════════════════════ */}
      <section id="library" className="py-20 px-4 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-14 reveal">
            <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30 font-bold text-xs px-3 py-1">
              ٣ · الخدمات الطلابية والمكتبة والصيانة
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight">
              {brand.divisions.library.heroQuestion}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {brand.divisions.library.heroAnswer}
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {brand.divisions.library.personas.map(p => (
                <span
                  key={p}
                  className="text-xs bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-400 px-3 py-1 rounded-full font-medium"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* بطاقات المشاكل */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {brand.divisions.library.problems.map((item, i) => {
              const icons: Record<string, React.ComponentType<any>> = {
                BookOpen, BarChart3, Sparkles, Wrench,
              };
              const Icon = icons[item.icon] || BookOpen;
              return (
                <div
                  key={i}
                  className="reveal surface rounded-2xl p-5 text-center hover:-translate-y-1 hover:shadow-xl transition-all group"
                  data-reveal-delay={i * 80}
                >
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-sky-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                  </div>
                  <p className="font-bold text-foreground text-xs mb-3 leading-snug">{item.q}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              );
            })}
          </div>

          {/* قائمة الخدمات + CTA */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 reveal">
            <div className="lg:col-span-3 surface rounded-3xl p-8">
              <h3 className="font-bold text-foreground text-lg mb-5 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-sky-600" />
                قائمة الخدمات الطلابية والمكتبية
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {brand.divisions.library.services.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-muted-foreground bg-sky-500/5 border border-sky-500/10 rounded-xl px-3 py-2.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-sky-800 to-blue-950 rounded-3xl p-8 text-white flex flex-col justify-between">
              <div>
                <GraduationCap className="w-10 h-10 mb-4 text-sky-300" />
                <h3 className="font-black text-xl mb-3">
                  احجز خدمتك الآن
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  نُنجز طلبك في الوقت المحدد. طباعة، تحليل، تصميم، صيانة — بجودة وأمانة.
                </p>
              </div>
              <a
                href={whatsappLink("السلام عليكم، أود الاستفسار عن الخدمات الطلابية والمكتبية.")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center justify-center gap-2 bg-sky-400 hover:bg-sky-300 text-sky-900 font-black py-3 rounded-xl text-sm transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                تواصل عبر واتساب
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          قسم ٤: Uamex_erp — هوية النظام ومكوناته
      ═══════════════════════════════════════════════════════════ */}
      <section id="uamex" className="py-20 px-4 scroll-mt-20 bg-ink text-white">
        <div className="max-w-7xl mx-auto">
          {/* Uamex_erp Identity */}
          <div className="text-center space-y-4 max-w-4xl mx-auto mb-16 reveal">
            <div className="inline-flex items-center gap-3">
              <div className="h-px w-12 bg-brand/50" />
              <span className="text-brand-300 font-mono text-xs font-bold tracking-widest uppercase">
                Enterprise Software
              </span>
              <div className="h-px w-12 bg-brand/50" />
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="relative">
                <img src="/uamex-erp.png" alt="شعار نظام Uamex_erp" width={72} height={72}
                  className="rounded-2xl shadow-2xl shadow-brand/40 ring-1 ring-brand/30"
                  loading="lazy" decoding="async" />
                <span className="absolute -inset-1 rounded-2xl bg-brand/20 blur-md -z-10" />
              </div>
              <div className="text-right">
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  Uamex_erp
                </h2>
                <p className="text-brand-300 font-mono text-sm">
                  Unified Asset Management &amp; Enterprise Exchange
                </p>
              </div>
            </div>
            <p className="text-base sm:text-xl text-white/70 leading-relaxed font-light max-w-3xl mx-auto">
              {brand.uamex.tagline}
            </p>
            <p className="text-sm text-white/50 leading-relaxed max-w-2xl mx-auto">
              {brand.uamex.promise}
            </p>
          </div>

          {/* مشاكل يحلها Uamex_erp */}
          <div className="mb-16 reveal">
            <h3 className="text-center text-white/60 text-sm font-bold mb-8 uppercase tracking-widest">
              المشاكل التي يحلها Uamex_erp كل يوم
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brand.uamex.problems.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-4"
                >
                  <span className="text-brand font-black text-lg leading-none mt-0.5">✗</span>
                  <p className="text-white/75 text-sm leading-relaxed">{p}</p>
                </div>
              ))}
              <div className="flex items-start gap-3 bg-brand/10 border border-brand/30 rounded-2xl px-5 py-4 sm:col-span-2 lg:col-span-1">
                <span className="text-emerald-400 font-black text-lg leading-none mt-0.5">✓</span>
                <p className="text-white/90 text-sm leading-relaxed font-medium">
                  Uamex_erp يحل كل ما سبق في منصة واحدة آمنة
                </p>
              </div>
            </div>
          </div>

          {/* وحدات Uamex_erp */}
          <div className="reveal">
            <h3 className="text-center text-white font-bold text-xl mb-10">
              وحدات Uamex_erp — كل ما تحتاجه في نظام واحد
            </h3>

            {/* Tab selector */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {UAMEX_MODULES.map((mod, i) => {
                const icons: Record<string, React.ComponentType<any>> = {
                  BarChart3, ShoppingCart: Package, Package, Users, FolderKanban,
                };
                const Icon = icons[mod.icon] || BarChart3;
                return (
                  <button
                    key={mod.key}
                    onClick={() => setActiveUamexModule(i)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      i === activeUamexModule
                        ? "text-ink border-transparent shadow-lg shadow-brand/30"
                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                    style={
                      i === activeUamexModule
                        ? { background: mod.accent }
                        : {}
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {mod.name}
                  </button>
                );
              })}
            </div>

            {/* Active module detail */}
            {UAMEX_MODULES[activeUamexModule] && (() => {
              const mod = UAMEX_MODULES[activeUamexModule];
              const icons: Record<string, React.ComponentType<any>> = {
                BarChart3, ShoppingCart: Package, Package, Users, FolderKanban,
              };
              const Icon = icons[mod.icon] || BarChart3;
              return (
                <div
                  key={mod.key}
                  className="rounded-3xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500"
                  style={{ background: `linear-gradient(135deg, ${mod.accent}18, ${mod.accent}05)` }}
                >
                  <div className="p-8 sm:p-12 flex flex-col sm:flex-row items-start gap-8">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-xl"
                      style={{ background: mod.accent }}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-bold uppercase tracking-widest mb-2"
                        style={{ color: mod.accent }}
                      >
                        وحدة {mod.name}
                      </p>
                      <h4 className="text-white font-black text-xl sm:text-2xl mb-3 leading-tight">
                        {mod.tagline}
                      </h4>
                      <p className="text-white/60 text-sm leading-relaxed mb-6">
                        {mod.description}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => goLogin()}
                          className="inline-flex items-center gap-2 text-ink font-black px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
                          style={{ background: mod.accent }}
                        >
                          <Zap className="w-4 h-4" />
                          جرّب الوحدة مجاناً
                        </button>
                        <a
                          href={uamexDemoLink()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          اطلب عرضاً تجريبياً
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Uamex_erp CTA */}
          <div className="mt-16 text-center space-y-6 reveal">
            <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
              <Lock className="w-5 h-5 text-emerald-400" />
              <span className="text-white/70 text-sm">
                بياناتك معزولة ومشفّرة — لا أحد يصل إليها غيرك
              </span>
              <span className="text-white/30">·</span>
              <RefreshCw className="w-5 h-5 text-brand-300" />
              <span className="text-white/70 text-sm">
                يعمل بدون إنترنت ويتزامن تلقائياً
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                onClick={() => goLogin()}
                className="bg-brand hover:bg-brand-deep text-ink font-black h-14 px-10 rounded-2xl shadow-2xl shadow-brand/40 text-base hover:scale-105 transition-all"
              >
                <Zap className="w-5 h-5 ml-2 fill-current" />
                ابدأ تجربة Uamex_erp مجاناً — 14 يوماً
              </Button>
              <a
                href={uamexDemoLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium h-14 px-8 rounded-2xl text-sm transition-all"
              >
                <MessageSquare className="w-5 h-5 text-brand-300" />
                تحدث إلى خبير الآن
              </a>
            </div>
            <p className="text-white/40 text-xs">
              بدون بطاقة ائتمان · تفعيل فوري · دعم مباشر طوال فترة التجربة
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          الشهادات
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 reveal">
            <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
              من عملائنا
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              ماذا يقول من جرّبوا الخدمة؟
            </h2>
            <p className="text-sm text-muted-foreground">
              تجارب حقيقية من مديرين ومهندسين وطلاب في اليمن
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {brand.testimonials.map((t, i) => (
              <Card
                key={i}
                className="reveal surface p-6 rounded-2xl hover:-translate-y-1 hover:shadow-xl transition-all"
                data-reveal-delay={i * 100}
              >
                <div className="flex items-center gap-1 text-brand mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty mb-5">
                  «{t.quote}»
                </p>
                <div className="border-t border-border pt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center text-ink font-black text-sm">
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
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-gradient-to-b from-sand to-white dark:from-background dark:to-card">
        <div className="max-w-3xl mx-auto">
          <div className="text-center space-y-3 mb-12 reveal">
            <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
              أسئلة شائعة
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              إجابات على أكثر الأسئلة شيوعاً
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {brand.faq.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="reveal surface rounded-xl px-5 border border-border"
                data-reveal-delay={i * 60}
              >
                <AccordionTrigger className="text-sm font-bold text-foreground py-4 text-right hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          قصص تحوّل بالأرقام — دليل عملي لا وعود
      ═══════════════════════════════════════════════════════════ */}
      <section id="case-studies" className="py-20 px-4 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-14 reveal">
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs px-3 py-1">
              نتائج موثّقة — قبل / بعد
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight">
              تحوّلات حقيقية تُقاس بالأرقام لا بالصفات
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              ثلاث قطاعات وثلاث بدايات مختلفة — ومنهجية واحدة: تشخيص دقيق، تدخّل هندسي، ثم قياس الأثر بالأرقام.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {CASE_STUDIES.map(cs => {
              const Icon = cs.icon;
              return (
                <div key={cs.sector} className="reveal surface rounded-3xl p-7 flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-11 h-11 rounded-2xl bg-brand/10 border border-brand/25 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-brand" />
                    </span>
                    <span className="font-black text-foreground text-sm">{cs.sector}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                    <span className="text-[#b87945] font-bold">التحدي: </span>
                    {cs.challenge}
                  </p>
                  <ul className="space-y-3.5 mb-5">
                    {cs.results.map(r => (
                      <li key={r.metric} className="text-xs">
                        <p className="text-muted-foreground mb-1.5">{r.metric}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="line-through decoration-rose-400/60 text-rose-600/80 dark:text-rose-400/70 font-mono text-[11px]">{r.before}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground rotate-180 shrink-0" />
                          <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">{r.after}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto text-[10px] text-muted-foreground/70 border-t border-border/60 pt-3">
                    من واقع تشغيل فعلي — التفاصيل الكاملة متاحة في دراسة الحالة عند الطلب.
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── شريط الثقة المؤسسي: بنية أمنية قابلة للتحقق ── */}
          <div className="mt-16 reveal rounded-3xl border border-white/10 bg-[#0a1f20] text-white p-8 sm:p-10 relative overflow-hidden">
            <ShieldCheck className="absolute -top-6 -left-6 w-44 h-44 text-white/[0.03]" />
            <div className="relative">
              <h3 className="font-black text-lg sm:text-xl mb-2">
                بنية بمستوى المؤسسات — هندسةٌ لا شعارات
              </h3>
              <p className="text-white/50 text-sm mb-7 max-w-2xl leading-relaxed">
                كل بند هنا قابل للتحقق تقنيًا في معمارية المنصة، وليس عبارة أمانٍ عامة.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ENTERPRISE_ASSURANCES.map(a => {
                  const Icon = a.icon;
                  return (
                    <div key={a.label} className="flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 transition-colors">
                      <Icon className="w-4 h-4 text-brand-300 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white/90">{a.label}</p>
                        <p className="text-[10px] text-white/45 leading-relaxed mt-0.5">{a.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CTA النهائي — قوي ولا يُقاوَم
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-ink text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,121,69,0.12),transparent_65%)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/30 text-brand-300 px-4 py-1.5 rounded-full text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            ابدأ رحلتك مع الحسينية
          </div>
          <h2 className="text-3xl sm:text-5xl font-black leading-tight text-balance">
            كل يوم تنتظر
            <span className="text-brand"> خسارة إضافية </span>
            يمكن تجنبها
          </h2>
          <p className="text-white/60 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            سواء كنت تبحث عن استشارة مالية، تصميم هندسي، خدمة طلابية، أو نظام لإدارة أعمالك —
            فريق الحسينية جاهز اليوم.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              onClick={() => goLogin()}
              className="bg-brand hover:bg-brand-deep text-ink font-black h-14 px-10 rounded-2xl shadow-2xl shadow-brand/40 text-base hover:scale-105 transition-all"
            >
              <Zap className="w-5 h-5 ml-2 fill-current" />
              ابدأ مجاناً الآن
            </Button>
            <a
              href={whatsappLink("السلام عليكم، أود الاستفسار عن خدمات مؤسسة الحسينية.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 hover:bg-white/5 text-white font-medium h-14 px-8 rounded-2xl text-sm transition-all"
            >
              <MessageSquare className="w-5 h-5 text-brand-300" />
              تواصل عبر واتساب
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-white/40">
            <span>✓ استشارة أولى مجانية</span>
            <span>✓ تجربة Uamex_erp مجانية 14 يوماً</span>
            <span>✓ بدون التزامات</span>
            <span>✓ دعم مباشر على الواتساب</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          قسم المنهجية والمرجعيات العالمية — للباحثين والمستشارين
      ═══════════════════════════════════════════════════════ */}
      <section
        id="methodology"
        className="py-20 px-4 bg-[#0a1f20] text-white scroll-mt-20"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-14">
            <Badge className="bg-[#d4a574]/10 text-[#d4a574] border border-[#d4a574]/30 font-bold text-xs px-3 py-1">
              المرجعية المنهجية — Methodology & Standards
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
              {methodology.title}
            </h2>
            <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-2xl mx-auto">
              {methodology.intro}
            </p>
          </div>

          {/* المرجعيات المعيارية */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {methodology.frameworks.map(fw => (
              <div
                key={fw.code}
                className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#d4a574]/40 rounded-2xl p-5 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono font-black text-sm bg-[#d4a574]/15 text-[#e8c9a0] border border-[#d4a574]/30 rounded-lg px-2.5 py-1">
                    {fw.code}
                  </span>
                  <span className="text-xs font-bold text-white/85">
                    {fw.nameAr}
                  </span>
                </div>
                <p className="text-[12px] text-white/55 leading-relaxed">
                  {fw.application}
                </p>
                {/* البند المرجعي + الأثر القابل للتدقيق */}
                <div className="mt-4 pt-3 border-t border-white/[0.07] space-y-1.5">
                  <p className="text-[10px] font-mono text-[#d4a574]/80" dir="ltr">
                    {fw.ref}
                  </p>
                  <p className="text-[11px] text-emerald-300/75 leading-relaxed flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-bold text-emerald-300/90">أثر قابل للتدقيق: </span>
                      {fw.evidence}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* منهجية التنفيذ — أربع مراحل */}
          <h3 className="text-center text-lg font-black text-white/90 mb-8">
            دورة عمل موثقة من التشخيص إلى التحسين المستمر
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {methodology.process.map(st => (
              <div
                key={st.step}
                className="relative bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 rounded-2xl p-5"
              >
                <span className="absolute -top-3 right-5 w-8 h-8 rounded-full bg-gradient-to-l from-[#b87945] to-[#d4a574] text-[#0a1f20] font-black text-sm flex items-center justify-center shadow-lg">
                  {st.step}
                </span>
                <div className="pt-3">
                  <div className="text-sm font-black text-[#e8c9a0] mb-1.5">
                    {st.title}
                  </div>
                  <p className="text-[11px] text-white/55 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* معجم المنهجية — توحيد لغة العمل بين المستشار والعميل */}
          <div className="mt-14 reveal">
            <h3 className="text-center text-lg font-black text-white/90 mb-2">
              معجم المنهجية — المصطلحات التي نبني بها
            </h3>
            <p className="text-center text-[11px] text-white/40 mb-8 max-w-xl mx-auto leading-relaxed">
              كل مصطلح يظهر في عقودنا وتقاريرنا مُعرَّف هنا أولاً — لأن الاتفاق على اللغة هو أول خطوات جودة العمل.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {standardsGlossary.map(g => (
                <div
                  key={g.term}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 transition-colors"
                >
                  <p className="text-xs font-black text-[#e8c9a0] mb-1">
                    {g.term}
                    {g.en && (
                      <span className="font-mono text-[9px] text-white/35 mr-2" dir="ltr">
                        {g.en}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-white/50 leading-relaxed">{g.definition}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-white/35 mt-10 max-w-2xl mx-auto leading-relaxed">
            تُعرض المرجعيات أعلاه كإطار منهجي لعملنا وممارساتنا المعلنة، وتصلح
            نقطة انطلاق بحثية لمن يرغب في دراسة تطبيق هذه الأطر في سياق
            المنشآت الصغيرة والمتوسطة.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
