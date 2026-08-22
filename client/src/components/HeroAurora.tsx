import React, { useEffect, useRef } from "react";

export function HeroAurora({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rx = 0;
    let ry = 0;
    let tx = 0;
    let ty = 0;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      tx = cx * 36;
      ty = cy * 36;
    };

    let raf = 0;
    const loop = () => {
      rx += (tx - rx) * 0.06;
      ry += (ty - ry) * 0.06;
      el.style.setProperty("--mx", `${rx.toFixed(2)}px`);
      el.style.setProperty("--my", `${ry.toFixed(2)}px`);
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ ["--mx" as any]: "0px", ["--my" as any]: "0px" }}
    >
      <div
        className="absolute -top-32 -left-24 w-[34rem] h-[34rem] rounded-full bg-[#b87945]/25 blur-3xl transition-transform duration-200 ease-out"
        style={{ transform: "translate(var(--mx), var(--my))" }}
      />
      <div
        className="absolute top-1/4 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#0f766e]/25 blur-3xl transition-transform duration-200 ease-out"
        style={{ transform: "translate(calc(var(--mx) * -1), calc(var(--my) * -1))" }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-[26rem] h-[26rem] rounded-full bg-[#d4a574]/15 blur-3xl transition-transform duration-200 ease-out"
        style={{ transform: "translate(var(--my), calc(var(--mx) * -1))" }}
      />
    </div>
  );
}
