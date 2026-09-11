import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from "lucide-react";

interface ExpertEvaluationProps {
  entityType: "invoice" | "voucher" | "product" | "settings" | "role";
  entityId?: number;
  scores?: {
    compliance: number;
    accuracy: number;
    completeness: number;
    efficiency: number;
    risk: number;
  };
  recommendations?: string[];
  onAccept?: () => void;
  onReject?: () => void;
  compact?: boolean;
}

const DIMENSION_LABELS: Record<string, string> = {
  compliance: "الامتثال",
  accuracy: "الدقة",
  completeness: "الاكتمال",
  efficiency: "الكفاءة",
  risk: "المخاطر",
};

const DIMENSION_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  compliance: ShieldCheck,
  accuracy: CheckCircle2,
  completeness: Sparkles,
  efficiency: TrendingUp,
  risk: AlertTriangle,
};

const DEFAULT_SCORES = {
  compliance: 92,
  accuracy: 88,
  completeness: 76,
  efficiency: 85,
  risk: 35,
};

function getGrade(overall: number): {
  grade: string;
  color: string;
  label: string;
} {
  if (overall >= 90)
    return {
      grade: "A",
      color: "text-success bg-success/15 border-success/25",
      label: "ممتاز",
    };
  if (overall >= 75)
    return {
      grade: "B",
      color: "text-info bg-info/15 border-info/25",
      label: "جيد جداً",
    };
  if (overall >= 60)
    return {
      grade: "C",
      color: "text-warning bg-warning/15 border-warning/25",
      label: "جيد",
    };
  if (overall >= 40)
    return {
      grade: "D",
      color: "text-warning bg-warning/15 border-warning/25",
      label: "مقبول",
    };
  return {
    grade: "F",
    color: "text-destructive bg-destructive/15 border-destructive/25",
    label: "ضعيف",
  };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

function CircularProgress({
  value,
  size = 64,
  strokeWidth = 5,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn(
          "transition-all duration-700 ease-out",
          getScoreColor(value)
        )}
      />
    </svg>
  );
}

export function ExpertEvaluation({
  entityType,
  entityId,
  scores = DEFAULT_SCORES,
  recommendations = [
    "يُنصح بمراجعة الأرقام قبل الإرسال",
    "تأكد من ارفاق جميع المستندات المطلوبة",
    "التحقق من صلاحيات المستخدم الحالي",
  ],
  onAccept,
  onReject,
  compact = false,
}: ExpertEvaluationProps) {
  const dimensions = Object.entries(scores);
  const validScores = dimensions
    .filter(([k]) => k !== "risk")
    .map(([, v]) => v);
  const overall = Math.round(
    validScores.reduce((a, b) => a + b, 0) / validScores.length
  );
  const { grade, color, label } = getGrade(overall);

  if (compact) {
    return (
      <div
        dir="rtl"
        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
      >
        <div className="relative">
          <CircularProgress value={overall} size={48} strokeWidth={4} />
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center text-xs font-bold",
              getScoreColor(overall)
            )}
          >
            {overall}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              تقييم الفريق эксперт
            </span>
            <Badge className={cn("text-[10px] px-1.5 py-0 border", color)}>
              {grade}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {recommendations.length} توصية
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-5 text-warning" />
              تقييم الفريق эксперт
            </CardTitle>
            <Badge
              className={cn("text-sm px-2.5 py-1 border font-bold", color)}
            >
              {grade} — {label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Score Circles */}
          <div className="grid grid-cols-5 gap-3">
            {dimensions.map(([key, value]) => {
              const Icon = DIMENSION_ICONS[key] || Star;
              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <CircularProgress
                      value={key === "risk" ? 100 - value : value}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                      {value}
                    </span>
                  </div>
                  <div className="text-center">
                    <Icon
                      className={cn(
                        "size-4 mx-auto mb-1",
                        getScoreColor(key === "risk" ? 100 - value : value)
                      )}
                    />
                    <span className="text-xs text-muted-foreground leading-tight block">
                      {DIMENSION_LABELS[key]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Score Bar */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                النتيجة الإجمالية
              </span>
              <span className={cn("text-lg font-bold", getScoreColor(overall))}>
                {overall}/100
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  getScoreColor(overall).replace("text-", "bg-")
                )}
                style={{ width: `${overall}%` }}
              />
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                التوصيات
              </h4>
              <ul className="space-y-1.5">
                {recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    {rec.includes("يُنصح") ? (
                      <AlertTriangle className="size-4 mt-0.5 shrink-0 text-warning" />
                    ) : rec.includes("تأكد") ? (
                      <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-success" />
                    ) : (
                      <Minus className="size-4 mt-0.5 shrink-0 text-info" />
                    )}
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {onReject && (
              <Button variant="outline" className="flex-1" onClick={onReject}>
                <XCircle className="size-4" />
                رفض
              </Button>
            )}
            {onAccept && (
              <Button className="flex-1" onClick={onAccept}>
                <CheckCircle2 className="size-4" />
                قبول التقييم
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
