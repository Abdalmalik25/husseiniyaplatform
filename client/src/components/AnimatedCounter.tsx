import React, { useEffect, useRef, useState } from "react";

function parseStat(v: string) {
  const m = v.match(/^([^\d-]*)([-+]?[\d.,]+)(.*)$/);
  if (!m) return { prefix: "", num: 0, suffix: "", decimals: 0 };
  const prefix = m[1];
  const raw = m[2];
  const suffix = m[3];
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  const num = parseFloat(raw.replace(/,/g, ""));
  return { prefix, num, suffix, decimals };
}

export function AnimatedCounter({
  value,
  className = "",
  duration = 1500,
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const { prefix, num, suffix, decimals } = parseStat(value);
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(num * eased);
            if (p < 1) requestAnimationFrame(tick);
            else setDisplay(num);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [num, duration]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
