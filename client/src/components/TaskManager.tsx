import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  assignee: string;
  dueDate: string;
  column: "todo" | "in_progress" | "review" | "done";
}

interface TaskManagerProps {
  tasks?: Task[];
}

const defaultTasks: Task[] = [
  {
    id: "1",
    title: "إعداد تقرير المبيعات الشهري",
    priority: "high",
    assignee: "أحمد",
    dueDate: "2024-03-20",
    column: "todo",
  },
  {
    id: "2",
    title: "مراجعة الفواتير المعلقة",
    priority: "high",
    assignee: "سارة",
    dueDate: "2024-03-18",
    column: "todo",
  },
  {
    id: "3",
    title: "تحديث أسعار المنتجات",
    priority: "medium",
    assignee: "محمد",
    dueDate: "2024-03-22",
    column: "todo",
  },
  {
    id: "4",
    title: "إعداد عرض سعر للعميل الجديد",
    priority: "high",
    assignee: "خالد",
    dueDate: "2024-03-17",
    column: "in_progress",
  },
  {
    id: "5",
    title: "تدريب الفريق على النظام الجديد",
    priority: "medium",
    assignee: "نورة",
    dueDate: "2024-03-25",
    column: "in_progress",
  },
  {
    id: "6",
    title: "مراجعة ميزانية الربع الأول",
    priority: "high",
    assignee: "أحمد",
    dueDate: "2024-03-19",
    column: "review",
  },
  {
    id: "7",
    title: "إعداد تقرير الضرائب",
    priority: "medium",
    assignee: "سارة",
    dueDate: "2024-03-21",
    column: "review",
  },
  {
    id: "8",
    title: "إتمام عملية الشراء #45",
    priority: "low",
    assignee: "محمد",
    dueDate: "2024-03-15",
    column: "done",
  },
  {
    id: "9",
    title: "تحديث بيانات العملاء",
    priority: "low",
    assignee: "نورة",
    dueDate: "2024-03-14",
    column: "done",
  },
];

const columns = [
  {
    id: "todo",
    label: "للتنفيذ",
    icon: Circle,
    color: "text-muted-foreground",
    bg: "bg-muted/30",
  },
  {
    id: "in_progress",
    label: "قيد التنفيذ",
    icon: Loader2,
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    id: "review",
    label: "قيد المراجعة",
    icon: AlertCircle,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    id: "done",
    label: "مكتمل",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
  },
] as const;

const priorityConfig: Record<
  Task["priority"],
  { label: string; className: string }
> = {
  high: {
    label: "عالية",
    className: "bg-destructive/15 text-destructive border-destructive/25",
  },
  medium: {
    label: "متوسطة",
    className: "bg-warning/15 text-warning border-warning/25",
  },
  low: {
    label: "منخفضة",
    className: "bg-success/15 text-success border-success/25",
  },
};

export default function TaskManager({
  tasks = defaultTasks,
}: TaskManagerProps) {
  return (
    <Card className="bg-card border-border" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground font-bold text-lg">
          إدارة المهام
        </CardTitle>
        <Badge className="bg-muted text-muted-foreground border-border">
          {tasks.length} مهمة
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => {
            const columnTasks = tasks.filter(t => t.column === col.id);
            const ColIcon = col.icon;

            return (
              <div key={col.id} className="space-y-2">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg p-2",
                    col.bg
                  )}
                >
                  <ColIcon className={cn("h-4 w-4", col.color)} />
                  <span className="text-sm font-medium text-foreground">
                    {col.label}
                  </span>
                  <Badge
                    variant="outline"
                    className="mr-auto text-[10px] px-1.5 py-0 bg-card"
                  >
                    {columnTasks.length}
                  </Badge>
                </div>

                <div className="space-y-2 min-h-[120px]">
                  {columnTasks.map(task => {
                    const priority = priorityConfig[task.priority];

                    return (
                      <div
                        key={task.id}
                        className="rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors cursor-grab"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <GripVertical className="h-3.5 w-3.5 opacity-40" />
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              priority.className
                            )}
                          >
                            {priority.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground mb-2 leading-snug">
                          {task.title}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignee}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.dueDate}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-border text-muted-foreground text-xs">
                      لا توجد مهام
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
