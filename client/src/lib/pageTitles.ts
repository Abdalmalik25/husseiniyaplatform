/**
 * خريطة عناوين كل صفحة — تُحدَّث document.title عند التنقل (تحسين SEO + UX):
 * الزائر يعرف أين هو، والألسنة التاريخية تصبح قابلة للقراءة والعودة إليها.
 *
 * العلامة الموحدة مأخوذة من نظام الهوية المركزي (brand.ts) — "الحسينية".
 */
import { brand } from "@/lib/brand";

/** العلامة الأساسية — العربية أولاً، متسقة مع brand.ts (وليس رومنة ثابتة). */
const BRAND = brand.names.arabic;

/** العنوان الافتراضي للصفحة الرئيسية — استعلام مباشر من أي مكان. */
export const DEFAULT_PAGE_TITLE = `${BRAND} — منصة الحوكمة والأعمال الموحدة`;

export const PAGE_TITLES: Record<string, string> = {
  // ── الصفحات العامة (الزائر) ──
  "/": DEFAULT_PAGE_TITLE,
  "/login": `تسجيل الدخول | ${BRAND}`,
  "/about": `التعريف بالخدمات | ${BRAND}`,
  "/portal": `بوابة تتبع الطلبات | ${BRAND}`,
  "/download": `تحميل تطبيق ${BRAND} | ${BRAND}`,
  "/pricing": `الأسعار والباقات | ${BRAND}`,
  "/contact": `تواصل معنا | ${BRAND}`,
  "/insights": `مركز المعرفة | ${BRAND}`,
  "/tools": `حاسبات ذكية | ${BRAND}`,
  "/solutions": `الحلول البرمجية | ${BRAND}`,
  "/governance": `حوكمة المشاريع | ${BRAND}`,
  "/integrate": `مركز التكامل | ${BRAND}`,

  // ── الصفحات التشغيلية (المشترك) ──
  "/app": `لوحة التحكم | ${BRAND}`,
  "/accounting": `النظام المحاسبي | ${BRAND}`,
  "/commercial": `العمليات التجارية | ${BRAND}`,
  "/reports": `التقارير المالية | ${BRAND}`,
  "/settings": `إعدادات المؤسسة | ${BRAND}`,
  "/erp": `نظام ${brand.names.erp} | ${BRAND}`,
  "/inventory": `إدارة المخزون | ${BRAND}`,
  "/store": `المتجر الإلكتروني | ${BRAND}`,
  "/security": `الأمان والصلاحيات | ${BRAND}`,
  "/procurement-workspace": `مساحة المشتريات | ${BRAND}`,
  "/supplier-analytics": `تحليل الموردين | ${BRAND}`,
  "/procurement": `المشتريات التنفيذية | ${BRAND}`,
  "/projects": `إدارة المشاريع | ${BRAND}`,
  "/hr": `الموارد البشرية | ${BRAND}`,
  "/support": `الدعم والجودة | ${BRAND}`,
  "/pos": `نقاط البيع | ${BRAND}`,
  "/permissions": `الصلاحيات | ${BRAND}`,
  "/basic-data": `البيانات الأساسية | ${BRAND}`,
  "/journal": `القيود المحاسبية | ${BRAND}`,
  "/manual-journal": `قيد يدوي ذكي | ${BRAND}`,
  "/customization": `التخصيص والحقول | ${BRAND}`,
  "/branches": `الفروع والصلاحيات | ${BRAND}`,
  "/audit": `سجل التدقيق | ${BRAND}`,
  "/requisitions": `طلبات التوريد | ${BRAND}`,
  "/operations": `لوحة العمليات | ${BRAND}`,
  "/analytics": `التحليلات الذكية | ${BRAND}`,
  "/billing": `الاشتراك والفوترة | ${BRAND}`,
  "/onboarding": `تهيئة المشترك | ${BRAND}`,
  "/cost-centers": `مراكز التكلفة | ${BRAND}`,
  "/zatca": `الفوترة الإلكترونية (ZATCA) | ${BRAND}`,
  "/beneficiaries": `السجل الموحد للعملاء والمستفيدين | ${BRAND}`,
  "/financial-statements": `القوائم المالية | ${BRAND}`,
  "/fiscal-periods": `الفترات المالية والإقفال | ${BRAND}`,

  // ── حالات الخطأ ──
  "/404": `الصفحة غير موجودة | ${BRAND}`,
};

/** المسارات الديناميكية الفرعية (مثل /commercial/invoice/create) — بادئة → عنوان. */
const DYNAMIC_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ["/commercial/invoice/", `إنشاء فاتورة | ${BRAND}`],
  ["/commercial/", `العمليات التجارية | ${BRAND}`],
  ["/erp/", `نظام ${brand.names.erp} | ${BRAND}`],
  ["/pos/", `نقاط البيع | ${BRAND}`],
];

