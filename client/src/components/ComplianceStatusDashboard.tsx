import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  FileCheck,
  Database,
  Lock,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface ComplianceItem {
  id: string;
  label: string;
  percentage: number;
  status: "active" | "warning" | "inactive";
  lastCheck: string;
  icon: typeof ShieldCheck;
}

const complianceItems: ComplianceItem[] = [
  {
    id: "zatca",
    label: "تكامل زاتكا",
    percentage: 92,
    status: "active",
    lastCheck: "2024-03-15 14:30",
    icon: ShieldCheck,
  },
  {
    id: "ifrs",
    label: "امتثال IFRS",
    percentage: 78,
    status: "warning",
    lastCheck: "2024-03-14 09:15",
    icon: FileCheck,
  },
  {
    id: "backup",
    label: "نسخ احتياطي للبيانات",
    percentage: 95,
    status: "active",
    lastCheck: "2024-03-15 03:00",
    icon: Database,
  },
  {
    id: "security",
    label: "التدقيق الأمني",
    percentage: 45,
    status: "inactive",
    lastCheck: "2024-02-28 11:00",
    icon: Lock,
  },
];

function getStatusColor(percentage: number) {
  if (percentage >= 80)
    return {
      bar: "bg-success",
      badge: "bg-success/15 text-success border-success/25",
      icon: CheckCircle,
    };
  if (percentage >= 50)
    return {
      bar: "bg-warning",
      badge: "bg-warning/15 text-warning border-warning/25",
      icon: AlertTriangle,
    };
  return {
    bar: "bg-destructive",
    badge: "bg-destructive/15 text-destructive border-destructive/25",
    icon: XCircle,
  };
}

const statusLabels: Record<string, string> = {
  active: "نشط",
  warning: "تحذير",
  inactive: "غير نشط",
};

export default function ComplianceStatusDashboard() {
  return (
    <Card className="bg-card border-border" dir="rtl">
      <CardHeader>
        <CardTitle className="text-foreground font-bold text-lg">
          حالة الامتثال
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {complianceItems.map(item => {
          const colors = getStatusColor(item.percentage);
          const StatusIcon = colors.icon;
          const ItemIcon = item.icon;

          return (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-muted p-1.5">
                    <ItemIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0", colors.badge)}
                  >
                    <StatusIcon className="ml-0.5 h-3 w-3" />
                    {statusLabels[item.status]}
                  </Badge>
                  <span className="text-sm font-bold text-foreground w-12 text-left">
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    colors.bar
                  )}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                آخر فحص: {item.lastCheck}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
