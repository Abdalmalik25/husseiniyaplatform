import type { ComponentType } from "react";
import {
  Building2,
  ShoppingCart,
  BarChart3,
  Package,
  Download,
  Globe2,
  Info,
  Search,
  Home as HomeIcon,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  highlight?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "الرئيسية والتسويق", icon: HomeIcon },
  { path: "/app", label: "مساحات العمل والأنظمة", icon: Building2, highlight: true },
  { path: "/about", label: "التعريف بالخدمات", icon: Info },
  { path: "/portal", label: "بوابة التتبع", icon: Search },
  { path: "/store", label: "المتجر الإلكتروني", icon: ShoppingCart },
  { path: "/commercial", label: "العمليات التجارية", icon: Package },
  { path: "/reports", label: "التقارير المالية", icon: BarChart3 },
  { path: "/integrate", label: "مركز التكامل", icon: Globe2 },
  { path: "/download", label: "تحميل التطبيق", icon: Download },
];
