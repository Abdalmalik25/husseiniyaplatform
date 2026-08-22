import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "negative" | "info" | "warning";

const toneChip: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-emerald-100 text-emerald-700",
  negative: "bg-rose-100 text-rose-700",
  info: "bg-sky-100 text-sky-700",
  warning: "bg-amber-100 text-amber-700",
};

/** Reusable KPI / metric card — the atomic unit of every dashboard. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: { dir: "up" | "down"; value: string };
  className?: string;
}) {
  return (
    <Card
      className={cn("surface p-4 rounded-2xl overflow-hidden", className ?? "")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
          <p className="text-xl font-black mt-1.5 tabular-nums tracking-tight text-foreground truncate">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-xl shrink-0", toneChip[tone])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        {hint && (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        )}
        {trend && (
          <span
            className={cn(
              "text-[10px] font-bold flex items-center gap-0.5",
              trend.dir === "up" ? "text-emerald-600" : "text-rose-600"
            )}
          >
            {trend.dir === "up" ? "▲" : "▼"} {trend.value}
          </span>
        )}
      </div>
    </Card>
  );
}
