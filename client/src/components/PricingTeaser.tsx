import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Zap,
  ArrowRight,
  MessageSquare,
  Star,
} from "lucide-react";
import { brand, whatsappLink } from "@/lib/brand";

/**
 * PricingTeaser — World-class pricing preview section.
 *
 * Shows the 3 pricing tiers from brand.pricing as a compact teaser
 * with a strong CTA to the full pricing page.
 * Design: 3-column cards, middle card highlighted as "most popular".
 * Marketing-only: does NOT affect the internal ERP system.
 */
export function PricingTeaser() {
  const { title, subtitle, plans } = brand.pricing;

  return (
    <section
      id="pricing"
      className="py-20 px-4 bg-gradient-to-b from-muted/30 via-background to-background border-y border-border/50 scroll-mt-20"
      aria-labelledby="pricing-teaser-title"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 mb-14 reveal">
          <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
            تسعير شفاف
          </Badge>
          <h2
            id="pricing-teaser-title"
            className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {plans.map(plan => (
            <div
              key={plan.key}
              className={`reveal relative rounded-2xl border p-6 flex flex-col transition-all hover:-translate-y-1 ${
                plan.highlight
                  ? "border-brand shadow-xl shadow-brand/20 bg-ink text-white scale-[1.02]"
                  : "border-border bg-card"
              }`}
            >
              {/* Popular badge */}
              {plan.highlight && (
                <div className="absolute -top-3 right-6">
                  <span className="inline-flex items-center gap-1 bg-brand text-ink-deep text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    الأكثر طلباً
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3
                  className={`font-black text-lg mb-1 ${
                    plan.highlight ? "text-brand-300" : "text-foreground"
                  }`}
                >
                  {plan.name}
                </h3>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black tabular-nums">
                    {plan.price}
                  </span>
                  <span
                    className={`text-xs mb-1 ${
                      plan.highlight ? "text-white/50" : "text-muted-foreground"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className={`text-xs mt-2 leading-relaxed ${
                    plan.highlight ? "text-white/60" : "text-muted-foreground"
                  }`}
                >
                  {plan.desc}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plan.highlight ? "text-brand-300" : "text-emerald-500"
                      }`}
                    />
                    <span
                      className={`text-xs leading-relaxed ${
                        plan.highlight
                          ? "text-white/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={() => {
                  if (plan.key === "starter") {
                    window.location.href = "/login";
                  } else if (plan.key === "business") {
                    window.open(
                      whatsappLink(
                        "السلام عليكم، أود الاستفسار عن خطة الأعمال في نظام Uamex_erp."
                      ),
                      "_blank"
                    );
                  } else {
                    window.open(
                      whatsappLink(
                        "السلام عليكم، أود مناقشة خطة المؤسسات لنظام Uamex_erp."
                      ),
                      "_blank"
                    );
                  }
                }}
                className={`w-full h-11 text-sm font-bold rounded-xl transition-all ${
                  plan.highlight
                    ? "bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep shadow-lg shadow-brand/30"
                    : "bg-foreground text-background hover:bg-ink hover:text-white"
                }`}
              >
                <Zap className="w-4 h-4 ml-2 fill-current" />
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Footnote + full pricing link */}
        <div className="text-center space-y-4 reveal">
          <p className="text-xs text-muted-foreground">{brand.pricing.note}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 text-brand hover:text-brand-deep text-sm font-bold transition-colors"
            >
              عرض جميع الخطط والتفاصيل الكاملة
              <ArrowRight className="w-4 h-4 rotate-180" />
            </a>
            <a
              href={whatsappLink(
                "السلام عليكم، أود استشارة مجانية لاختيار الباقة المناسبة."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              استشارة مجانية لاختيار الباقة
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
