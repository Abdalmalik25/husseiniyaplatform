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
  CalendarClock,
  Cpu,
  TrendingUp,
  TrendingDown,
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

/** Public marketing site navigation — خبير عالمي: الأقسام الرئيسية بارزة، الأدوات في قائمة */
export const MARKETING_NAV: NavItem[] = [
  {
    path: "/",
    label: "الرئيسية",
    icon: HomeIcon,
    description: "نظرة شاملة — من القيد إلى القرار",
  },
  {
    path: "/#uamex",
    label: "المنصة الموحدة",
    icon: Cpu,
    description: "Uamex_erp — مصدر حقيقة واحد بمعايير IFRS/COSO",
  },
  {
    path: "/#corporate",
    label: "الاستشارات المؤسسية",
    icon: Building2,
    description: "حوكمة بمعايير COSO — من التشخيص إلى القياس",
  },
  {
    path: "/#engineering",
    label: "الهندسة والمساحة",
    icon: Info,
    description: "تقدير NRM/POMI يُحتَج به أمام الممول",
  },
  {
    path: "/#library",
    label: "الخدمات المعرفية",
    icon: BookOpen,
    description: "SPSS v28 + APA 7th — من البحث إلى النشر",
  },
  {
    path: "/pricing",
    label: "الأسعار",
    icon: CreditCard,
    description: "باقات تنمو معك — 14 يوماً مجاناً بلا بطاقة",
  },
  {
    path: "/about",
    label: "من نحن",
    icon: Building2,
    description: "قصة الحسينية ورسالتها وخدماتها المؤسسية",
  },
  {
    path: "/contact",
    label: "تواصل",
    icon: Phone,
    description: "استشارة أولية مجانية خلال 24 ساعة",
  },
  // الأدوات — تُعرض في قائمة واحدة ذكية
  {
    path: "/tools",
    label: "حاسبات ذكية",
    icon: Calculator,
    description: "BOQ، رواتب، وفوترة — حاسبة فورية",
  },
  {
    path: "/insights",
    label: "مركز المعرفة",
    icon: BookOpen,
    description: "أدلة IFRS/COSO/PMBOK وتشخيصات عملية",
  },
];

/**
 * ────────────────────────────────────────────────────────────────────────
 * Domain-Driven Mega Clusters — حملة الترقية الدقيقة (2026-09)
 * ────────────────────────────────────────────────────────────────────────
 * كل عنقود يمثل مجال قيمة واضح — لا عشوائية، لا خلط بين تسويق وأدوات.
 * HeaderNavbar يستهلك هذه العناقيد مباشرة بدل البناء العشوائي من NAV_BY_PATH.
 */

// المنصة: الأعمدة الأربعة الحقيقية — كل عمود صفحة/مرساة واضحة
export const PLATFORM_CLUSTER: NavItem[] = [
  {
    path: "/#uamex",
    label: "Uamex_erp — المنصة الموحدة",
    icon: Cpu,
    highlight: true,
    description: "قيد مزدوج + تدقيق غير قابل للتعديل + صلاحيات COSO",
  },
  {
    path: "/#corporate",
    label: "الاستشارات المؤسسية",
    icon: Building2,
    description: "حوكمة COSO — تشخيص الانحراف وتصميم KPI",
  },
  {
    path: "/#engineering",
    label: "الهندسة والمساحة",
    icon: Gauge,
    description: "BOQ بـ NRM2/POMI بدقة ±5% — GPS/Drone بدقة ±2 سم",
  },
  {
    path: "/#library",
    label: "الخدمات المعرفية",
    icon: BookOpen,
    description: "SPSS v28 + APA 7th — من البحث إلى النشر",
  },
];

// الذكاء والتقارير: كل شاشة BI بطبقة خادم موثوقة — مصدر حقيقة واحد
export const INTELLIGENCE_CLUSTER: NavItem[] = [
  {
    path: "/reports",
    label: "التقارير الموحدة",
    icon: BarChart3,
    highlight: true,
    description:
      "ميزان مراجعة + دخل + ميزانية — حتى تاريخ محدد مع مقارنة فترات",
  },
  {
    path: "/financial-statements",
    label: "القوائم المالية (الخادم)",
    icon: Scale,
    description:
      "Trial Balance / Income / Balance Sheet / Cash Flow / AR-AP Aging",
  },
  {
    path: "/analytics",
    label: "التحليلات الذكية",
    icon: TrendingUp,
    description: "إيرادات/مصروفات/صافي ربح + اتجاهات شهرية + تقسيم فروع",
  },
  {
    path: "/supplier-analytics",
    label: "ذكاء الموردين",
    icon: Truck,
    description: "إنفاق شهري، التزامات مفتوحة، متوسط فاتورة، بطاقة أداء مورد",
  },
  {
    path: "/operations",
    label: "لوحة العمليات",
    icon: Gauge,
    description: "تنبيهات، نواقص، طلبات، قيود مجدولة، تقرير التسليم",
  },
  {
    path: "/inventory",
    label: "تقارير المخزون المتقدمة",
    icon: Boxes,
    description: "تقادم، دوران، ABC، مخزون ميت — داخل تبويب المخزون",
  },
];

