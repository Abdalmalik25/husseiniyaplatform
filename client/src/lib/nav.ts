import type { ComponentType } from "react";
import {
  ShoppingCart,
  BarChart3,
  Package,
  Boxes,
  Download,
  Globe2,
  Info,
  Search,
  Home as HomeIcon,
  LayoutDashboard,
  LayoutGrid,
  Gauge,
  Wallet,
  Users,
  Settings,
  CreditCard,
  Phone,
  Truck,
  FolderKanban,
  LifeBuoy,
  Receipt,
  ShieldCheck,
  BookOpen,
  Scale,
  SlidersHorizontal,
  Building2,
  History,
  ClipboardList,
  Calculator,
  Cpu,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  highlight?: boolean;
  /** سطر وصفي يظهر تحت العنصر في القوائم المنسدلة ودرج الجوال. */
  description?: string;
}

/**
 * ────────────────────────────────────────────────────────────────────────
 * Navigation Architecture (Global SaaS B2B Standard)
 * ────────────────────────────────────────────────────────────────────────
 *
 * Layer 1 — MARKETING_NAV: public site header (Hick's Law compliant).
 * Layer 2 — APP_NAV: sidebar navigation inside the authenticated app shell.
 * Layer 3 — UTILITY_LINKS: helper tools, surfaced contextually (footer,
 *           store page, settings) — never in the primary navigation.
 */

/** Public marketing site navigation — shown to visitors in the top bar. */
export const MARKETING_NAV: NavItem[] = [
  { path: "/", label: "الرئيسية", icon: HomeIcon, description: "نظرة شاملة على المنصة والخدمات" },
  { path: "/solutions", label: "الحلول البرمجية", icon: Cpu, description: "أنظمة محاسبية وتجارية جاهزة للعمل فوراً" },
  { path: "/#engineering", label: "الخدمات الهندسية", icon: Info, description: "رفع مساحي، جداول BOQ، وحلول المقاولات" },
  { path: "/insights", label: "مركز المعرفة", icon: BookOpen, description: "مقالات وأدلة عملية ودورات متخصصة" },
  { path: "/tools", label: "حاسبات ذكية", icon: Calculator, description: "حسابات مقاولات وفواتير ورواتب فورية" },
  { path: "/pricing", label: "الأسعار", icon: CreditCard, description: "باقات مرنة تنمو مع مؤسستك" },
  { path: "/contact", label: "تواصل", icon: Phone, description: "فريق الدعم جاهز للإجابة خلال دقائق" },
];


/** Authenticated app shell navigation — rendered inside the sidebar. */
export const APP_NAV: NavItem[] = [
  { path: "/app", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/accounting", label: "المحاسبة", icon: Wallet, highlight: true },
  { path: "/commercial", label: "العمليات التجارية", icon: Package },
  { path: "/inventory", label: "المخزون", icon: Boxes },
  { path: "/store", label: "المتجر الإلكتروني", icon: ShoppingCart },
  { path: "/procurement-workspace", label: "Workspace المشتريات", icon: Truck, highlight: true },
  { path: "/supplier-analytics", label: "تحليل الموردين", icon: BarChart3, highlight: true },
  { path: "/procurement", label: "المشتريات التنفيذية", icon: Truck },
  { path: "/projects", label: "المشاريع", icon: FolderKanban },
  { path: "/hr", label: "الموارد البشرية", icon: Users },
  { path: "/support", label: "الدعم والجودة", icon: LifeBuoy },
  { path: "/pos", label: "نقاط البيع", icon: Receipt, highlight: true },
  { path: "/permissions", label: "الصلاحيات", icon: ShieldCheck },
  { path: "/basic-data", label: "البيانات الأساسية", icon: Boxes },
  { path: "/journal", label: "القيود المحاسبية", icon: BookOpen },
  { path: "/manual-journal", label: "قيد يدوي ذكي", icon: Scale },
  { path: "/customization", label: "التخصيص والحقول", icon: SlidersHorizontal },
  { path: "/branches", label: "الفروع والصلاحيات", icon: Building2 },
  { path: "/audit", label: "سجل التدقيق", icon: History },
  { path: "/requisitions", label: "طلبات التوريد", icon: ClipboardList },
  { path: "/reports", label: "التقارير", icon: BarChart3 },
  { path: "/erp", label: "ERP", icon: LayoutGrid },
  { path: "/operations", label: "لوحة العمليات", icon: Gauge, highlight: true },
  {
    path: "/analytics",
    label: "التحليلات الذكية",
    icon: BarChart3,
    highlight: true,
  },
  { path: "/billing", label: "الاشتراك والفوترة", icon: CreditCard, highlight: true },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

/**
 * Utility tools — intentionally excluded from primary navigation.
 * Surfaced via footer links, the store page, and settings instead.
 */
export const UTILITY_LINKS: NavItem[] = [
  { path: "/portal", label: "تتبع طلبك", icon: Search },
  { path: "/integrate", label: "مركز التكامل", icon: Globe2 },
  { path: "/download", label: "تحميل التطبيق", icon: Download },
];

/** @deprecated Legacy combined list — kept for backward compatibility. */
export const NAV_ITEMS: NavItem[] = [...MARKETING_NAV];
