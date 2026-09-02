import React from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, X } from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * WhyUsComparison — World-class competitive comparison table.
 *
 * Design principles:
 * - Two-column: "Uamex_erp + الحسينية" vs "البديل التقليدي"
 * - Use ✓ / ✗ for clear visual scanning
 * - Highlight our column subtly with brand accent
 * - Fully responsive: horizontal scroll on very small screens
 * - Semantic table with proper headers
 * - Marketing-only: does NOT affect the internal ERP system.
 */
export function WhyUsComparison() {
  const { title, subtitle, rows } = brand.whyUsComparison;

  return (
    <section className="py-20 px-4 scroll-mt-20" aria-labelledby="why-us-title">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 mb-12 reveal">
          <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
            لماذا الحسينية
          </Badge>
          <h2
            id="why-us-title"
            className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Comparison table */}
        <div className="reveal rounded-2xl border border-border overflow-hidden shadow-lg">
          {/* Table header */}
          <div className="grid grid-cols-3 bg-ink text-white">
            <div className="p-4 text-xs font-mono font-bold text-white/50" />
            <div className="p-4 text-center border-r border-white/10">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-black text-sm">الحسينية + Uamex_erp</span>
              </div>
            </div>
            <div className="p-4 text-center">
              <span className="font-black text-sm text-white/40">
                البديل التقليدي
              </span>
            </div>
          </div>

          {/* Table rows */}
          {rows.map((row, i) => {
            const isEven = i % 2 === 0;
            return (
              <div
                key={row.feature}
                className={`grid grid-cols-3 ${isEven ? "bg-white" : "bg-muted/30"}`}
              >
                {/* Feature name */}
                <div className="p-4 flex items-center">
                  <span className="text-xs font-bold text-foreground leading-snug">
                    {row.feature}
                  </span>
                </div>

                {/* Ours — brand column */}
                <div className="p-4 border-r border-border flex items-center gap-2 bg-brand/5">
                  {row.us.startsWith("✓") ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">
                      {row.us}
                    </span>
                  )}
                </div>

                {/* Others */}
                <div className="p-4 flex items-center gap-2">
                  {row.others.startsWith("✗") ? (
                    <span className="w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                      <X className="w-3 h-3 text-rose-500" />
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground leading-snug">
                      {row.others}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bottom CTA row */}
          <div className="grid grid-cols-3 bg-gradient-to-l from-brand/10 to-transparent">
            <div className="p-4 flex items-center">
              <span className="text-[11px] font-bold text-muted-foreground">
                قرارك الآن
              </span>
            </div>
            <div className="p-4 border-r border-border">
              <a
                href="/pricing"
                className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs px-4 py-2 rounded-xl transition-all hover:scale-105"
              >
                ابدأ مجاناً
                <ArrowRight className="w-3 h-3 rotate-180" />
              </a>
            </div>
            <div className="p-4 flex items-center">
              <span className="text-[10px] text-muted-foreground">
                دراسة جدوى + ترخيص + إعداد + تدريب مكلف
              </span>
            </div>
          </div>
        </div>

        {/* Trust footnote */}
        <p className="text-center text-[11px] text-muted-foreground mt-6">
          جميع المقارنات مبنية على واقع تشغيل فعلي لعملائنا قبل وبعد adoption
        </p>
      </div>
    </section>
  );
}
