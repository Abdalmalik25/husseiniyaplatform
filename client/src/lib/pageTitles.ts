/**
 * خريطة عناوين كل صفحة — تُحدَّث document.title عند التنقل (تحسين SEO + UX):
 * الزائر يعرف أين هو، والألسنة التاريخية تصبح قابلة للقراءة والعودة إليها.
 */

const BRAND = "منصة الحسينية | مؤسسة الحسينية لخدمات الأعمال";

export const PAGE_TITLES: Record<string, string> = {
  // ── الصفحات العامة (الزائر) ──
  "/": BRAND,
  "/login": "تسجيل الدخول | منصة الحسينية",
  "/about": "التعريف بالخدمات | منصة الحسينية",
  "/portal": "بوابة تتبع الطلبات | منصة الحسينية",
  "/download": "تحميل تطبيق ALHUSAINIA | منصة الحسينية",
  "/pricing": "الأسعار والباقات | منصة الحسينية",
  "/contact": "تواصل معنا | منصة الحسينية",
  "/insights": "مركز المعرفة | منصة الحسينية",
  "/tools": "حاسبات ذكية | منصة الحسينية",
  "/solutions": "الحلول البرمجية | منصة الحسينية",
  "/governance": "حوكمة المشاريع | منصة الحسينية",
  "/integrate": "مركز التكامل | منصة الحسينية",

  // ── الصفحات التشغيلية (المشترك) ──
  "/app": "لوحة التحكم | منصة الحسينية",
  "/accounting": "النظام المحاسبي | منصة الحسينية",
  "/commercial": "العمليات التجارية | منصة الحسينية",
  "/reports": "التقارير المالية | منصة الحسينية",
  "/settings": "إعدادات المؤسسة | منصة الحسينية",
  "/erp": "نظام UAMEX | منصة الحسينية",
  "/inventory": "إدارة المخزون | منصة الحسينية",
  "/store": "المتجر الإلكتروني | منصة الحسينية",
  "/security": "الأمان والصلاحيات | منصة الحسينية",
  "/procurement-workspace": "مساحة المشتريات | منصة الحسينية",
  "/supplier-analytics": "تحليل الموردين | منصة الحسينية",
  "/procurement": "المشتريات التنفيذية | منصة الحسينية",
  "/projects": "إدارة المشاريع | منصة الحسينية",
  "/hr": "الموارد البشرية | منصة الحسينية",
  "/support": "الدعم والجودة | منصة الحسينية",
  "/pos": "نقاط البيع | منصة الحسينية",
  "/permissions": "الصلاحيات | منصة الحسينية",
  "/basic-data": "البيانات الأساسية | منصة الحسينية",
  "/journal": "القيود المحاسبية | منصة الحسينية",
  "/manual-journal": "قيد يدوي ذكي | منصة الحسينية",
  "/customization": "التخصيص والحقول | منصة الحسينية",
  "/branches": "الفروع والصلاحيات | منصة الحسينية",
  "/audit": "سجل التدقيق | منصة الحسينية",
  "/requisitions": "طلبات التوريد | منصة الحسينية",
  "/operations": "لوحة العمليات | منصة الحسينية",
  "/analytics": "التحليلات الذكية | منصة الحسينية",
  "/billing": "الاشتراك والفوترة | منصة الحسينية",

  // ── حالات الخطأ ──
  "/404": "الصفحة غير موجودة | منصة الحسينية",
};

/** المسارات الديناميكية الفرعية (مثل /commercial/invoice/create) — بادئة → عنوان. */
const DYNAMIC_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ["/commercial/invoice/", "إنشاء فاتورة | منصة الحسينية"],
  ["/commercial/", "العمليات التجارية | منصة الحسينية"],
  ["/erp/", "نظام UAMEX | منصة الحسينية"],
  ["/pos/", "نقاط البيع | منصة الحسينية"],
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

  return BRAND;
}

/** المسار الأساسي المطلق للموقع — يُستعمل في Canonical وOpenGraph. */
export const SITE_URL = "https://alhusainiaye.vercel.app";

/** الوصف الافتراضي — يظهر في نتائج البحث وعند مشاركة روابط الموقع. */
export const DEFAULT_META_DESCRIPTION =
  "منصة الحسينية الموحدة — نظام الحسابات المتقدم، الاستشارات الهندسية والتقنية والمؤسسية، خدمات المقاولين والأراضي، المتجر الإلكتروني، الخدمات الطلابية، والتصاميم وصيانة الأجهزة.";

/** وصف لكل صفحة (SEO): وصف موجز غني بالكلمات المفتاحية العربية. */
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": DEFAULT_META_DESCRIPTION,
  "/login": "تسجيل الدخول إلى منصة الحسينية الموحدة — حسابات متقدمة، استشارات، ومقاولات في منصة واحدة آمنة وموثوقة.",
  "/about": "التعريف بمؤسسة الحسينية لخدمات الأعمال ومكتبة الحسينية الحديثة — قصة المؤسسة ورسالتها وقيمها وخدماتها المتنوعة.",
  "/portal": "بوابة تتبع الطلبات والخدمات — متابعة طلباتكم الهندسية والاستشارية والتجارية في الوقت الفعلي بشفافية كاملة.",
  "/download": "تحميل تطبيق ALHUSAINIA وتطبيق الهاتف — اعمل أينما كنت مع مزامنة فورية وأداء عالٍ حتى دون اتصال.",
  "/pricing": "باقات وأسعار منصة الحسينية — أسعار تنافسية للباقات تبدأ من الأساسية وصولاً إلى الباقة الشاملة للمؤسسات.",
  "/contact": "تواصل معنا عبر واتساب والبريد والموقع — فريق الحسينية جاهز للإجابة على استفساراتك وتقديم الدعم الفوري.",
  "/insights": "مركز المعرفة والحسينية — مقالات ودورات وأدلة عملية في المحاسبة وإدارة الأعمال والتقنية والمقاولات.",
  "/tools": "حاسبات ذكية تفاعلية — احسب المقاولات والفواتير والرواتب وتحليل الاستثمار مباشرة عبر المتصفح.",
  "/solutions": "الحلول البرمجية لمنصة الحسينية — أنظمة جاهزة مرنة تناسب الجمعيات والمكاتب الهندسية وشركات المقاولات.",
  "/governance": "حوكمة المشاريع والإدارة — ضوابط الحوكمة الرشيدة لمتابعة المشاريع واتخاذ القرار بشفافية.",
  "/integrate": "مركز التكامل والربط — اربط منصة الحسينية بأدواتك المفضلة والمحاسبة والمدفوعات والرسائل بسهولة.",
  "/404": "الصفحة غير موجودة — الرابط الذي تبحث عنه غير متاح، توجه إلى الرئيسية للاستمرار.",
};

/** المسارات العامة (الزائر) — تُدار عليها Meta كاملة (Canonical + OpenGraph). */
const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  "/", "/login", "/about", "/portal", "/download", "/pricing", "/contact",
  "/insights", "/tools", "/solutions", "/governance", "/integrate", "/404",
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

/** العنوان الافتراضي للصفحة الرئيسية — للاستعلام المباشر من أي مكان. */
export const DEFAULT_PAGE_TITLE = BRAND;