/**
 * ProfessionalKPI — Executive-grade KPI cards with sparklines, trend arrows,
 * percentage changes, and live pulse indicators. Rivals SAP Analytics Cloud,
 * Oracle Analytics, and Power BI dashboard cards.
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparklinePoint {
  value: number;
  label?: string;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number; // percentage change
  trendLabel?: string;
  sparkline?: SparklinePoint[];
  tone?: "positive" | "negative" | "neutral" | "warning" | "info";
  pulse?: boolean;
  className?: string;
  onClick?: () => void;
}

function MiniSparkline({
  data,
  color,
}: {
  data: SparklinePoint[];
  color: string;
}) {
  if (!data.length) return null;
  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient
          id={`grad-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#grad-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={((values.length - 1) / (values.length - 1)) * w}
        cy={h - ((values[values.length - 1] - min) / range) * h}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}

function TrendBadge({ trend, label }: { trend: number; label?: string }) {
  const isPositive = trend > 0;
  const isNeutral = trend === 0;
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <Badge
      className={cn(
        "text-[10px] font-bold gap-0.5 px-1.5 py-0",
        isPositive && "bg-success/10 text-success border-success/25",
        !isPositive &&
          !isNeutral &&
          "bg-destructive/10 text-destructive border-destructive/25",
        isNeutral && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(trend).toFixed(1)}%
      {label && <span className="mr-0.5 opacity-60">{label}</span>}
    </Badge>
  );
}

export function ProfessionalKPI({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  sparkline,
  tone = "neutral",
  pulse,
  className,
  onClick,
}: KpiCardProps) {
  const toneColors = useMemo(
    () => ({
      positive: "text-success",
      negative: "text-destructive",
      neutral: "text-foreground",
      warning: "text-warning",
      info: "text-info",
    }),
    []
  );

  const sparkColor = useMemo(() => {
    if (trend === undefined) return "#6366f1";
    return trend >= 0 ? "#10b981" : "#f43f5e";
  }, [trend]);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/50 bg-card transition-all duration-200",
        "hover:shadow-lg hover:shadow-ink/5 hover:border-border hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Pulse indicator */}
      {pulse && (
        <div className="absolute top-3 left-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p
              className={cn(
                "text-2xl font-black mt-1 tabular-nums tracking-tight",
                toneColors[tone]
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            {sparkline && <MiniSparkline data={sparkline} color={sparkColor} />}
          </div>
        </div>

        {(trend !== undefined || trendLabel) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
            {trend !== undefined && (
              <TrendBadge trend={trend} label={trendLabel} />
            )}
            {trendLabel && trend === undefined && (
              <span className="text-[10px] text-muted-foreground">
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
