import type { ComponentType } from "react";
import {
  ShoppingCart,
  BarChart3,
  Package,
  Download,
  Globe2,
  Info,
  Search,
  Home as HomeIcon,
  LayoutDashboard,
  Wallet,
  Users,
  Settings,
  CreditCard,
  Phone,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  highlight?: boolean;
}

/**
 * ────────────────────────────────────────────────────────────────────────
 * Navigation Architecture (Global SaaS B2B Standard)
 * ────────────────────────────────────────────────────────────────────────
 *
 * Layer 1 — MARKETING_NAV: public site header (5 items max, Hick's Law).
 * Layer 2 — APP_NAV: sidebar navigation inside the authenticated app shell.
 * Layer 3 — UTILITY_LINKS: helper tools, surfaced contextually (footer,
 *           store page, settings) — never in the primary navigation.
 */

/** Public marketing site navigation — shown to visitors in the top bar. */
export const MARKETING_NAV: NavItem[] = [
  { path: "/", label: "الرئيسية", icon: HomeIcon },
  { path: "/about", label: "خدماتنا", icon: Info },
  { path: "/pricing", label: "الأسعار", icon: CreditCard },
  { path: "/contact", label: "تواصل معنا", icon: Phone },
];

/** Authenticated app shell navigation — rendered inside the sidebar. */
export const APP_NAV: NavItem[] = [
  { path: "/app", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/accounting", label: "المحاسبة", icon: Wallet, highlight: true },
  { path: "/commercial", label: "العمليات التجارية", icon: Package },
  { path: "/store", label: "المتجر الإلكتروني", icon: ShoppingCart },
  { path: "/reports", label: "التقارير", icon: BarChart3 },
  { path: "/erp", label: "ERP", icon: Users },
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
