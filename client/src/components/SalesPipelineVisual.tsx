import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/design";
import { ArrowLeft, TrendingUp, Users } from "lucide-react";

interface SalesPipelineStage {
  name: string;
  count: number;
  value: number;
}

interface SalesPipelineVisualProps {
  stages?: SalesPipelineStage[];
}

const defaultStages: SalesPipelineStage[] = [
  { name: "leads", count: 120, value: 850000 },
  { name: "qualified", count: 65, value: 620000 },
  { name: "proposal", count: 30, value: 450000 },
  { name: "negotiation", count: 12, value: 280000 },
  { name: "closed_won", count: 8, value: 195000 },
];

const stageLabels: Record<string, string> = {
  leads: " العملاء المحتملون",
  qualified: "المؤهلون",
  proposal: "العروض",
  negotiation: "التفاوض",
  closed_won: "المبرمة",
};

const stageColors: Record<string, string> = {
  leads: "bg-info",
  qualified: "bg-brand",
  proposal: "bg-warning",
  negotiation: "bg-warning",
  closed_won: "bg-success",
};

export default function SalesPipelineVisual({
  stages = defaultStages,
}: SalesPipelineVisualProps) {
  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <Card className="bg-card border-border" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground font-bold text-lg">
          أنبوب المبيعات
        </CardTitle>
        <Badge className="bg-info/15 text-info border-info/25">
          <Users className="ml-1 h-3 w-3" />
          {stages.reduce((sum, s) => sum + s.count, 0)} عميل
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => {
          const widthPercent = (stage.count / maxCount) * 100;
          const conversionRate =
            index > 0
              ? ((stage.count / stages[index - 1].count) * 100).toFixed(1)
              : null;

          return (
            <div key={stage.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {stageLabels[stage.name] || stage.name}
                  </span>
                  {conversionRate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" />
                      {conversionRate}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {stage.count} عميل
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatMoney(stage.value)}
                  </span>
                </div>
              </div>
              <div className="relative h-8 bg-muted/50 rounded-md overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-md transition-all duration-500",
                    stageColors[stage.name]
                  )}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              {index < stages.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground/50 rotate-180" />
                </div>
              )}
            </div>
          );
        })}

        {/* Summary */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 mt-4">
          <span className="text-sm text-muted-foreground">
            إجمالي قيمة الأنبوب
          </span>
          <span className="text-lg font-bold text-foreground">
            {formatMoney(stages.reduce((sum, s) => sum + s.value, 0))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
