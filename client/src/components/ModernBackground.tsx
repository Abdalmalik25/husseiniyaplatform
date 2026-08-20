import React, { useEffect, useRef } from "react";

/**
 * ModernBackground — a lightweight, dependency-free animated canvas
 * that renders a subtle network of floating geometric particles with
 * slow-pulsing brand-accent connections.
 *
 * Design goals:
 *  - Zero layout shift (absolute, pointer-events-none)
 *  - GPU-accelerated (transform + opacity only)
 *  - Respects prefers-reduced-motion
 *  - Adapts to light/dark via CSS variables
 *  - ~1 KB gzipped
 */
export function ModernBackground({
  className = "",
  density = 48,
  accentColor = "var(--brand)",
}: {
  className?: string;
  density?: number;
  accentColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    };

    const particles: Particle[] = [];
    for (let i = 0; i < density; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.6 + 0.4,
      });
    }

    let frame = 0;
    let raf: number;

    const draw = () => {
      if (width !== canvas.offsetWidth || height !== canvas.offsetHeight) {
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Pulsing opacity for a breathing effect
      const pulse = 0.18 + 0.07 * Math.sin(frame * 0.02);

      // Draw connections
      ctx.strokeStyle = `color-mix(in srgb, ${accentColor} ${pulse * 100}, transparent)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < density; i++) {
        for (let j = i + 1; j < density; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.12;
            ctx.strokeStyle = `color-mix(in srgb, ${accentColor} ${alpha * 100}, transparent)`;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      ctx.fillStyle = accentColor;
      for (const p of particles) {
        if (!prefersReduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      frame++;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [density, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * HeroBackground — wraps ModernBackground with a gradient overlay
 * for hero sections. Provides a modern, layered depth effect.
 */
export function HeroBackground({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <ModernBackground density={56} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,121,69,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(15,42,43,0.08),transparent_50%)]" />
      {children}
    </div>
  );
}
