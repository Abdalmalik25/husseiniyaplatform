import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Landmark,
  Building2,
  MessageSquare,
  ShoppingCart,
  HardHat,
  BookOpen,
  Plug,
} from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * IntegrationsEcosystem — World-class integrations showcase.
 *
 * Inspired by: Zapier's ecosystem pages, Stripe's integrations, Odoo
 * marketplace layout.
 *
 * Design principles:
 * - Visual grid of integration logos (stylized tiles since we don't have
 *   real partner logos).
 * - Grouped by category for cognitive ease.
 * - Subtle hover states with elevation.
 * - "API available" footer for developers/custom integrators.
 *
 * Marketing-only component.
 */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Landmark,
  Building2,
  MessageSquare,
  ShoppingCart,
  HardHat,
  BookOpen,
};

export function IntegrationsEcosystem() {
  const { title, subtitle, categories } = brand.integrations;

  return (
    <section
      id="integrations"
      className="py-20 px-4 scroll-mt-20"
      aria-labelledby="integrations-title"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-12 reveal">
          <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
            <Plug className="w-3 h-3 ml-1" />
            منظومة التكاملات
          </Badge>
          <h2
            id="integrations-title"
            className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 reveal">
          {categories.map((cat, i) => {
            const Icon = ICON_MAP[cat.icon] || Plug;
            return (
              <div
                key={cat.name}
                className="surface rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                data-reveal-delay={i * 80}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand" />
                  </div>
                  <h3 className="font-black text-foreground text-sm">
                    {cat.name}
                  </h3>
                </div>

                {/* Integration tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {cat.items.map((item, j) => (
                    <div
                      key={j}
                      className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-brand/10 border border-border hover:border-brand/30 transition-all cursor-default"
                      title={item}
                    >
                      {/* Stylized logo tile — first letter monogram */}
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/15 to-brand/5 border border-brand/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="font-black text-brand text-xs leading-none">
                          {item.charAt(0)}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2 font-medium">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* API footer */}
        <div className="mt-12 surface rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 reveal">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
              <Plug className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h3 className="font-black text-foreground text-sm">
                API و Webhooks مفتوحة
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                أنشئ تكاملاتك الخاصة مع REST API موثّقة و Webhooks لحظية — مرجع
                OpenAPI 3.0 جاهز للمطورين.
              </p>
            </div>
          </div>
          <a
            href="#methodology"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black px-5 py-2.5 rounded-xl text-xs transition-all hover:scale-105 whitespace-nowrap"
          >
            اطّلع على المرجع التقني
          </a>
        </div>
      </div>
    </section>
  );
}