// الأدوات المساعدة: حاسبات ومعرفة وتتبع — لا تلوث التنقل الرئيسي
export const TOOLS_CLUSTER: NavItem[] = [
  {
    path: "/tools",
    label: "حاسبات ذكية",
    icon: Calculator,
    description: "BOQ، رواتب، وفوترة — حاسبة فورية",
  },
  {
    path: "/insights",
    label: "مركز المعرفة",
    icon: BookOpen,
    description: "أدلة IFRS/COSO/PMBOK وتشخيصات عملية",
  },
  {
    path: "/portal",
    label: "تتبع طلبك",
    icon: Search,
    description: "تتبع حالة طلب بالكود",
  },
  {
    path: "/integrate",
    label: "مركز التكامل",
    icon: Globe2,
    description: "واجهات API و Webhooks",
  },
  {
    path: "/download",
    label: "تحميل التطبيق",
    icon: Download,
    description: "PWA + تعليمات التثبيت",
  },
];

/** Authenticated app shell navigation — rendered inside the sidebar. */
export const APP_NAV: NavItem[] = [
  { path: "/app", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/accounting", label: "المحاسبة", icon: Wallet, highlight: true },
  { path: "/commercial", label: "العمليات التجارية", icon: Package },
  { path: "/inventory", label: "المخزون", icon: Boxes },
  { path: "/store", label: "المتجر الإلكتروني", icon: ShoppingCart },
  {
    path: "/procurement-workspace",
    label: "Workspace المشتريات",
    icon: Truck,
    highlight: true,
  },
  {
    path: "/supplier-analytics",
    label: "تحليل الموردين",
    icon: BarChart3,
    highlight: true,
  },
  { path: "/procurement", label: "المشتريات التنفيذية", icon: Truck },
  { path: "/projects", label: "المشاريع", icon: FolderKanban },
  { path: "/hr", label: "الموارد البشرية", icon: Users },
  { path: "/support", label: "الدعم والجودة", icon: LifeBuoy },
  { path: "/pos", label: "نقاط البيع", icon: Receipt, highlight: true },
  { path: "/permissions", label: "الصلاحيات", icon: ShieldCheck },
  { path: "/basic-data", label: "البيانات الأساسية", icon: Boxes },
  { path: "/journal", label: "القيود المحاسبية", icon: BookOpen },
  { path: "/manual-journal", label: "قيد يدوي ذكي", icon: Scale },
  { path: "/cost-centers", label: "مراكز التكلفة", icon: Calculator },
  {
    path: "/financial-statements",
    label: "القوائم المالية",
    icon: BarChart3,
    highlight: true,
  },
  {
    path: "/fiscal-periods",
    label: "الفترات والإقفال",
    icon: CalendarClock,
    highlight: true,
  },
  { path: "/customization", label: "التخصيص والحقول", icon: SlidersHorizontal },
  { path: "/branches", label: "الفروع والصلاحيات", icon: Building2 },
  { path: "/security", label: "أمان الحساب", icon: ShieldCheck },
  { path: "/audit", label: "سجل التدقيق", icon: History },
  { path: "/requisitions", label: "طلبات التوريد", icon: ClipboardList },
  { path: "/beneficiaries", label: "السجل الموحد", icon: Users },
  { path: "/reports", label: "التقارير", icon: BarChart3 },
  { path: "/erp", label: "ERP", icon: LayoutGrid },
  { path: "/operations", label: "لوحة العمليات", icon: Gauge, highlight: true },
  {
    path: "/analytics",
    label: "التحليلات الذكية",
    icon: BarChart3,
    highlight: true,
  },
  {
    path: "/billing",
    label: "الاشتراك والفوترة",
    icon: CreditCard,
    highlight: true,
  },
  { path: "/zatca", label: "الفوترة الإلكترونية", icon: ShieldCheck },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

/**
 * ────────────────────────────────────────────────────────────────────────
 * نظام التشغيل — تقسيم مجالي صارم داخل التطبيق (Finance/Commerce/Ops/Intelligence/Governance)
 * كل مجموعة لها عنوان ووصف — تُعرض في AppSidebar كأقسام منفصلة، لا قائمة مسطحة عشوائية.
 * ────────────────────────────────────────────────────────────────────────
 */
export const APP_GROUPS: ReadonlyArray<{
  key: string;
  label: string;
  description: string;
  items: NavItem[];
}> = [
  {
    key: "finance",
    label: "المالية",
    description: "قيود، قوائم، إقفال",
    items: [
      { path: "/accounting", label: "المحاسبة", icon: Wallet, highlight: true },
      { path: "/journal", label: "القيود المحاسبية", icon: BookOpen },
      { path: "/manual-journal", label: "قيد يدوي ذكي", icon: Scale },
      { path: "/cost-centers", label: "مراكز التكلفة", icon: Calculator },
      {
        path: "/fiscal-periods",
        label: "الفترات والإقفال",
        icon: CalendarClock,
        highlight: true,
      },
      {
        path: "/financial-statements",
        label: "القوائم المالية",
        icon: BarChart3,
        highlight: true,
      },
    ],
  },
  {
    key: "commerce",
    label: "التجارة والمخزون",
    description: "بيع، شراء، مخازن",
    items: [
      { path: "/commercial", label: "العمليات التجارية", icon: Package },
      { path: "/pos", label: "نقاط البيع", icon: Receipt, highlight: true },
      { path: "/inventory", label: "المخزون", icon: Boxes },
      { path: "/store", label: "المتجر الإلكتروني", icon: ShoppingCart },
      {
        path: "/procurement-workspace",
        label: "Workspace المشتريات",
        icon: Truck,
        highlight: true,
      },
      { path: "/procurement", label: "المشتريات التنفيذية", icon: Truck },
      {
        path: "/supplier-analytics",
        label: "تحليل الموردين",
        icon: BarChart3,
        highlight: true,
      },
      { path: "/projects", label: "المشاريع", icon: FolderKanban },
    ],
  },
  {
    key: "ops",
    label: "التشغيل والموارد",
    description: "مهام، موظفون، جودة",
    items: [
      { path: "/app", label: "لوحة التحكم", icon: LayoutDashboard },
      { path: "/hr", label: "الموارد البشرية", icon: Users },
      { path: "/support", label: "الدعم والجودة", icon: LifeBuoy },
      { path: "/requisitions", label: "طلبات التوريد", icon: ClipboardList },
      { path: "/beneficiaries", label: "السجل الموحد", icon: Users },
      { path: "/basic-data", label: "البيانات الأساسية", icon: Boxes },
      {
        path: "/customization",
        label: "التخصيص والحقول",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    key: "intelligence",
    label: "الذكاء والتقارير",
    description: "مصدر حقيقة واحد",
    items: [
      {
        path: "/reports",
        label: "التقارير الموحدة",
        icon: BarChart3,
        highlight: true,
      },
      {
        path: "/analytics",
        label: "التحليلات الذكية",
        icon: BarChart3,
        highlight: true,
      },
      {
        path: "/operations",
        label: "لوحة العمليات",
        icon: Gauge,
        highlight: true,
      },
      { path: "/financial-statements", label: "القوائم المالية", icon: Scale },
      { path: "/supplier-analytics", label: "ذكاء الموردين", icon: Truck },
    ],
  },
  {
    key: "governance",
    label: "الحوكمة والأمان",
    description: "صلاحيات، تدقيق، فروع",
    items: [
      { path: "/audit", label: "سجل التدقيق", icon: History },
      { path: "/security", label: "أمان الحساب", icon: ShieldCheck },
      { path: "/permissions", label: "الصلاحيات", icon: ShieldCheck },
      { path: "/branches", label: "الفروع والصلاحيات", icon: Building2 },
      { path: "/erp", label: "ERP", icon: LayoutGrid },
      {
        path: "/billing",
        label: "الاشتراك والفوترة",
        icon: CreditCard,
        highlight: true,
      },
      { path: "/zatca", label: "الفوترة الإلكترونية", icon: ShieldCheck },
      { path: "/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

/**
 * Utility tools — intentionally excluded from primary navigation.
 * Surfaced via footer links, the store page, and settings instead.
 */
export const UTILITY_LINKS: NavItem[] = [
  { path: "/portal", label: "تتبع طلبك", icon: Search },
  { path: "/integrate", label: "مركز التكامل", icon: Globe2 },
  { path: "/download", label: "تحميل التطبيق", icon: Download },
  { path: "/onboarding", label: "تهيئة المشترك", icon: Settings },
];

/** @deprecated Legacy combined list — kept for backward compatibility. */
export const NAV_ITEMS: NavItem[] = [...MARKETING_NAV];
