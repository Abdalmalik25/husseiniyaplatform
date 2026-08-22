import { useEffect, useState } from "react";

/**
 * ScrollProgress — a slim reading-progress bar pinned to the top of the
 * viewport. A signature touch of premium marketing sites (Stripe, Linear,
 * Vercel). GPU-accelerated via transform, zero layout shift.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, doc.scrollTop / max) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full origin-right bg-gradient-to-l from-brand via-gold to-emerald-400 shadow-[0_0_8px_rgba(184,121,69,0.5)] transition-transform duration-75 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}

/**
 * useRevealOnScroll — IntersectionObserver hook that returns a ref callback.
 * Elements get the `reveal` class and gain `revealed` when entering the
 * viewport. Respects prefers-reduced-motion.
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>() {
  const [el, setEl] = useState<T | null>(null);

  useEffect(() => {
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("revealed");
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el]);

  return setEl;
}

/**
 * Reveal — wrapper that fades/slides its children in on first viewport entry.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRevealOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
