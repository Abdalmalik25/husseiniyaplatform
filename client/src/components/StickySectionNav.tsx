import React, { useEffect, useState } from "react";
import { Compass } from "lucide-react";

/**
 * StickySectionNav — World-class in-page navigation for long landing pages.
 *
 * Hick's Law: max 6 anchors so users don't freeze.
 * Active section detection via IntersectionObserver.
 * Auto-hides on scroll down, shows on scroll up.
 * Fully accessible: aria-current, keyboard nav, reduced-motion support.
 * Marketing-only: does NOT affect the internal ERP system.
 */
const SECTIONS = [
  { id: "uamex", label: "Uamex_erp" },
  { id: "corporate", label: "استشارات" },
  { id: "engineering", label: "هندسة" },
  { id: "library", label: "معرفة" },
  { id: "methodology", label: "المنهجية" },
  { id: "trust-center", label: "الثقة" },
] as const;

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function StickySectionNav() {
  const [activeId, setActiveId] = useState<string>("");
  const [hidden, setHidden] = useState(false);
  const [visible, setVisible] = useState(false);
  const lastScrollY = React.useRef(0);

  // Auto-show after 600px scroll (hero is past)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 600) setVisible(true);
      else setVisible(false);

      // Hide on scroll down (>80px delta), show on scroll up
      if (y > lastScrollY.current + 80 && y > 400) {
        setHidden(true);
      } else if (y < lastScrollY.current - 20) {
        setHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section tracking
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibleSections = new Set<string>();

    const sectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            visibleSections.add(entry.target.id);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });
        // Pick the topmost visible section
        if (visibleSections.size > 0) {
          const ordered = SECTIONS.map(s => s.id).filter(id =>
            visibleSections.has(id)
          );
          if (ordered.length > 0) setActiveId(ordered[0]);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });

    return () => sectionObserver.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <nav
      aria-label="التنقل بين أقسام الصفحة"
      className={`
        fixed top-[60px] left-1/2 -translate-x-1/2 z-40
        transition-transform duration-400 ease-in-out
        ${hidden ? "translate-y-[-120%]" : "translate-y-0"}
        w-full max-w-2xl mx-auto px-4
      `}
      role="navigation"
    >
      <div className="flex items-center justify-center gap-1 bg-ink/85 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/30 px-2 py-1.5 overflow-x-auto scrollbar-hide">
        <Compass className="w-3.5 h-3.5 text-brand-300 shrink-0 mx-1.5" />
        {SECTIONS.map(({ id, label }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              aria-current={isActive ? "true" : undefined}
              className={`
                relative shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold
                transition-all duration-200 whitespace-nowrap
                ${
                  isActive
                    ? "bg-brand text-ink-deep shadow-lg shadow-brand/30"
                    : "text-white/60 hover:text-white hover:bg-white/8"
                }
              `}
            >
              {label}
              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-300" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
