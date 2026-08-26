import React, { useMemo } from "react";
import { useLocation } from "wouter";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { brand, whatsappLink, uamexDemoLink } from "@/lib/brand";
import {
  ArrowLeft,
  Crown,
  Sparkles,
  Check,
  MessageSquare,
  Download,
  AlertTriangle,
  Wallet,
} from "lucide-react";

type SubStatus = "trial" | "active" | "grace" | "suspended";

const SUB_STATUS_META: Record<
  SubStatus,
  { label: string; tone: string; hint: string }
> = {
  trial: {
    label: "تجربة مجانية",
    tone: "bg-brand-100 text-brand-800",
    hint: "جميع الوحدات مفعّلة — بدون بطاقة ائتمان",
  },
  active: {
    label: "اشتراك نشط",
    tone: "bg-emerald-100 text-emerald-700",
    hint: "كل مزايا النظام متاحة ومؤمّنة",
  },
  grace: {
    label: "مهلة مرنة",
    tone: "bg-amber-100 text-amber-700",
    hint: "النظام مستمر بالعمل — أعد ترتيب التجديد على راحتك",
  },
  suspended: {
    label: "موقوف",
    tone: "bg-rose-100 text-rose-700",
    hint: "تواصل مع الدعم لإعادة التفعيل",
  },
};

function resolveStatus(
  status: string | undefined,
  trialEndsAt?: string | Date | null
): SubStatus {
  const s = (status ?? "trial") as SubStatus;
  if (s === "suspended") return "suspended";
  if (s === "trial" && trialEndsAt) {
    const end = new Date(trialEndsAt).getTime();
    if (end <= Date.now()) return "grace";
  }
  return s;
}

