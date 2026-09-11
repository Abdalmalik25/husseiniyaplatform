import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/design";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { AlertTriangle, Package, TrendingUp, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  value: number;
  quantity: number;
  category: string;
}

interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  suggestedOrder: number;
}

interface InventoryIntelligenceProps {
  products?: Product[];
  lowStock?: LowStockItem[];
}

const defaultProducts: Product[] = [
  {
    id: "1",
    name: " helium tanks",
    value: 45200,
    quantity: 120,
    category: "إسطوانات",
  },
  {
    id: "2",
    name: "LED Decorations",
    value: 32800,
    quantity: 85,
    category: "ديكور",
  },
  {
    id: "3",
    name: "Sound Systems",
    value: 28500,
    quantity: 15,
    category: "صوتيات",
  },
  {
    id: "4",
    name: "Fabric Rolls",
    value: 21000,
    quantity: 200,
    category: "أقمشة",
  },
  {
    id: "5",
    name: "Lighting Rigs",
    value: 18700,
    quantity: 30,
    category: "إضاءة",
  },
];

const defaultLowStock: LowStockItem[] = [
  {
    id: "1",
    name: " helium tanks",
    currentStock: 5,
    reorderPoint: 20,
    suggestedOrder: 50,
  },
  {
    id: "2",
    name: "LED Decorations",
    currentStock: 12,
    reorderPoint: 15,
    suggestedOrder: 40,
  },
  {
    id: "3",
    name: "Fabric Rolls",
    currentStock: 8,
    reorderPoint: 25,
    suggestedOrder: 100,
  },
];

const categoryData = [
  { name: "إسطوانات", value: 35, color: "#10b981" },
  { name: "ديكور", value: 25, color: "#8b5cf6" },
  { name: "صوتيات", value: 15, color: "#f59e0b" },
  { name: "أقمشة", value: 15, color: "#06b6d4" },
  { name: "إضاءة", value: 10, color: "#f43f5e" },
];

export default function InventoryIntelligence({
  products = defaultProducts,
  lowStock = defaultLowStock,
}: InventoryIntelligenceProps) {
  const maxValue = Math.max(...products.map(p => p.value));

  return (
    <Card className="bg-card border-border" dir="rtl">
      <CardHeader>
        <CardTitle className="text-foreground font-bold text-lg">
          الذكاء المخزني
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Low Stock Alerts */}
        {lowStock.length > 0 && (
          <div className="rounded-lg bg-warning/10 border border-warning/25 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning">
                تنبيه: {lowStock.length} منتجات تحت نقطة إعادة الطلب
              </span>
            </div>
            <div className="space-y-2">
              {lowStock.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded bg-card/50 p-2 text-sm"
                >
                  <span className="text-foreground font-medium">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-destructive">
                      المخزون: {item.currentStock}
                    </span>
                    <span className="text-muted-foreground">
                      الحد الأدنى: {item.reorderPoint}
                    </span>
                    <Badge className="bg-info/15 text-info border-info/25 text-[10px]">
                      <ShoppingCart className="ml-0.5 h-3 w-3" />
                      اقتراح طلب: {item.suggestedOrder}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Products by Value */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            أعلى 5 منتجات بالقيمة
          </h4>
          <div className="space-y-3">
            {products.slice(0, 5).map(product => {
              const widthPercent = (product.value / maxValue) * 100;
              return (
                <div key={product.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">
                      {product.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {product.quantity} وحدة
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatMoney(product.value)}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-5 bg-muted/50 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-success to-success rounded transition-all duration-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Distribution Pie Chart */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            توزيع الفئات
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
                formatter={value => [`${Number(value ?? 0)}%`, "النسبة"]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={value => (
                  <span className="text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
