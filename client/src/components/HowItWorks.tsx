import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Layers,
  Zap,
  BarChart3,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * HowItWorks — 4-step visual journey section for the landing page.
 * World-class SaaS pattern: clear, numbered steps with timelines.
 * Each step shows: icon, title, description, expected time.
 * Animated connector line between steps.
 * Fully accessible: aria-labels, semantic HTML.
 * Marketing-only component.
 */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Layers,
  Zap,
  BarChart3,
};

export function HowItWorks() {
  const { title, subtitle, steps } = brand.howItWorks;

  return (
    <section
      className="py-20 px-4 bg-gradient-to-b from-background to-muted/30 border-y border-border/50"
      aria-labelledby="how-it-works-title"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-16 reveal">
          <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
            كيف نعمل
          </Badge>
          <h2
            id="how-it-works-title"
            className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Steps — vertical timeline on mobile, horizontal on desktop */}
        <div className="relative">
          {/* Connector line — desktop only */}
          <div
            className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-l from-brand/40 via-brand/60 to-brand/40"
            aria-hidden
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {steps.map((step, i) => {
              const Icon = ICON_MAP[step.icon] || BarChart3;
              const isLast = i === steps.length - 1;

              return (
                <div
                  key={step.num}
                  className="reveal relative flex flex-col items-center text-center group"
                  data-reveal-delay={i * 100}
                >
                  {/* Step number badge */}
                  <div className="relative z-10 mb-4">
                    <span className="w-14 h-14 rounded-2xl bg-brand text-ink font-black text-lg flex items-center justify-center shadow-xl shadow-brand/30 ring-2 ring-brand/20">
                      {step.num}
                    </span>
                    {/* Pulse ring */}
                    <span className="absolute inset-[-4px] rounded-2xl border-2 border-brand/30 animate-ping opacity-40" />
                  </div>

                  {/* Card */}
                  <div className="surface rounded-2xl p-5 w-full flex-1 flex flex-col text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-5 h-5 text-brand" />
                    </div>

                    {/* Title */}
                    <h3 className="font-black text-foreground text-sm mb-2 leading-snug">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-3">
                      {step.desc}
                    </p>

                    {/* Time badge */}
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/8 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full mx-auto">
                      <Clock className="w-3 h-3" />
                      {step.time}
                    </div>
                  </div>

                  {/* Connector arrow — mobile only */}
                  {isLast ? null : (
                    <div
                      className="lg:hidden flex items-center justify-center mt-3 text-brand/40"
                      aria-hidden
                    >
                      <CheckCircle2 className="w-5 h-5 animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 text-center reveal">
          <a
            href={brand.contact.whatsapp.startsWith("967") ? `https://wa.me/${brand.contact.whatsapp}?text=${encodeURIComponent("السلام عليكم، أود معرفة المزيد عن طريقة العمل")}` : `https://wa.me/${brand.contact.whatsapp}?text=${encodeURIComponent("السلام عليكم، أود معرفة المزيد عن طريقة العمل")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-deep text-ink font-black px-8 py-4 rounded-2xl text-sm shadow-xl shadow-brand/30 transition-all hover:scale-105"
          >
            <Zap className="w-5 h-5 fill-current" />
            ابدأ رحلتك — تواصل مجاني
          </a>
          <p className="text-xs text-muted-foreground mt-3">
            التشخيص مجاني. لا التزامات. القرار قرارك.
          </p>
        </div>
      </div>
    </section>
  );
}