export function resolvePageTitle(path: string): string {
  const normalized = normalizePath(path);
  const exact = PAGE_TITLES[normalized];
  if (exact) return exact;

  for (const [prefix, title] of DYNAMIC_PREFIXES) {
    if (normalized.startsWith(prefix)) return title;
  }

  // المسار المعروف يتكون من بادئة وجزء (مثل /accounting/...) — نوّع افتراضياً.
  const [root = ""] = normalized.split("/").filter(Boolean); // أول مقطع
  if (root && normalized.startsWith(`/${root}`) && normalized !== `/${root}`) {
    const base = PAGE_TITLES[`/${root}`];
    if (base) return base;
  }

  return DEFAULT_PAGE_TITLE;
}

/** المسار الأساسي المطلق للموقع — يُستعمل في Canonical وOpenGraph. */
export const SITE_URL = brand.contact.website;

/** الوصف الافتراضي — يظهر في نتائج البحث وعند مشاركة روابط الموقع. */
export const DEFAULT_META_DESCRIPTION =
  "منصة الحسينية الموحدة — نظام حسابات متقدم (Uamex_erp) بقيد مزدوج وقوائم مالية جاهزة للمراجع، استشارات هندسية ومؤسسية بمعايير COSO، إدارة مشاريع ومخزون، ومتجر إلكتروني — اخفض زمن الإغلاق من 14 يوماً إلى 4 ساعات.";

/** وصف لكل صفحة (SEO): وصف موجز غني بالكلمات المفتاحية العربية. */
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": DEFAULT_META_DESCRIPTION,
  "/login":
    "تسجيل الدخول إلى منصة الحسينية الموحدة — حسابات متقدمة، استشارات، ومقاولات في منصة واحدة آمنة وموثوقة.",
  "/about":
    "التعريف بمجموعة الحسينية — قصة المؤسسة ورسالتها وقيمها وخدماتها المتنوعة.",
  "/portal":
    "بوابة تتبع الطلبات والخدمات — متابعة طلباتكم الهندسية والاستشارية والتجارية في الوقت الفعلي بشفافية كاملة.",
  "/download":
    "تحميل تطبيق ALHUSAINIA وتطبيق الهاتف — اعمل أينما كنت مع مزامنة فورية وأداء عالٍ حتى دون اتصال.",
  "/pricing":
    "باقات وأسعار منصة الحسينية — أسعار تنافسية للباقات تبدأ من الأساسية وصولاً إلى الباقة الشاملة للمؤسسات.",
  "/contact":
    "تواصل معنا عبر واتساب والبريد والموقع — فريق الحسينية جاهز للإجابة على استفساراتك وتقديم الدعم الفوري.",
  "/insights":
    "مركز المعرفة والحسينية — مقالات ودورات وأدلة عملية في المحاسبة وإدارة الأعمال والتقنية والمقاولات.",
  "/tools":
    "حاسبات ذكية تفاعلية — احسب المقاولات والفواتير والرواتب وتحليل الاستثمار مباشرة عبر المتصفح.",
  "/solutions":
    "الحلول البرمجية لمنصة الحسينية — أنظمة جاهزة مرنة تناسب الجمعيات والمكاتب الهندسية وشركات المقاولات.",
  "/governance":
    "حوكمة المشاريع والإدارة — ضوابط الحوكمة الرشيدة لمتابعة المشاريع واتخاذ القرار بشفافية.",
  "/integrate":
    "مركز التكامل والربط — اربط منصة الحسينية بأدواتك المفضلة والمحاسبة والمدفوعات والرسائل بسهولة.",
  "/404":
    "الصفحة غير موجودة — الرابط الذي تبحث عنه غير متاح، توجه إلى الرئيسية للاستمرار.",
};

/** المسارات العامة (الزائر) — تُدار عليها Meta كاملة (Canonical + OpenGraph). */
const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  "/",
  "/login",
  "/about",
  "/portal",
  "/download",
  "/pricing",
  "/contact",
  "/insights",
  "/tools",
  "/solutions",
  "/governance",
  "/integrate",
  "/404",
]);

/** مواصفات الـ SEO لمسار محدد — عنوان + وصف + Canonical. */
export interface PageMeta {
  title: string;
  description: string;
  /** رابط مطلق للمسار — null للمسارات التشغيلية المحمية (لا تُشارَك خارجياً). */
  canonical: string | null;
}

/** يجرّد الاستعلام/المرساة من المسار (مثال: `/about?x=1#a` → `/about`). */
function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0];
  if (!clean) return "/";
  return clean;
}

export function resolvePageMeta(path: string): PageMeta {
  const normalized = normalizePath(path);
  const title = resolvePageTitle(normalized);
  const description = PAGE_DESCRIPTIONS[normalized] ?? DEFAULT_META_DESCRIPTION;
  const canonical = PUBLIC_ROUTES.has(normalized)
    ? normalized === "/"
      ? SITE_URL
      : `${SITE_URL}${normalized}`
    : null;
  return { title, description, canonical };
}
