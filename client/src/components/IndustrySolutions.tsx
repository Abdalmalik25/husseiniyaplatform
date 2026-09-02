import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  HardHat,
  Package,
  Briefcase,
  Factory,
  HeartHandshake,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { brand } from "@/lib/brand";
import { whatsappLink } from "@/lib/brand";

/**
 * IndustrySolutions — World-class sector-specific value proposition section.
 *
 * Inspired by: Odoo's industry pages, SAP's industry solutions, Defatrah
 * (Dafater) sector showcases.
 *
 * Design principles:
 * - Each sector has its own accent color and storytelling arc.
 * - Tabbed interface lets visitors navigate sectors without losing context.
 * - Three concrete outcomes per sector (not adjectives).
 * - Capabilities list shows depth without overwhelming.
 * - Direct WhatsApp CTA per sector with pre-filled message.
 *
 * Marketing-only component — does not affect the internal ERP system.
 */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat,
  Package,
  Briefcase,
  Factory,
  HeartHandshake,
  GraduationCap,
};

export function IndustrySolutions() {
  const { title, subtitle, sectors } = brand.industrySolutions;
  const [activeIdx, setActiveIdx] = useState(0);
  const active = sectors[activeIdx];
  const Icon = ICON_MAP[active.icon] || HardHat;

  return (
    <section
      id="industries"
      className="py-20 px-4 bg-gradient-to-b from-background via-muted/20 to-background border-y border-border/50 scroll-mt-20"
      aria-labelledby="industries-title"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-12 reveal">
          <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
            حلول قطاعية
          </Badge>
          <h2
            id="industries-title"
            className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Sector Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 reveal">
          {sectors.map((sector, i) => {
            const SectorIcon = ICON_MAP[sector.icon] || HardHat;
            const isActive = i === activeIdx;
            return (
              <button
                key={sector.key}
                onClick={() => setActiveIdx(i)}
                aria-pressed={isActive}
                aria-label={`قطاع ${sector.name}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                  isActive
                    ? "text-white border-transparent shadow-lg scale-105"
                    : "bg-card text-muted-foreground border-border hover:border-brand/30 hover:text-foreground"
                }`}
                style={isActive ? { background: sector.accent } : {}}
              >
                <SectorIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{sector.name}</span>
                <span className="sm:hidden">{sector.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Active Sector Detail */}
        <div
          key={active.key}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
        >
          {/* Headline + Outcomes */}
          <div className="lg:col-span-3 surface rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            <div
              className="absolute -top-12 -left-12 w-48 h-48 rounded-full opacity-10 blur-3xl"
              style={{ background: active.accent }}
              aria-hidden
            />
            <div className="relative">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4"
                style={{
                  background: `${active.accent}15`,
                  color: active.accent,
                  border: `1px solid ${active.accent}40`,
                }}
              >
                <Icon className="w-3 h-3" />
                {active.name}
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-foreground leading-tight mb-6">
                {active.headline}
              </h3>

              {/* Outcomes grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {active.outcomes.map((o, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 text-center border"
                    style={{
                      background: `${active.accent}08`,
                      borderColor: `${active.accent}30`,
                    }}
                  >
                    <div
                      className="text-xl sm:text-2xl font-black font-mono tracking-tight"
                      style={{ color: active.accent }}
                    >
                      {o.metric}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">
                      {o.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Capabilities */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  قدرات مصمّمة لهذا القطاع
                </p>
                {active.capabilities.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-foreground/85"
                  >
                    <CheckCircle2
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: active.accent }}
                    />
                    <span className="leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA card */}
          <div
            className="lg:col-span-2 rounded-3xl p-8 text-white flex flex-col justify-between relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${active.accent}, ${active.accent}cc)`,
            }}
          >
            <div
              className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-20 blur-2xl"
              style={{ background: "#ffffff" }}
              aria-hidden
            />
            <div className="relative">
              <Icon className="w-10 h-10 mb-4 opacity-90" />
              <h3 className="font-black text-xl mb-2">ابدأ قطاعك اليوم</h3>
              <p className="text-sm opacity-85 leading-relaxed">
                احجز استشارة مجانية مع خبير يفهم تحديات قطاعك فعلاً — بدون عرض
                تسويقي عام.
              </p>
            </div>
            <div className="relative mt-6 space-y-2.5">
              <a
                href={whatsappLink(
                  `السلام عليكم، أود الاستفسار عن حل ${active.name} في الحسينية.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-ink font-black py-3 rounded-xl text-sm transition-all hover:-translate-y-0.5 shadow-lg"
                style={{ color: active.accent }}
              >
                تحدث إلى خبير {active.name}
                <ArrowRight className="w-4 h-4 rotate-180" />
              </a>
              <button
                onClick={() => (window.location.hash = "uamex")}
                className="w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-medium py-3 rounded-xl text-sm transition-all border border-white/20"
              >
                جرّب Uamex_erp مجاناً
              </button>
            </div>
          </div>
        </div>

        {/* Reassurance line */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          كل الحلول مبنية على Uamex_erp — نفس المنصة، نفس الأمان، نفس الضوابط
          المؤسسية.
        </p>
      </div>
    </section>
  );
}
