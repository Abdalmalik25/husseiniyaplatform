import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check, Info, ArrowDown, ArrowUp, Scale, Target } from "lucide-react";

interface CostMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface CostMethod {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  pros: string;
  cons: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}

const COST_METHODS: CostMethod[] = [
  {
    id: "fifo",
    name: "FIFO",
    nameAr: "الدخل أولاً صادر أولاً",
    description: "المنتجات المشتراة أولاً تُباع أولاً",
    pros: "يعكس التدفق الطبيعي للمخزون",
    cons: "قد لا يعكس التكلفة الحقيقية في حالة ارتفاع الأسعار",
    icon: ArrowDown,
    recommended: true,
  },
  {
    id: "lifo",
    name: "LIFO",
    nameAr: "الدخل последний صادر أولاً",
    description: "المنتجات المشتراة أخيراً تُباع أولاً",
    pros: "يقرن الإيرادات بالتكاليف الأحدث",
    cons: "غير مقبول محاسبياً في بعض الدول",
    icon: ArrowUp,
  },
  {
    id: "weighted_average",
    name: "Weighted Average",
    nameAr: "متوسط الأوزان",
    description: "حساب متوسط تكلفة كل الوحدات",
    pros: "بسيط وسهل التطبيق",
    cons: "قد لا يعكس التغيرات السعرية بدقة",
    icon: Scale,
  },
  {
    id: "specific",
    name: "Specific Identification",
    nameAr: "تحديد هوية كل منتج",
    description: "تتبع كل منتج بشكل مفرد",
    pros: "أدق طريقة لحساب التكلفة",
    cons: "صعب التطبيق مع كميات كبيرة",
    icon: Target,
  },
];

export function CostMethodSelector({
  value,
  onChange,
  disabled = false,
}: CostMethodSelectorProps) {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center gap-2">
        <Info className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          اختر طريقة حساب تكلفة المخزون
        </span>
      </div>

      <div
        className="space-y-3"
        role="radiogroup"
        aria-label="طريقة حساب التكلفة"
      >
        {COST_METHODS.map(method => {
          const Icon = method.icon;
          const isSelected = value === method.id;

          return (
            <label
              key={method.id}
              className={cn(
                "relative flex items-start gap-4 rounded-xl border p-4 transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-card hover:bg-muted/50 hover:border-border/80",
                disabled && "opacity-50 cursor-not-allowed",
                !disabled && "cursor-pointer"
              )}
            >
              <input
                type="radio"
                name="cost-method"
                value={method.id}
                checked={isSelected}
                onChange={() => onChange(method.id)}
                disabled={disabled}
                className="sr-only"
              />
              <div
                className={cn(
                  "mt-1 size-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}
              >
                {isSelected && (
                  <div className="size-2 rounded-full bg-primary-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={cn(
                      "size-4",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {method.nameAr}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {method.name}
                  </Badge>
                  {method.recommended && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                      مُوصى بها
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {method.description}
                </p>
                <div className="flex flex-col sm:flex-row sm:gap-4 gap-1">
                  <div className="flex items-center gap-1.5">
                    <Check className="size-3 text-success" />
                    <span className="text-xs text-success">{method.pros}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Info className="size-3 text-warning" />
                    <span className="text-xs text-warning">{method.cons}</span>
                  </div>
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-3 left-3">
                  <div className="size-2 rounded-full bg-primary" />
                </div>
              )}
            </label>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-2">
          <span className="text-xs font-semibold text-foreground">
            مقارنة سريعة
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-right text-muted-foreground font-medium">
                  المعيار
                </th>
                <th className="px-3 py-2 text-center text-muted-foreground font-medium">
                  FIFO
                </th>
                <th className="px-3 py-2 text-center text-muted-foreground font-medium">
                  LIFO
                </th>
                <th className="px-3 py-2 text-center text-muted-foreground font-medium">
                  المتوسط
                </th>
                <th className="px-3 py-2 text-center text-muted-foreground font-medium">
                  التحديد
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 text-foreground">السهولة</td>
                <td className="px-3 py-2 text-center text-success">★★★</td>
                <td className="px-3 py-2 text-center text-warning">★★☆</td>
                <td className="px-3 py-2 text-center text-success">★★★</td>
                <td className="px-3 py-2 text-center text-destructive">★☆☆</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 text-foreground">الدقة</td>
                <td className="px-3 py-2 text-center text-warning">★★☆</td>
                <td className="px-3 py-2 text-center text-warning">★★☆</td>
                <td className="px-3 py-2 text-center text-warning">★★☆</td>
                <td className="px-3 py-2 text-center text-success">★★★</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-foreground">ال︽وم</td>
                <td className="px-3 py-2 text-center text-success">نعم</td>
                <td className="px-3 py-2 text-center text-destructive">
                  محدود
                </td>
                <td className="px-3 py-2 text-center text-success">نعم</td>
                <td className="px-3 py-2 text-center text-success">نعم</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
