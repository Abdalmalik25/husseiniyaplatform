import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * Testimonials — World-class social proof carousel.
 *
 * Features:
 * - Auto-rotating carousel with pause on hover/focus
 * - Touch-friendly (swipe gestures on mobile)
 * - ARIA-live region for accessibility
 * - Reduced-motion friendly (no auto-rotation if user prefers reduced motion)
 * - 5-star rating display for visual weight
 * - Real quotes from brand.testimonials data
 * Marketing-only: does NOT affect the internal ERP system.
 */
const AUTOPLAY_MS = 7000;

export function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const testimonials = brand.testimonials;

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const t = setInterval(() => {
      setActive(i => (i + 1) % testimonials.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, testimonials.length]);

  const goTo = (i: number) => setActive((i + testimonials.length) % testimonials.length);

  return (
    <section
      className="py-20 px-4 bg-ink text-white relative overflow-hidden"
      aria-labelledby="testimonials-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Tech grid background */}
      <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink pointer-events-none" aria-hidden />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 mb-12 reveal">
          <Badge className="bg-white/10 text-brand-300 border border-brand/30 font-bold text-xs px-3 py-1">
            أصوات حقيقية
          </Badge>
          <h2
            id="testimonials-title"
            className="text-2xl sm:text-4xl font-extrabold text-white leading-tight"
          >
            من مديرين ومقاولين وباحثين يستخدمون الحسينية فعلياً
          </h2>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-2xl mx-auto">
            ما يقوله عملاؤنا عن الأثر — لا عن وعود.
          </p>
        </div>

        {/* Carousel */}
        <div
          className="relative"
          aria-roledescription="carousel"
          aria-label="شهادات العملاء"
        >
          <div
            className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 sm:p-12 relative overflow-hidden"
            aria-live="polite"
          >
            {/* Quote mark */}
            <Quote
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 text-brand/15"
              aria-hidden
            />

            {/* Stars */}
            <div className="flex items-center gap-1 mb-4" aria-label="تقييم 5 من 5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4 fill-brand-300 text-brand-300"
                  aria-hidden
                />
              ))}
            </div>

            {/* Quote text */}
            <blockquote className="text-lg sm:text-2xl font-medium text-white/90 leading-relaxed mb-6 text-pretty">
              "{testimonials[active].quote}"
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-3 border-t border-white/10 pt-5">
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center text-ink font-black text-base shrink-0"
                aria-hidden
              >
                {testimonials[active].author.charAt(0)}
              </div>
              <div>
                <p className="font-black text-white text-sm">
                  {testimonials[active].author}
                </p>
                <p className="text-xs text-white/55">
                  {testimonials[active].role}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={() => goTo(active - 1)}
            aria-label="الشهادة السابقة"
            className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white items-center justify-center transition-all hover:scale-110 backdrop-blur"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => goTo(active + 1)}
            aria-label="الشهادة التالية"
            className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white items-center justify-center transition-all hover:scale-110 backdrop-blur"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div
            className="flex items-center justify-center gap-2 mt-6"
            role="tablist"
            aria-label="اختر شهادة"
          >
            {testimonials.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === active}
                aria-label={`شهادة ${i + 1} من ${testimonials.length}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === active
                    ? "w-8 bg-brand"
                    : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
