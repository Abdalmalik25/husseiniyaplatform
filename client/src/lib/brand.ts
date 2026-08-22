/**
 * ALHUSAINIA — Brand Identity System
 * ===================================
 * Single source of truth for the platform's visual identity, voice, and
 * marketing messaging. Import tokens from here so every surface (landing,
 * dashboard, store, emails, integrations) stays perfectly consistent.
 *
 * Design language: "Heritage Ledger" — a calm deep-teal ink paired with warm
 * bronze gold, evoking trust, permanence, and craftsmanship. RTL-first.
 */

export const brand = {
  /** Canonical names used across the UI, SEO, and documents. */
  names: {
    arabic: "الحسينية",
    commercial: "ALHUSAINIA",
    legal: "مؤسسة الحسينية لخدمات الأعمال",
    legalFull: "مؤسسة الحسينية لخدمات الأعمال",
    english: "ALHUSAINIA Business Services Establishment",
    library: "مكتبة الحسينية الحديثة",
  },

  /** Primary tagline (hero) + supporting one-liner. */
  tagline: "منظومة الأعمال الموحّدة للمؤسسات والفروع",
  taglineEn: "The Unified Business OS for Institutions & Branches",
  promise:
    "محاسبة متقدمة، استشارات هندسية، وخدمات مكتبية وطلابية — في منصة سحابية واحدة متعددة المؤسسات والفروع والعملات.",

  /** Modern, consultative marketing messaging — global & progressive. */
  valueProps: [
    {
      en: "One platform. Every department. Zero fragmentation.",
      ar: "منصة واحدة. كل إدارة. لا تشتت.",
      icon: "Zap",
    },
    {
      en: "Offline-first architecture — work anywhere, sync everywhere.",
      ar: "بنية لاسلكية أولاً — اعمل في أي مكان، وزّع البيانات للجميع.",
      icon: "Wifi",
    },
    {
      en: "Enterprise-grade security with JWT + ISO-compliant controls.",
      ar: "أمان مستوى المؤسسات مع JWT وضوابط مطابقة ISO.",
      icon: "ShieldCheck",
    },
    {
      en: "Multi-tenant, multi-currency, multi-branch from day one.",
      ar: "متعدد المؤسسات والعملات والفروع من اليوم الأول.",
      icon: "Layers",
    },
  ],

  /** Brand voice used in CTAs and microcopy. */
  voice: {
    primaryCta: "ابدأ الآن مجاناً",
    primaryCtaEn: "Start Free Trial",
    secondaryCta: "استكشف المنظومة",
    secondaryCtaEn: "Explore the Platform",
    trialNote: "تجربة مجانية 14 يوماً — بدون بطاقة ائتمان",
    trialNoteEn: "14-day free trial — no credit card required",
  },

  /** Canonical contact & social (edit once, used everywhere). */
  contact: {
    phone: "+967 770 000 000",
    whatsapp: "967770000000",
    email: "hello@husseiniya-business.com",
    engineeringEmail: "engineering@husseiniya-business.com",
    address: "المركز الرئيسي — شارع المؤسسة والمكتبة",
    country: "اليمن",
    website: "https://alhusainiaye.vercel.app",
  },

  /** Cohesive color tokens (mirrors index.css custom properties). */
  colors: {
    ink: "#0e2a2b",
    inkDeep: "#0a1f20",
    bronze: "#b87945",
    bronzeDeep: "#9a6334",
    gold: "#d4a574",
    goldSoft: "#e7c9a6",
    sand: "#fbf8f2",
    emerald: "#0f766e",
    sky: "#0369a1",
    rose: "#be123c",
  },

  /** Verified trust signals shown in the marketing footer / hero. */
  trustBadges: [
    "تشفير SSL ومصادقة JWT آمنة",
    "نُشر على GitHub & Vercel",
    "يعمل أوفلاين وسحابياً",
    "دعم متعدد العملات والفروع",
  ],

  /** Social-proof metrics (kept honest & conservative). */
  stats: [
    { value: "+1,200", label: "مشروع هندسي ورفع مساحي" },
    { value: "+450", label: "جدول كميات (BOQ) ومخطط" },
    { value: "+15,000", label: "معاملة مالية منجزة" },
    { value: "%99.6", label: "رضا العملاء والمقاولين" },
  ],

  /** Client testimonials (marketing social proof). */
  testimonials: [
    {
      quote:
        "وحّدنا محاسبتنا وفروعنا الثلاثة في منصة واحدة، وصار الإقفال السنوي في يوم بدل أسابيع.",
      author: "أ. محمد العُمري",
      role: "مدير مؤسسة مقاولات",
    },
    {
      quote:
        "جداول الـ BOQ والرفع المساحي وفّرت علينا هدراً كبيراً في حديد وخرسانة المشاريع.",
      author: "م. سارة الحُبيشي",
      role: "استشارية هندسية",
    },
    {
      quote:
        "خدمة الطباعة والتصميم والصيانة من نفس المنصة جعلت حياتنا الطلابية أسهل بكثير.",
      author: "ط. عبدالله النخعي",
      role: "طالب دراسات عليا",
    },
  ],

  /** Feature pillars for the homepage grid. */
  pillars: [
    {
      key: "accounting",
      title: "النظام المحاسبي المتقدم",
      summary:
        "قيد مزدوج، دليل حسابات شجري، ميزان مراجعة، وقوائم مالية وإقفال سنوي تلقائي.",
      icon: "Building2",
    },
    {
      key: "engineering",
      title: "الاستشارات الهندسية والمقاولات",
      summary:
        "مخططات تنفيذية، رفع مساحي، جداول BOQ، وحساب الحفر والردم للمقاولين والأراضي.",
      icon: "HardHat",
    },
    {
      key: "commercial",
      title: "المبيعات والمخازن والعملاء",
      summary:
        "فواتير، سندات، حركة مخزون، وربط طلبات المتجر بكتالوج المنتجات آلياً.",
      icon: "ShoppingCart",
    },
    {
      key: "library",
      title: "مكتبة الحسينية وصيانة الأجهزة",
      summary:
        "خدمات طلابية، تصاميم، أبحاث، وتصليح الموبايل والكمبيوتر تحت سقف واحد.",
      icon: "BookOpen",
    },
  ],
} as const;

export type Brand = typeof brand;

/** Build a wa.me deep link with pre-filled Arabic text. */
export function whatsappLink(text: string): string {
  return `https://wa.me/${brand.contact.whatsapp}?text=${encodeURIComponent(text)}`;
}