export default function Billing() {
  const [, setLocation] = useLocation();
  const { data: settings } = trpc.accounting.getSettings.useQuery(undefined, {
    staleTime: 30_000,
  });

  const subscriptionStatus = settings?.subscriptionStatus ?? "trial";
  const trialEndsAt = settings?.trialEndsAt ?? null;
  const status = useMemo(
    () => resolveStatus(subscriptionStatus, trialEndsAt),
    [subscriptionStatus, trialEndsAt]
  );
  const meta = SUB_STATUS_META[status];

  const trialDaysLeft =
    status === "trial" && trialEndsAt
      ? Math.max(
          0,
          Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000)
        )
      : null;

  const institutionName = settings?.institutionName || "مؤسستك";
  const isTrial = status === "trial";
  const isGrace = status === "grace";

  const renewalText =
    status === "trial"
      ? "السلام عليكم، أودّ تفعيل اشتراك Uamex_erp بعد التجربة المجانية."
      : status === "grace"
        ? "السلام عليكم، أودّ تجديد اشتراك مؤسستي بعد فترة التجربة."
        : "السلام عليكم، أودّ الترقية إلى خطة أعلى في نظام Uamex_erp.";

  return (
    <div className="min-h-screen bg-background text-foreground font-display flex">
      <AppSidebar />
      <div className="brand-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => setLocation("/app")}
            className="flex items-center gap-1.5 text-xs text-brand-300 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            العودة للوحة التحكم
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand text-ink flex items-center justify-center font-bold shadow-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display">
                مركز الاشتراك والفوترة
              </h1>
              <p className="text-xs text-white/70 mt-0.5">
                باقة {institutionName} الحالية، التجديد، وسياسة المرونة المعتمدة
                — بوضوح دون مفاجآت.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ── Status hero ── */}
        <div className="surface rounded-2xl p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 shrink-0 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-black">حالة الاشتراك الحالية</h2>
                  <Badge
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.tone}`}
                  >
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isTrial && trialDaysLeft != null
                    ? `تبقّى ${trialDaysLeft} ${trialDaysLeft === 1 ? "يوم" : "أيام"} من التجربة — وبعدها تنتقل تلقائياً إلى مهلة مرنة دون أي توقف.`
                    : meta.hint}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={whatsappLink(renewalText)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-deep text-ink text-xs font-bold h-9 px-4 rounded-xl transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4" />
                {isTrial
                  ? "فعّل اشتراكك الآن"
                  : isGrace
                    ? "جدّد الاشتراك"
                    : "الترقية أو التجديد"}
              </a>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => setLocation("/pricing")}
              >
                مقارنة الباقات
              </Button>
            </div>
          </div>
          {isGrace && (
            <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                سياستنا واضحة: انتهاء التجربة <b>لا يوقف أعمالك أبداً</b>. أنت
                الآن في مهلة مرنة، وكل بياناتك ووحداتك محفوظة كما هي. عند
                التيسّر عاود التواصل للتجديد.
              </p>
            </div>
          )}
        </div>

        {/* ── Plans ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black flex items-center gap-2">
              <Crown className="w-4 h-4 text-brand" />
              <span>باقات Uamex_erp</span>
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {brand.pricing.note}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {brand.pricing.plans.map(plan => (
              <Card
                key={plan.key}
                className={`surface rounded-2xl transition-all hover:-translate-y-0.5 ${
                  plan.highlight ? "ring-2 ring-brand/60 shadow-lg" : ""
                }`}
              >
                <div className="relative p-5">
                  {plan.highlight && (
                    <span className="absolute -top-2.5 left-4 bg-brand text-ink text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                      الأكثر طلباً
                    </span>
                  )}
                  <h4 className="text-sm font-black">{plan.name}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 min-h-8">
                    {plan.desc}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black">{plan.price}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map(f => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-[11px] text-foreground/85"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={
                      plan.key === "starter"
                        ? uamexDemoLink()
                        : whatsappLink(
                            `السلام عليكم، أودّ الاشتراك/التعرّف على باقة «${plan.name}» في Uamex_erp.`
                          )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl h-9 text-xs font-black transition-all hover:scale-[1.02] ${
                      plan.highlight
                        ? "bg-brand hover:bg-brand-deep text-ink shadow"
                        : "border border-border bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Trust & information ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="surface rounded-2xl p-5">
            <h4 className="flex items-center gap-2 text-xs font-black mb-2">
              <Sparkles className="w-4 h-4 text-brand" /> التزام بالمرونة
            </h4>
            <ul className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
              <li>
                • المرونة المعتمدة: تجربة ← نشط ← مهلة مرنة، وموقوف فقط بطلبك
                الصريح.
              </li>
              <li>• لا يُوقف نظامك تلقائياً أبداً — أعمالك مستمرة.</li>
              <li>
                • بياناتك معزولة ومشفّرة مع نسخ احتياطية يومية على السحابة.
              </li>
            </ul>
          </div>
          <div className="surface rounded-2xl p-5">
            <h4 className="flex items-center gap-2 text-xs font-black mb-2">
              <MessageSquare className="w-4 h-4 text-brand" /> وسائل دفع محلية
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              نستقبل الدفع عبر التحويل البنكي والمحافظ والتمويل المحلية — يحدد
              فريقنا التفاصيل معك مباشرة.
            </p>
            <a
              href={whatsappLink(
                "السلام عليكم، أودّ الاستفسار عن وسائل الدفع المتاحة للاشتراك Uamex_erp."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand hover:text-brand-deep"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              استفسر عن وسائل الدفع
            </a>
          </div>
          <div className="surface rounded-2xl p-5">
            <h4 className="flex items-center gap-2 text-xs font-black mb-2">
              <Download className="w-4 h-4 text-brand" /> المنصة على جهازك
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              ثبّت النظام كتطبيق سطح مكتب أو موبايل، واعمل أوفلاين مع مزامنة
              تلقائية عند عودة الاتصال.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/download")}
              className="h-8 text-xs"
            >
              <Download className="w-3.5 h-3.5 ml-1" />
              تحميل التطبيق
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
