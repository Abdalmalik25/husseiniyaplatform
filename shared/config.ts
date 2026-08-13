export type PaymentMode = "stripe" | "manual" | "disabled";
export type CreditPriority = "free-first" | "paid-first";

export type CreditPlan = {
  id: string;
  name: string;
  priceLabel: string;
  creditsLabel: string;
  description: string;
  features: string[];
  tone: "sand" | "ink" | "white";
};

export type ServiceCatalogItem = {
  id: string;
  category: "engineering" | "realEstate" | "consulting" | "technical" | "office" | "design" | "supply" | "maintenance" | "student";
  title: string;
  shortDescription: string;
  fullDescription: string;
  icon: string;
  creditCost: number;
  seoKeywords: string[];
};

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  { id: "site-survey", category: "engineering", title: "رفع مساحي ومخططات أراضٍ", shortDescription: "قياسات ميدانية دقيقة وإعداد مخططات أرض.", fullDescription: "نجري رفع مساحي احترافي باستخدام أجهزة استشعار دقيقة، ونمنحك مخطط أرض منسق وفق الأسس المعتمدة، يشمل الارتفاعات، الاتجاهات، وحدود الملكية — القاعدة لأي مشروع تخطيطي أو بنائي.", icon: "ruler", creditCost: 2, seoKeywords: ["رفع مساحي", "مخطط أرض", "قياس مساحي", "رسم معماري"] },
  { id: "architectural", category: "engineering", title: "تصاميم معمارية وهندسية", shortDescription: "تصاميم عملية وأنيقة وفق الاشتراطات.", fullDescription: "ندمج بين الجماليات العملية والاشتراطات البناء والمواصفات الهندسية لنؤمن تصاميمًا قابلة للتنفيذ ومتوافقة مع الاحتياجات الوظيفية والمعايير الأمنية.", icon: "drafting", creditCost: 3, seoKeywords: ["تصميم معماري", "رسم هندسي", "مخطط معماري", "تصميم مبنى"] },
  { id: "engineering-consult", category: "engineering", title: "استشارات هندسية", shortDescription: "رأي مهني موثوق من مهندسين خبراء.", fullDescription: "نقدّم استشارات هندسية متخصصة في التخطيط والتنفيذ ومراجعة المخططات — تغطي البنية التلقائية، ميكانيكاكيت، كهرباء، وتطلعات البناء وفق المعايير السعودية واليمنية.", icon: "compass", creditCost: 1, seoKeywords: ["استشارة هندسية", "مراجعة مخططات", "مهندس معماري", "استشارة بناء"] },
  { id: "property-eval", category: "realEstate", title: "تقييم وتثمين العقارات", shortDescription: "قراءة مهنية للسعر والجدوة العقارية.", fullDescription: "ندرّب قراءة حية على السوق والموقع والوضع العقاري باستخدام نماذج تقييمية معتمدة وفق معاييرنا الداخلية وبيانات المعاملات السابقة، مع تقرير كتفافي شامل.", icon: "land", creditCost: 2, seoKeywords: ["تقييم عقاري", "تثمين عقار", "سعر عقار", "تقييم سوق العقار"] },
  { id: "real-estate-consult", category: "realEstate", title: "استشارات عقارية", shortDescription: "مساعدة في اختيار الفرص ودراسة الجدوى.", fullDescription: "ندرّب على اختيار استراتيجيات استثمارية مبنية على التحليل الكمي والنوعي — من دراسة الجدوى الأولية إلى تقييم العائد وتحليل المخاطر، بما في ذلك التوجيه الفلوسي والقانوني.", icon: "map", creditCost: 1, seoKeywords: ["استشارة عقارية", "شراء عقار", "استثمار عقاري", "فرصة استثمارية"] },
  { id: "org-dev", category: "consulting", title: "تطوير مؤسسي وإداري", shortDescription: "بناء نظم وإجراءات وتحسين الأداء.", fullDescription: "نساعد المؤسسات على تحويل التحديات إلى أنظمة واضحة — من تدفقات العمل إلى بنية المسؤولية والمؤشرات، بما يرفع الأداء ويخفض التكاليف.", icon: "file", creditCost: 2, seoKeywords: ["تطوير مؤسسي", "تحسين أداء", "إدارة عمليات", "استراتيجية مؤسسية"] },
  { id: "office-support", category: "office", title: "خدمات مكتبية متكاملة", shortDescription: "دعم إداري وإدارة مستندات بكفاءة.", fullDescription: "نغطي كل ما تحتاجه مكاتبك اليومية: إدخال مستندات، معالجة طلبات، إعداد تقارير، إدارة بريد إلكتروني، ومهام إدارية أخرى — لتخفيف العبء وتوجيه الطاقة للعمل الإستراتيجي.", icon: "file-text", creditCost: 1, seoKeywords: ["خدمات مكتبية", "دعم إداري", "إدارة مستندات", "مهام مكتبية"] },
  { id: "it-support", category: "technical", title: "الدعم التقني وحلول التقنية", shortDescription: "صيانة وإصلاح أجهزة وأنظمة تقنية.", fullDescription: "ندعم الأعمال على تنظيم عملياتها وحضورها وخدماتها التقنية بكفاءة — من صيانة الأجهزة إلى إعداد شبكات وأمان وحلول سحابية.", icon: "sparkles", creditCost: 2, seoKeywords: ["دعم تقني", "صيانة كمبيوتر", "شبكات", "حلول سحابية"] },
  { id: "maintenance", category: "maintenance", title: "الصيانة والتشغيل الميكانيكي", shortDescription: "صيانة وتركيب وتشغيل معدات.", fullDescription: "نوفر صيانة دورية وطارئة للمعدات والأنظمة الميكانيكية، مع فحوصات وقائية وروابط صيانة تضمن أوقات عمل مستقرة.", icon: "tool", creditCost: 2, seoKeywords: ["صيانة معدات", "تشغيل ميكانيكي", "صيانة طارئة", "صيانة دورية"] },
  { id: "student-services", category: "student", title: "الخدمات الطلابية", shortDescription: "دعم ومرشدية طلابية وتعليمية.", fullDescription: "ندعم الطلاب في رفع المستوى الأكاديمي عبر المراجعة، التخطيط للواجبات، وإعداد ملخصات — بما يدعم النجاح ويقلل الضغط.", icon: "graduation-cap", creditCost: 1, seoKeywords: ["خدمات طلابية", "مراجعة أكاديمية", "مساعدة طلابية", "تعليم خاص"] },
  { id: "design-branding", category: "design", title: "التصميم والهوية البصرية", shortDescription: "مواد وهوية بصرية متسقة مع أهدافك.", fullDescription: "نبني هوية بصرية موحدة ومواد تسويقية — من شعار إلى كتيبات ورشة وعروض، لتمثل مؤسستك باحتراف.", icon: "drafting", creditCost: 3, seoKeywords: ["تصميم هوية", "هوية بصرية", "تصميم جرافيك", "مواد تسويقية"] },
  { id: "supply-chain", category: "supply", title: "تنسيق التوريد", shortDescription: "تنظيم احتياجات التوريد وربطها بمشروعك.", fullDescription: "ننسّق متطلبات التوريد، نربطها بمتطلبات المشروع في مسار أكثر انضباطاً، ونتابع التسليم لتدعم جداول الزمن بثقة.", icon: "package", creditCost: 2, seoKeywords: ["توريد مواد", "سلاسل إمداد", "تنسيق توريد", "شراء مواد"] },
];

