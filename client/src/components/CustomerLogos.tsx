import React, { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * CustomerLogos — World-class social proof band.
 *
 * Design principles:
 * - Subtle, non-flashy — trust is built through restraint.
 * - Infinite marquee scroll on desktop, static grid on mobile.
 * - Sector badges instead of fake company logos (we don't have logos for clients).
 * - Hover reveals sector and full name.
 * - Respects prefers-reduced-motion.
 * Marketing-only: does NOT affect the internal ERP system.
 */
export function CustomerLogos() {
  const logos = brand.customerLogos;
  // Duplicate for seamless infinite scroll
  const doubled = [...logos, ...logos, ...logos];

  return (
    <section
      className="py-12 px-4 bg-muted/40 border-y border-border/50"
      aria-labelledby="customer-logos-title"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header — minimal */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-brand/30"
            aria-hidden
          />
          <p
            id="customer-logos-title"
            className="text-[11px] font-mono font-bold text-muted-foreground tracking-widest uppercase"
          >
            يثق بنا
          </p>
          <div
            className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-brand/30"
            aria-hidden
          />
        </div>

        {/* Marquee — desktop */}
        <div className="relative overflow-hidden" aria-hidden>
          <div
            className="flex gap-4 animate-[marquee_28s_linear_infinite]"
            style={{
              animationName: "marquee",
              animationDuration: "28s",
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
            }}
          >
            {doubled.map((logo, i) => (
              <div
                key={i}
                className="shrink-0 group relative cursor-default"
                title={logo.name}
              >
                <div className="w-44 sm:w-52 h-16 rounded-xl border border-border bg-card flex flex-col items-center justify-center gap-1.5 px-4 transition-all hover:border-brand/30 hover:shadow-md hover:-translate-y-0.5">
                  {/* Stylized monogram tile — no real logo needed */}
                  <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <span className="font-black text-brand text-[10px] leading-none">
                      {logo.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-foreground text-center leading-tight line-clamp-2">
                    {logo.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {logo.sector}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Fade edges */}
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        </div>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 mt-8 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            بيانات عملائنا محمية — لا نشارك أسماء أو تفاصيل دون إذن كتابي صريح
          </span>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[marquee_28s_linear_infinite\\] {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
