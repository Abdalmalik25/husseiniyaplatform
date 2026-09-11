/**
 * screen-loader.tsx — هيكل تحميل موحد للشاشات
 */

import React from "react";
import { cn } from "@/lib/utils";

export function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse bg-muted/60 rounded", className)} style={style} />;
}

export function SkeletonText({ lines = 3, lastLineWidth = "60%", className }: { lines?: number; lastLineWidth?: string; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className="h-3" style={{ width: i === lines - 1 ? lastLineWidth : "100%" }} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return <SkeletonBlock className={cn("rounded-full", className)} style={{ width: size, height: size }} />;
}

export function SkeletonCard({ lines = 3, hasHeader = false, className }: { lines?: number; hasHeader?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
      {hasHeader && (
        <div className="flex items-center gap-3">
          <SkeletonAvatar size={36} className="shrink-0" />
          <div className="flex-1 space-y-1">
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-2 w-1/2" />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className="h-[10px]" style={{ width: i === 0 ? "100%" : i === 1 ? "80%" : "60%" }} />
      ))}
    </div>
  );
}

export function SkeletonKPI({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
      <SkeletonBlock className="h-2 w-1/3" />
      <SkeletonBlock className="h-7 w-2/3" />
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-2 w-1/4" />
        <SkeletonBlock className="h-2 w-1/6 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <div className="flex border-b border-border bg-muted/30 px-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 flex-1" style={{ width: i === cols - 1 ? "80px" : undefined }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex border-b border-border/50 px-4">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock key={c} className="h-8 flex-1" style={{ width: c === 0 ? "100px" : c === cols - 1 ? "90px" : undefined }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <SkeletonBlock className="h-4 w-1/3 mb-4" />
      <div className="flex items-end gap-2 h-40">
        {[60, 80, 45, 90, 70, 55, 85, 75, 65, 95].map((h, i) => (
          <SkeletonBlock key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonActivityFeed({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <SkeletonAvatar size={32} className="shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <SkeletonBlock className="h-3 w-3/4" />
            <SkeletonBlock className="h-2 w-1/2" />
          </div>
          <SkeletonBlock className="h-3 w-12 mt-1" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonHero({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={48} />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="h-3 w-32" />
        </div>
        <SkeletonBlock className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKPI key={i} />
        ))}
      </div>
    </div>
  );
}
