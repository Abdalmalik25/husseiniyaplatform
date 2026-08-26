import React, { useEffect, useRef } from "react";

/**
 * HeroAurora — Interactive ambient light orbs for the marketing hero section.
 * 5 orbs with layered parallax depth. Follows mouse with spring physics.
 * Fully accessible: respects prefers-reduced-motion.
 * Marketing-only component — does not affect the internal system.
 */
export function HeroAurora({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Spring physics state
    let rx = 0,
      ry = 0,
      tx = 0,
      ty = 0;
    // PERFORMANCE BUDGET: the spring loop only runs while (a) the hero is on
    // screen AND (b) there is residual motion to settle. A permanently-running
    // rAF for a purely mouse-reactive effect wastes battery at idle.
    let raf = 0;
    let visible = true;

    const step = () => {
      raf = 0;
      if (!visible) return;

      // Exponential smoothing (spring feel)
      rx += (tx - rx) * 0.055;
      ry += (ty - ry) * 0.055;
      el.style.setProperty("--mx", `${rx.toFixed(2)}px`);
      el.style.setProperty("--my", `${ry.toFixed(2)}px`);

      // Settled? Stop the loop until the next mouse move wakes it up.
      const settled = Math.abs(tx - rx) < 0.05 && Math.abs(ty - ry) < 0.05;
      if (!settled) {
        raf = requestAnimationFrame(step);
      }
    };

    const wake = () => {
      if (!visible || raf) return;
      raf = requestAnimationFrame(step);
    };

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 44;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 44;
      wake();
    };

    // Pause entirely when the hero scrolls out of view.
    const io = new IntersectionObserver(
      entries => {
        visible = entries[0]?.isIntersecting ?? true;
        if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else if (visible) {
          wake();
        }
      },
      { threshold: 0 }
    );
    io.observe(el);

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`absolute inset-0 overflow-hidden pointer-events-none gpu ${className}`}
      style={{ ["--mx" as any]: "0px", ["--my" as any]: "0px" }}
    >
      {/* Orb 1 — Bronze primary (top-right, strong) */}
      <div
        className="absolute -top-40 -right-20 w-[42rem] h-[42rem] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(184,121,69,0.28) 0%, rgba(184,121,69,0) 70%)",
          transform: "translate(calc(var(--mx) * -1), calc(var(--my) * -0.8))",
          transition: "transform 0.12s ease-out",
        }}
      />

      {/* Orb 2 — Teal (left-center, medium) */}
      <div
        className="absolute top-1/3 -left-32 w-[36rem] h-[36rem] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(15,118,110,0.22) 0%, rgba(15,118,110,0) 70%)",
          transform: "translate(calc(var(--mx) * 0.7), calc(var(--my) * 0.6))",
          transition: "transform 0.16s ease-out",
        }}
      />

      {/* Orb 3 — Gold soft (bottom-center, ambient) */}
      <div
        className="absolute -bottom-20 left-1/3 w-[32rem] h-[32rem] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(212,165,116,0.16) 0%, rgba(212,165,116,0) 70%)",
          transform: "translate(calc(var(--my) * -0.5), calc(var(--mx) * 0.4))",
          transition: "transform 0.2s ease-out",
        }}
      />

      {/* Orb 4 — Deep ink blue (top-left, subtle) */}
      <div
        className="absolute -top-10 left-1/4 w-[28rem] h-[28rem] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(3,105,161,0.12) 0%, rgba(3,105,161,0) 70%)",
          transform: "translate(calc(var(--mx) * 0.3), calc(var(--my) * 0.4))",
          transition: "transform 0.24s ease-out",
        }}
      />

      {/* Orb 5 — Accent rose (center, very subtle shimmer) */}
      <div
        className="absolute top-1/2 right-1/4 w-[22rem] h-[22rem] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(184,121,69,0.1) 0%, rgba(184,121,69,0) 70%)",
          transform:
            "translate(calc(var(--mx) * -0.3), calc(var(--my) * -0.5))",
          transition: "transform 0.28s ease-out",
          animation: "float-slow 14s ease-in-out infinite 2s",
        }}
      />

      {/* Radial vignette — darkens edges for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, rgba(10,31,32,0.35) 100%)",
        }}
      />
    </div>
  );
}