export const CUSTOMER_ACQUISITION = {
  valueProps: [
    "من الفكرة إلى الإنجاز — خطوة واحدة محسوبة",
    "خبرة مؤهلة تُترجم احتياجك إلى مخرج عملي",
    "استجابة سريعة وواضحة قبل بدء العمل",
    "أسعار شفافة وبدون تعقيدات مخفية",
  ],
  trustSignals: [
    "خبرة متراكمة في الهندسة والعقار والاستشارات المؤسسية",
    "نهج مبني على النتائج القابلة للقياس",
    "مرونة تلبي متطلبات الأفراد والشركات والمؤسسات",
  ],
  funnelCTA: "سجّل بياناتك، وابدأ برصيد تجريبي مجاني. ثم اختر الباقة التي تنمو مع عملك.",
} as const;

export const ACCOUNTING = {
  defaultCurrency: "YER",
  supportedCurrencies: ["YER", "SAR", "USD", "AED", "EUR"],
  defaultUnits: ["وحدة", "قطعة", "كجم", "لتر", "متر", "متر مربع", "متر مكعب", "كرتونة", "طرد", "ساعة", "خدمة"],
  chartOfAccounts: "47 حساباً موحداً — أصول/خصوم/حقوق ملكية/إيرادات/مصاريف",
} as const;

export const DEFAULT_SITE_CONFIG = {
  brand: {
    arabicName: "الحسينية",
    commercialName: "ALHUSAINIA",
    legalName: "مؤسسة الحسينية لخدمات الأعمال",
    englishName: "ALHUSAINIA Business Services Establishment",
    tagline: "شريكك المهني لخدمات الأعمال المتكاملة",
    supportEmail: "",
    phone: "",
    whatsapp: "",
  },
  credits: {
    trialAmount: 3,
    unitLabel: "رصيد",
    consumptionLabel: "طلب خدمة أو خطوة استشارية",
    consumptionPriority: "free-first" as CreditPriority,
    costPerAction: 1,
  },
  payment: {
    mode: "disabled" as PaymentMode,
    providerLabel: "Stripe",
    checkoutEnabled: false,
    successUrl: "/credits?payment=success",
    cancelUrl: "/credits?payment=cancelled",
  },
  plans: [
    { id: "trial", name: "تجربة البداية", priceLabel: "مجاني", creditsLabel: "3 أرصدة", description: "لتجربة طلبات الخدمات المؤقتة والتعرّف إلى طريقة العمل.", features: ["رصيد مجاني عند التسجيل", "الوصول إلى طلبات الخدمات", "بدون بطاقة دفع"], tone: "sand" as const },
    { id: "business", name: "باقة الأعمال", priceLabel: "قريباً", creditsLabel: "10 أرصدة", description: "لأصحاب الأعمال والمشاريع الذين يحتاجون إلى متابعة متكررة.", features: ["10 أرصدة للخدمات", "أولوية في متابعة الطلب", "سجل استخدام واضح"], tone: "ink" as const },
    { id: "enterprise", name: "الشريك المؤسسي", priceLabel: "حسب الاحتياج", creditsLabel: "مرن", description: "حل مخصص للشركات والمؤسسات والمشاريع متعددة الاحتياجات.", features: ["رصيد مخصص للفريق", "تنسيق خدمات متعدد", "دعم استشاري مؤسسي"], tone: "white" as const },
  ] satisfies CreditPlan[],
};

export type SiteConfig = {
  brand: {
    arabicName: string;
    commercialName: string;
    legalName: string;
    englishName: string;
    tagline: string;
    supportEmail: string;
    phone: string;
    whatsapp: string;
  };
  credits: { trialAmount: number; unitLabel: string; consumptionLabel: string; consumptionPriority: CreditPriority; costPerAction: number };
  payment: { mode: PaymentMode; providerLabel: string; checkoutEnabled: boolean; successUrl: string; cancelUrl: string };
  plans: CreditPlan[];
};
