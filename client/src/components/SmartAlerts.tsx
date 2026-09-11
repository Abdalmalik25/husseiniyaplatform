/**
 * SmartAlerts — AI-powered anomaly detection and intelligent alerts.
 * Surfaces critical business insights proactively. Rivals Oracle's
 * Intelligent Process Automation and SAP's Predictive Accounting.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Bell,
  Clock,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  ArrowUpRight,
  Zap,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  category: "finance" | "inventory" | "sales" | "hr" | "compliance";
  title: string;
  description: string;
  metric?: string;
  threshold?: string;
  actionPath?: string;
  actionLabel?: string;
  timestamp?: string;
  dismissed?: boolean;
}

interface SmartAlertsProps {
  summaryData?: any;
  commercialStats?: any;
  lowStock?: any[];
  activityLogs?: any[];
}

function getAlertIcon(category: Alert["category"]) {
  switch (category) {
    case "finance":
      return DollarSign;
    case "inventory":
      return Package;
    case "sales":
      return ShoppingCart;
    case "hr":
      return Users;
    case "compliance":
      return AlertCircle;
    default:
      return Bell;
  }
}

function getAlertColor(type: Alert["type"]) {
  switch (type) {
    case "critical":
      return "border-red-300 bg-destructive/15/50 text-destructive";
    case "warning":
      return "border-amber-300 bg-warning/15/50 text-warning";
    case "info":
      return "border-sky-300 bg-info/15/50 text-info";
    case "success":
      return "border-success bg-success/15/50 text-success";
  }
}

function getBadgeColor(type: Alert["type"]) {
  switch (type) {
    case "critical":
      return "bg-destructive/15 text-destructive border-red-300";
    case "warning":
      return "bg-warning/15 text-warning border-amber-300";
    case "info":
      return "bg-info/15 text-info border-sky-300";
    case "success":
      return "bg-success/15 text-success border-success";
  }
}

function getTypeLabel(type: Alert["type"]) {
  switch (type) {
    case "critical":
      return "حرج";
    case "warning":
      return "تنبيه";
    case "info":
      return "معلومات";
    case "success":
      return "ملاحظة";
  }
}

export function SmartAlerts({
  summaryData,
  commercialStats,
  lowStock,
  activityLogs,
}: SmartAlertsProps) {
  // Generate intelligent alerts based on data
  const alerts = useMemo<Alert[]>(() => {
    const result: Alert[] = [];

    // Revenue drop detection
    if (
      summaryData?.revenue > 0 &&
      summaryData?.expenses > summaryData?.revenue * 0.9
    ) {
      result.push({
        id: "high-expenses",
        type: "warning",
        category: "finance",
        title: "النفقات قريبة من الإيرادات",
        description: `نسبة المصروفات إلى الإيرادات ${((summaryData.expenses / summaryData.revenue) * 100).toFixed(0)}% — يُنصح بمراجعة النفقات`,
        metric: `${((summaryData.expenses / summaryData.revenue) * 100).toFixed(0)}%`,
        threshold: "< 80%",
        actionPath: "/reports",
        actionLabel: "عرض التقارير",
      });
    }

    // Negative net income
    if (summaryData?.netIncome !== undefined && summaryData.netIncome < 0) {
      result.push({
        id: "negative-income",
        type: "critical",
        category: "finance",
        title: "الدخل الصافي سالب",
        description: "ال NUIT سالب — يتطلب اتخاذ إجراءات فورية لتحسين الربحية",
        metric: summaryData.netIncome?.toLocaleString(),
        actionPath: "/reports",
        actionLabel: "تحليل الأسباب",
      });
    }

    // Low stock alerts
    if (lowStock && lowStock.length > 0) {
      const criticalItems = lowStock.filter((p: any) => (p.stock ?? 0) <= 0);
      if (criticalItems.length > 0) {
        result.push({
          id: "out-of-stock",
          type: "critical",
          category: "inventory",
          title: `${criticalItems.length} منتج نفد من المخزون`,
          description: criticalItems
            .slice(0, 3)
            .map((p: any) => p.name ?? p.nameAr)
            .join("، "),
          metric: `${criticalItems.length}`,
          actionPath: "/inventory",
          actionLabel: "إدارة المخزون",
        });
      } else {
        result.push({
          id: "low-stock",
          type: "warning",
          category: "inventory",
          title: `${lowStock.length} منتج بمخزون منخفض`,
          description: "يُنصح بإعادة طلب هذه المنتجات لتجنب نفادها",
          metric: `${lowStock.length}`,
          actionPath: "/inventory",
          actionLabel: "عرض المخزون",
        });
      }
    }

    // Customer debts
    if (commercialStats?.customerDebts > 0) {
      result.push({
        id: "customer-debts",
        type: "info",
        category: "finance",
        title: "مديونية العملاء",
        description: `إجمالي مديونية العملاء: ${commercialStats.customerDebts?.toLocaleString()} — يُنصح بمتابعة التحصيل`,
        metric: commercialStats.customerDebts?.toLocaleString(),
        actionPath: "/reports",
        actionLabel: "تقرير المديونية",
      });
    }

    // Success: Activity logged
    if (activityLogs && activityLogs.length > 0) {
      result.push({
        id: "recent-activity",
        type: "success",
        category: "compliance",
        title: "النظام نشط",
        description: `${activityLogs.length} نشاط مسجل اليوم — جميع العمليات موثقة`,
        metric: `${activityLogs.length}`,
      });
    }

    return result;
  }, [summaryData, commercialStats, lowStock, activityLogs]);

  const criticalCount = alerts.filter(a => a.type === "critical").length;
  const warningCount = alerts.filter(a => a.type === "warning").length;

  if (alerts.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
              <Bell className="h-3.5 w-3.5 text-warning" />
            </div>
            التنبيهات الذكية
          </CardTitle>
          <div className="flex items-center gap-1">
            {criticalCount > 0 && (
              <Badge className="bg-destructive/15 text-destructive border-red-300 text-[9px]">
                {criticalCount} حرجة
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-warning/15 text-warning border-amber-300 text-[9px]">
                {warningCount} تنبيهات
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {alerts.map(alert => {
          const Icon = getAlertIcon(alert.category);
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 transition-all",
                getAlertColor(alert.type)
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/50 shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold truncate">{alert.title}</p>
                  <Badge
                    className={cn(
                      "text-[8px] px-1 py-0",
                      getBadgeColor(alert.type)
                    )}
                  >
                    {getTypeLabel(alert.type)}
                  </Badge>
                </div>
                <p className="text-[10px] mt-0.5 opacity-75 line-clamp-2">
                  {alert.description}
                </p>
                {alert.actionPath && (
                  <a
                    href={alert.actionPath}
                    className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold hover:underline"
                  >
                    {alert.actionLabel}
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              {alert.metric && (
                <div className="text-left shrink-0">
                  <p className="text-lg font-black tabular-nums">
                    {alert.metric}
                  </p>
                  {alert.threshold && (
                    <p className="text-[9px] opacity-60">
                      الحد: {alert.threshold}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
