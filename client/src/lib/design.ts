/**
 * ALHUSAINIA — Modular Design System
 * ===================================
 * Central, typed source of truth for the platform's modular architecture.
 * Each business "module" (accounting, engineering, commercial, library,
 * analytics) carries a consistent visual identity so the whole product feels
 * coherent yet clearly differentiated — the hallmark of a world-class,
 * modular SaaS design language.
 */
import {
  Building2,
  HardHat,
  ShoppingCart,
  BookOpen,
  Sparkles,
  Users,
  FolderKanban,
  Truck,
  Headset,
  ShieldCheck,
  Receipt,
  Package,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "accounting"
  | "engineering"
  | "commercial"
  | "library"
  | "analytics"
  | "hr"
  | "projects"
  | "procurement"
  | "support"
  | "quality"
  | "pos"
  | "distribution";

export interface ModuleIdentity {
  key: ModuleKey;
  /** Arabic display name. */
  label: string;
  /** Short English key (used in URLs / analytics). */
  en: string;
  /** Primary accent (Tailwind-compatible hex). */
  accent: string;
  /** Light tint used for soft backgrounds/badges. */
  tint: string;
  /** Solid gradient pair for hero tiles. */
  gradient: string;
  /** Border class for active states. */
  border: string;
  icon: LucideIcon;
  /** One-line value proposition. */
  tagline: string;
  /** Optional roles allowed to see this module. Omit = visible to all. */
  roles?: string[];
}

export const MODULES: Record<ModuleKey, ModuleIdentity> = {
  accounting: {
    key: "accounting",
    label: "المحاسبة والمالية",
    en: "accounting",
    accent: "#0e2a2b",
    tint: "bg-[#0e2a2b]/5",
    gradient: "from-[#0e2a2b] via-[#16393b] to-[#1d474a]",
    border: "border-[#0e2a2b]",
    icon: Building2,
    tagline:
      "نظام محاسبي مرن يخدم جميع أنواع الأنشطة التجارية والصناعية والخدمية.",
  },
  engineering: {
    key: "engineering",
    label: "الهندسة والمقاولات",
    en: "engineering",
    accent: "#b87945",
    tint: "bg-[#b87945]/10",
    gradient: "from-[#b87945] via-[#c08e52] to-[#9a6334]",
    border: "border-[#b87945]",
    icon: HardHat,
    tagline:
      "إدارة المشاريع والتنفيذ للأنشطة الصناعية والخدمية والبنية التحتية.",
  },
  commercial: {
    key: "commercial",
    label: "المبيعات والمخزون",
    en: "commercial",
    accent: "#0f766e",
    tint: "bg-[#0f766e]/10",
    gradient: "from-[#0f766e] via-[#0d9488] to-[#115e59]",
    border: "border-[#0f766e]",
    icon: ShoppingCart,
    tagline:
      "إدارة الفواتير والمخزون لعملك سواء كان تجارياً أو خدمياً أو صناعياً.",
  },
  library: {
    key: "library",
    label: "المكتبة والصيانة",
    en: "library",
    accent: "#0369a1",
    tint: "bg-[#0369a1]/10",
    gradient: "from-[#0369a1] via-[#0284c7] to-[#075985]",
    border: "border-[#0369a1]",
    icon: BookOpen,
    tagline: "المعارف والصيانة للدعم المؤسسي لجميع الأنشطة.",
  },
  analytics: {
    key: "analytics",
    label: "التحليلات والذكاء",
    en: "analytics",
    accent: "#7c3aed",
    tint: "bg-[#7c3aed]/10",
    gradient: "from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9]",
    border: "border-[#7c3aed]",
    icon: Sparkles,
    tagline: "لوحة تحلل ذكية لأداء أي نشاط تجاري أو صناعي أو طبي.",
  },
  hr: {
    key: "hr",
    label: "الموارد البشرية",
    en: "hr",
    accent: "#0d9488",
    tint: "bg-[#0d9488]/10",
    gradient: "from-[#0d9488] via-[#14b8a6] to-[#0f766e]",
    border: "border-[#0d9488]",
    icon: Users,
    tagline: "إدارة الأقسام والموظفين والحضور والرواتب لجميع أنواع الأنشطة.",
  },
  projects: {
    key: "projects",
    label: "إدارة المشاريع",
    en: "projects",
    accent: "#ca8a04",
    tint: "bg-[#ca8a04]/10",
    gradient: "from-[#ca8a04] via-[#eab308] to-[#a16207]",
    border: "border-[#ca8a04]",
    icon: FolderKanban,
    tagline: "متابعة المشاريع والمهام عبر جميع أنواع الأنشطة التجارية.",
  },
  procurement: {
    key: "procurement",
    label: "المشتريات والاعتماد",
    en: "procurement",
    accent: "#b45309",
    tint: "bg-[#b45309]/10",
    gradient: "from-[#b45309] via-[#d97706] to-[#92400e]",
    border: "border-[#b45309]",
    icon: Truck,
    tagline: "سلاسل التوريد والشراء لأنشطة صناعية وطبية وخدمة.",
  },
  distribution: {
    key: "distribution",
    label: "التوزيع اللوجستي",
    en: "distribution",
    accent: "#dc2626",
    tint: "bg-[#dc2626]/10",
    gradient: "from-[#dc2626] via-[#f87171] to-[#ea5873]",
    border: "border-[#dc2626]",
    icon: Package,
    tagline: "التوزيع السريع بين الفروع والمخازن لجميع أنواع الأنشطة.",
  },
  support: {
    key: "support",
    label: "خدمة العملاء",
    en: "support",
    accent: "#2563eb",
    tint: "bg-[#2563eb]/10",
    gradient: "from-[#2563eb] via-[#3b82f6] to-[#1d4ed8]",
    border: "border-[#2563eb]",
    icon: Headset,
    tagline: "متابعة العملاء والدعم لجميع أنواع الأنشطة التجارية والخدمية.",
  },
  quality: {
    key: "quality",
    label: "الجودة والفحص",
    en: "quality",
    accent: "#16a34a",
    tint: "bg-[#16a34a]/10",
    gradient: "from-[#16a34a] via-[#22c55e] to-[#15803d]",
    border: "border-[#16a34a]",
    icon: ShieldCheck,
    tagline: "فحوصات الجودة والرقابة لجميع الأنشطة الصناعية والطبية والخدمية.",
  },
  pos: {
    key: "pos",
    label: "نقاط البيع",
    en: "pos",
    accent: "#b87945",
    tint: "bg-[#b87945]/10",
    gradient: "from-[#b87945] via-[#c08e52] to-[#9a6334]",
    border: "border-[#b87945]",
    icon: Receipt,
    tagline: "محطة بيع للأنشطة التجارية والخدمية والمطاعم.",
  },
};

export const MODULE_LIST: ModuleIdentity[] = Object.values(MODULES);

/**
 * Modules visible to a given role. Modules without `roles` are visible to
 * everyone. Admins/owners see every module.
 */
export function modulesForRole(role?: string | null): ModuleKey[] {
  if (!role || role === "admin" || role === "owner") {
    return MODULE_LIST.map(m => m.key);
  }
  return MODULE_LIST.filter(m => !m.roles || m.roles.includes(role)).map(
    m => m.key
  );
}

/** Greeting by local time of day — used in welcoming headers. */
export function greetingByHour(hour = new Date().getHours()): string {
  if (hour < 12) return "صباح الخير";
  if (hour < 18) return "مساء الخير";
  return "مساء الخير";
}

/** Format a money amount with thousands separators + currency code. */
export function formatMoney(
  value: number | string | null | undefined,
  currency = "YER"
): string {
  const n =
    typeof value === "number" ? value : parseFloat(String(value ?? "0")) || 0;
  return `${n.toLocaleString("en-US")} ${currency}`;
}
