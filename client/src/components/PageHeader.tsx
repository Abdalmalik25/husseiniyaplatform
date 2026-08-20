import React from "react";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

/**
 * PageHeader — the canonical, branded hero used at the top of every primary
 * page. Enforces a consistent rhythm (eyebrow → title → subtitle → actions)
 * across the entire product, which is what makes a modular UI feel "global
 * standard" rather than ad-hoc.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "brand-gradient text-white rounded-3xl px-5 sm:px-7 py-6 sm:py-7 shadow-lg relative overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 brand-dotgrid opacity-10" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          {eyebrow && (
            <Badge className="bg-[#1e3a3c] border border-[#b87945]/50 text-[#d4a574] font-bold text-[10px] px-2.5 py-1">
              {eyebrow}
            </Badge>
          )}
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-balance flex items-center gap-2">
            {Icon && <Icon className="w-6 h-6 text-[#d4a574]" />}
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-pretty">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
