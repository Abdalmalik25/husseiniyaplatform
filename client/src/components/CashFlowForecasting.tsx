import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/design";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface CashFlowForecastingProps {
  inflows?: number;
  outflows?: number;
  currentBalance?: number;
}

const projectionData = [
  { month: "يناير", actual: 125000, projected: null },
  { month: "فبراير", actual: 98000, projected: null },
  { month: "مارس", actual: 142000, projected: null },
  { month: "أبريل", actual: null, projected: 135000 },
  { month: "مايو", actual: null, projected: 158000 },
  { month: "يونيو", actual: null, projected: 172000 },
];

const inflowOutflowData = [
  { month: "يناير", inflow: 180000, outflow: 55000 },
  { month: "فبراير", inflow: 155000, outflow: 57000 },
  { month: "مارس", inflow: 195000, outflow: 53000 },
  { month: "أبريل", inflow: 185000, outflow: 50000 },
  { month: "مايو", inflow: 210000, outflow: 52000 },
  { month: "يونيو", inflow: 225000, outflow: 53000 },
];

export default function CashFlowForecasting({
  inflows = 195000,
  outflows = 53000,
  currentBalance = 342000,
}: CashFlowForecastingProps) {
  const netCashFlow = inflows - outflows;

  return (
    <Card className="bg-card border-border" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground font-bold text-lg">
          التنبؤ بالتدفق النقدي
        </CardTitle>
        <Badge className="bg-success/15 text-success border-success/25">
          نشط
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cash Position Indicators */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-1">
              <Wallet className="h-4 w-4" />
              الرصيد الحالي
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatMoney(currentBalance)}
            </p>
          </div>
          <div className="rounded-lg bg-success/10 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-success text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              الإيرادات
            </div>
            <p className="text-xl font-bold text-success">
              {formatMoney(inflows)}
            </p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-destructive text-sm mb-1">
              <TrendingDown className="h-4 w-4" />
              المصروفات
            </div>
            <p className="text-xl font-bold text-destructive">
              {formatMoney(outflows)}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 p-2 text-center">
          <span className="text-muted-foreground text-sm">
            صافي التدفق النقدي:{" "}
          </span>
          <span
            className={cn(
              "font-bold",
              netCashFlow >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {formatMoney(netCashFlow)}
          </span>
        </div>

        {/* Actual vs Projected Area Chart */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            التدفق الفعلي مقابل المتوقع
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.15}
                name="الفعلي"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="projected"
                stroke="#38bdf8"
                fill="#38bdf8"
                fillOpacity={0.1}
                strokeDasharray="6 3"
                name="المتوقع"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inflow vs Outflow Bars */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            الإيرادات والمصروفات الشهرية
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={inflowOutflowData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="inflow"
                fill="#10b981"
                name="الإيرادات"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="outflow"
                fill="#f43f5e"
                name="المصروفات"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
