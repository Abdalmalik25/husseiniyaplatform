import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Award } from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * MilestonesTimeline — Journey/History section showing credibility through time.
 *
 * Inspired by: About pages of enterprise software companies, Odoo timeline,
 * SAP milestones.
 *
 * Design principles:
 * - Alternating left/right timeline on desktop, vertical on mobile.
 * - Year markers prominent for quick scanning.
 * - Each milestone has a concrete outcome (not vague statements).
 * - Connecting line for visual continuity.
 * - Final milestone highlights "now" status.
 *
 * Marketing-only component.
 */

export function MilestonesTimeline() {
  const { title, subtitle, items } = brand.milestones;

  return (
    <section
      id="milestones"
      className="py-20 px-4 bg-gradient-to-b from-sand to-white dark:from-background dark:to-card scroll-mt-20"
      aria-labelledby="milestones-title"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-16 reveal">
          <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
            <Calendar className="w-3 h-3 ml-1" />
            رحلتنا
          </Badge>
          <h2
            id="milestones-title"
            className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line — desktop: center, mobile: right */}
          <div
            className="absolute hidden md:block right-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-brand/60 via-brand/40 to-brand/20"
            aria-hidden
          />
          {/* Mobile line */}
          <div
            className="absolute md:hidden right-6 top-0 bottom-0 w-px bg-gradient-to-b from-brand/60 via-brand/40 to-brand/20"
            aria-hidden
          />

          <div className="space-y-8">
            {items.map((item, i) => {
              const isRight = i % 2 === 0;
              const isLast = i === items.length - 1;

              return (
                <div
                  key={item.year}
                  className={`relative reveal ${
                    isRight ? "md:pr-[calc(50%+2rem)]" : "md:pl-[calc(50%+2rem)]"
                  }`}
                  data-reveal-delay={i * 80}
                >
                  {/* Year marker — dot */}
                  <div
                    className={`absolute top-6 z-10 ${
                      isRight
                        ? "md:right-[calc(50%-0.5rem)] left-auto"
                        : "md:left-[calc(50%-0.5rem)] right-6"
                    } right-6`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] text-ink shadow-lg border-2 border-white ${
                        isLast
                          ? "bg-brand scale-110"
                          : "bg-brand/80"
                      }`}
                    >
                      {item.year.charAt(0)}
                    </div>
                  </div>

                  {/* Content card */}
                  <div
                    className={`ml-12 md:ml-0 ${
                      isRight ? "md:mr-0" : "md:ml-0"
                    }`}
                  >
                    <div
                      className={`surface rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ${
                        isLast
                          ? "border-brand/40 ring-2 ring-brand/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span
                          className={`font-mono font-black text-lg ${
                            isLast ? "text-brand" : "text-brand/70"
                          }`}
                        >
                          {item.year}
                        </span>
                        {isLast && (
                          <span className="inline-flex items-center gap-1 bg-brand/15 text-brand text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Award className="w-3 h-3" />
                            الآن
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-foreground text-sm mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}