/**
 * خريطة عناوين كل صفحة — تُحدَّث document.title عند التنقل (تحسين SEO + UX):
 * الزائر يعرف أين هو، والألسنة التاريخية تصبح قابلة للقراءة والعودة إليها.
 */

const BRAND = "alhusainiaye";

export const PAGE_TITLES: Record<string, string> = {
  // ── الصفحات العامة (الزائر) ──
  "/": BRAND,
  "/login": "تسجيل الدخول | alhusainiaye",
  "/about": "التعريف بالخدمات | alhusainiaye",
  "/portal": "بوابة تتبع الطلبات | alhusainiaye",
  "/download": "تحميل تطبيق ALHUSAINIA | alhusainiaye",
  "/pricing": "الأسعار والباقات | alhusainiaye",
  "/contact": "تواصل معنا | alhusainiaye",
  "/insights": "مركز المعرفة | alhusainiaye",
  "/tools": "حاسبات ذكية | alhusainiaye",
  "/solutions": "الحلول البرمجية | alhusainiaye",
  "/governance": "حوكمة المشاريع | alhusainiaye",
  "/integrate": "مركز التكامل | alhusainiaye",

  // ── الصفحات التشغيلية (المشترك) ──
  "/app": "لوحة التحكم | alhusainiaye",
  "/accounting": "النظام المحاسبي | alhusainiaye",
  "/commercial": "العمليات التجارية | alhusainiaye",
  "/reports": "التقارير المالية | alhusainiaye",
  "/settings": "إعدادات المؤسسة | alhusainiaye",
  "/erp": "نظام Uamex_erp | alhusainiaye",
  "/inventory": "إدارة المخزون | alhusainiaye",
  "/store": "المتجر الإلكتروني | alhusainiaye",
  "/security": "الأمان والصلاحيات | alhusainiaye",
  "/procurement-workspace": "مساحة المشتريات | alhusainiaye",
  "/supplier-analytics": "تحليل الموردين | alhusainiaye",
  "/procurement": "المشتريات التنفيذية | alhusainiaye",
  "/projects": "إدارة المشاريع | alhusainiaye",
  "/hr": "الموارد البشرية | alhusainiaye",
  "/support": "الدعم والجودة | alhusainiaye",
  "/pos": "نقاط البيع | alhusainiaye",
  "/permissions": "الصلاحيات | alhusainiaye",
  "/basic-data": "البيانات الأساسية | alhusainiaye",
  "/journal": "القيود المحاسبية | alhusainiaye",
  "/manual-journal": "قيد يدوي ذكي | alhusainiaye",
  "/customization": "التخصيص والحقول | alhusainiaye",
  "/branches": "الفروع والصلاحيات | alhusainiaye",
  "/audit": "سجل التدقيق | alhusainiaye",
  "/requisitions": "طلبات التوريد | alhusainiaye",
  "/operations": "لوحة العمليات | alhusainiaye",
  "/analytics": "التحليلات الذكية | alhusainiaye",
  "/billing": "الاشتراك والفوترة | alhusainiaye",

  // ── حالات الخطأ ──
  "/404": "الصفحة غير موجودة | alhusainiaye",
};

/** المسارات الديناميكية الفرعية (مثل /commercial/invoice/create) — بادئة → عنوان. */
const DYNAMIC_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ["/commercial/invoice/", "إنشاء فاتورة | alhusainiaye"],
  ["/commercial/", "العمليات التجارية | alhusainiaye"],
  ["/erp/", "نظام Uamex_erp | alhusainiaye"],
  ["/pos/", "نقاط البيع | alhusainiaye"],
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
  "/login":
    "تسجيل الدخول إلى منصة الحسينية الموحدة — حسابات متقدمة، استشارات، ومقاولات في منصة واحدة آمنة وموثوقة.",
  "/about":
    "التعريف بمؤسسة الحسينية لخدمات الأعمال ومكتبة الحسينية الحديثة — قصة المؤسسة ورسالتها وقيمها وخدماتها المتنوعة.",
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

/** العنوان الافتراضي للصفحة الرئيسية — للاستعلام المباشر من أي مكان. */
export const DEFAULT_PAGE_TITLE = BRAND;
