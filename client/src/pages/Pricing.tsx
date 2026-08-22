import { useState } from "react";
import { useLocation } from "wouter";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brand } from "@/lib/brand";
import {
  Check,
  CreditCard,
  Sparkles,
  Building2,
  Phone,
} from "lucide-react";

interface Plan {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  action: () => void;
  highlight?: boolean;
}

export default function Pricing() {
  const [, setLocation] = useLocation();

  const plans: Plan[] = [
    {
      name: "تجريبية",
      price: "مجانية",
      period: "لمدة 14 يوماً",
      desc: "جرّب كامل المنصة قبل أي التزام.",
      features: [
        "جميع الوحدات والمساحات",
        "فرع واحد + مستخدم واحد",
        "مزامنة أوفلاين وسحابة",
        "دعم عبر الواتساب",
        "نسخ احتياطي سحابي آمن",
      ],
      cta: "ابدأ التجربة المجانية",
      action: () => setLocation("/"),
    },
    {
      name: "الأعمال",
      price: "من ١٩",
      period: "ريال يمني / شهرياً",
      desc: "للمؤسسات النامية والفروع المتعددة.",
      highlight: true,
      features: [
        "المحاسبة + التجارة + التقارير",
        "حتى 3 فروع و5 مستخدمين",
        "مزامنة أوفلاين وسحابة",
        "مستشار مالي بالذكاء الاصطناعي",
        "دعم ذو أولوية",
      ],
      cta: "ابدأ الآن",
      action: () => setLocation("/app"),
    },
    {
      name: "المؤسسات",
      price: "مخصصة",
      period: "حسب حجم مؤسستك",
      desc: "للمجموعات والجهات الكبيرة ومتعددة الفروع.",
      features: [
        "كل ما سبق + الهندسة والمكتبة",
        "فروع ومستخدمون غير محدودين",
        "تكاملات وأتمتة مخصصة",
        "مدير حساب مخصص",
        "ضوابط حوكمة ومطابقة ISO",
      ],
      cta: "تواصل المبيعات",
      action: () => setLocation("/contact"),
    },
  ];

  return (
    <div
      className="min-h-screen bg-sand text-ink dark:bg-background dark:text-foreground font-display"
      dir="rtl"
    >
      <HeaderNavbar />

      {/* Hero */}
      <section className="relative text-white py-20 px-4 overflow-hidden border-b border-white/10 bg-ink">
        <div className="max-w-5xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur border border-brand/50 text-brand-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
            <CreditCard className="w-4 h-4 text-brand" />
            الأسعار والباقات
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-tight text-balance">
            باقة تناسب حجم مؤسستك
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-lg text-white/70 leading-relaxed font-light">
            ابدأ بتجربة مجانية كاملة 14 يوماً، ثم اختر الباقة التي تنمو معك —
            بدون بطاقة ائتمان ومن أي مكان.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((p, i) => (
            <Card
              key={i}
              className={`rounded-3xl p-6 flex flex-col border-2 ${
                p.highlight
                  ? "border-brand bg-brand/5 shadow-2xl relative"
                  : "border-border bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 right-6 bg-brand text-ink text-[10px] font-black px-3 py-1 rounded-full shadow">
                  الأكثر اختياراً
                </span>
              )}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  {p.highlight ? (
                    <Sparkles className="w-5 h-5" />
                  ) : (
                    <Building2 className="w-5 h-5" />
                  )}
                </div>
                <h3 className="font-bold text-lg text-foreground">{p.name}</h3>
              </div>

              <div className="mb-1">
                <span className="text-3xl font-black text-foreground">
                  {p.price}
                </span>
                <span className="text-xs text-muted-foreground mr-2">
                  {p.period}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                {p.desc}
              </p>

              <ul className="space-y-2.5 text-xs text-muted-foreground mb-6 flex-1">
                {p.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={p.action}
                className={`w-full h-11 font-bold rounded-xl ${
                  p.highlight
                    ? "bg-brand hover:bg-brand-deep text-ink"
                    : "bg-ink hover:bg-ink-deep text-white"
                }`}
              >
                {p.cta}
              </Button>
            </Card>
          ))}
        </div>

        {/* Universal inclusions */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {brand.trustBadges.map((b, i) => (
            <div
              key={i}
              className="surface rounded-2xl px-4 py-5 text-[11px] font-medium text-muted-foreground"
            >
              {b}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          جميع الباقات تشمل الأمان المؤسسي (JWT)، العزل الكامل للبيانات، العمل
          الأوفلاين، ودعم متعدد العملات والفروع.
        </p>

        <div className="flex justify-center mt-6">
          <Button
            onClick={() => setLocation("/contact")}
            variant="outline"
            className="gap-2"
          >
            <Phone className="w-4 h-4" />
            تحدث إلى فريق المبيعات
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
