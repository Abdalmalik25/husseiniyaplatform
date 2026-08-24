import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Language = "ar" | "en";

interface TranslationResources {
  [key: string]: {
    [key: string]: string | string[];
  };
}

const translations: TranslationResources = {
  ar: {
    // Common
    appName: "منصة الحسينية",
    appDescription:
      "منصة الحسينية الموحدة — نظام الحسابات المتقدم، الاستشارات الهندسية والتقنية والمؤسسية، خدمات المقاولين والأراضي، المتجر الإلكتروني، الخدمات الطلابية، التصاميم، وصيانة الأجهزة.",
    home: "الرئيسية والتسويق",
    workspaces: "مساحات العمل والأنظمة",
    about: "التعريف بالخدمات",
    portal: "بوابة التتبع",
    store: "المتجر الإلكتروني",
    commercial: "العمليات التجارية",
    reports: "التقارير المالية",
    integrate: "مركز التكامل",
    download: "تحميل التطبيق",
    // Header
    languageToggle: "العربية / English",
    settings: "إعدادات",
    // Landing page
    landingHeroTagline: "منظومة الأعمال الموحّدة للمؤسسات والفروع",
    landingHeroPromise:
      "محاسبة متقدمة، استشارات هندسية، وخدمات مكتبية وطلابية — في منصة سحابية واحدة متعددة المؤسسات والفروع والعملات.",
    landingStartFreeTrial: "ابدأ الفترة التجريبية المجانية (14 يوماً)",
    landingExploreWorkspaces: "استكشاف مساحات العمل والأنظمة",
    landingElectronicStore: "المتجر الإلكتروني",
    landingNoCreditCard: "بدون بطاقة ائتمان",
    landingInstantActivation: "تفعيل فوري لكافة الوحدات",
    landingOfflineOnline: "تعمل أوفلاين وسحابياً",
    landingWhyChoose: "لماذا تختار الحسينية?",
    landingPlatformRedefines: "منصة متكاملة تُعيد تعريف إدارة المؤسسات",
    landingPlatformDescription:
      "نجمع بين الذكاء الاصطناعي، الأمان المؤسسي، والبنية اللاسلكية الأولى لضمان إنتاجية لا تُضاهى.",
    // Value props
    valuePropOneAr: "منصة واحدة. كل إدارة. لا تشتت.",
    valuePropOneEn: "One platform. Every department. Zero fragmentation.",
    valuePropTwoAr:
      "بنية لاسلكية أولاً — اعمل في أي مكان، وزّع البيانات للجميع.",
    valuePropTwoEn:
      "Offline-first architecture — work anywhere, sync everywhere.",
    valuePropThreeAr: "أمان مستوى المؤسسات مع JWT وضوابط مطابقة ISO.",
    valuePropThreeEn:
      "Enterprise-grade security with JWT + ISO-compliant controls.",
    valuePropFourAr: "متعدد المؤسسات والعملات والفروع من اليوم الأول.",
    valuePropFourEn: "Multi-tenant, multi-currency, multi-branch from day one.",
    // Workspaces
    workspaceAccountingTitle: "النظام المحاسبي والمالي المتقدم",
    workspaceEngineeringTitle: "جناح الاستشارات الهندسية والمقاولات والأراضي",
    workspaceCommercialTitle: "إدارة العمليات التجارية والمخازن والعملاء",
    workspaceLibraryTitle: "مكتبة الحسينية الحديثة وصيانة الأجهزة",
    // Footer
    footerSystem: "المنظومة",
    footerUnits: "الوحدات",
    footerResources: "الموارد",
    footerContact: "تواصل ومقر المؤسسة",
    footerNewsletter: "احصل على آخر المستجدات والعروض",
    footerNewsletterPlaceholder: "example@company.com",
    footerNewsletterButton: "الاشتراك",
    footerTrust: "تشفير SSL ومصادقة JWT آمنة",
    footerTrust2: "نُشر على GitHub & Vercel",
    footerTrust3: "يعمل أوفلاين وسحابياً",
    footerTrust4: "دعم متعدد العملات والفروع",
    footerCopyright:
      "مؤسسة الحسينية لخدمات الأعمال ومكتبة الحسينية الحديثة — جميع الحقوق محفوظة",
    footerPowered:
      "منظومة سحابية متعددة المؤسسات والفروع والعملات — مبنية ومُنشرة عبر GitHub & Vercel.",
    // About page
    aboutHeroTitle: "مؤسسة الحسينية لخدمات الأعمال ومكتبة الحسينية الحديثة",
    aboutHeroSubtitle:
      "الخبراء المعتمدون للخدمات الهندسية، المقاولات، الأراضي، والمكتبية",
    aboutEngineeringTitle: "القطاع الهندسي والتطوير العقاري",
    aboutEngineeringDescription:
      "مخططات تنفيذي (Shop Drawings)، رفع مساحي رقمي بـ GPS ودرون، جداول كميات (BOQ)، حساب حفر وردم، وإشراف ميداني.",
    aboutRequestEngineeringConsultation: "طلب استشارة هندسية مخصصة",
    aboutTechnicalTitle: "الاستشارات التقنية والأنظمة",
    aboutAdministrativeTitle: "الاستشارات المؤسسية والإدارية",
    aboutFinancialTitle: "الاستشارات والحلول المحاسبية",
    aboutLibraryTitle: "قطاع الطلاب والبحوث والتقنية",
    aboutLibraryDescription:
      "الخدمات الطلابية والمكتبية، التصاميم الإبداعية، البحوث والدراسات الأكاديمية، وصيانة الموبايل والكمبيوتر.",
    aboutFAQTitle: "الأسئلة الشائعة للمقاولين وأصحاب الأراضي والخدمات",
    aboutContactTitle: "تواصل معنا المباشر",
    aboutContactSubtitle: "يسعدنا تشريفكم المقر الرئيسي أو التواصل الهاتفي",
    aboutContactDescription:
      "فريق المهندسين والمستشارين والفنيين في مؤسسة ومكتبة الحسينية بانتظاركم لإنجاز مشاريعكم الهندسية والعقارية والمكتبية.",
    aboutContactAddress:
      "المركز الرئيسي — شارع المؤسسة والمكتبة، الفرع الهندسي والتخصصي",
    aboutContactPhone: "+967 778 343 988 / +967 778 332 096",
    aboutContactEmail: "engineering@husseiniya-business.com",
    aboutContactButton: "طلب تسعيرة ودراسة هندسية الآن",
    // Modals
    modalFreeTrialTitle: "ابدأ الفترة التجريبية المجانية (14 يوماً)",
    modalFreeTrialDescription:
      "وصول كامل ومجاني لكافة مساحات العمل والميزات بدون بطاقة ائتمان.",
    modalFreeTrialFeatures: [
      "تجربة شمولية 14 يوماً لكل الوحدات والمساحات.",
      "حفظ آمن وحماية كاملة لبياناتك.",
    ],
    modalCancel: "إلغاء",
    modalActivate: "تفعيل التجربة المجانية والدخول",
    // Service request modal
    modalRequestTitle: "طلب خدمة / استشارة — ",
    modalRequestDescription:
      "أدخل بياناتك وسيتم التواصل معك مباشرة لتلبية طلبك بأفضل جودة.",
    modalServiceLabel: "نوع الخدمة المطلوب:",
    modalNameLabel: "الاسم الكامل / الجهة *",
    modalPhoneLabel: "رقم الهاتف / الواتساب *",
    modalEmailLabel: "البريد الإلكتروني (اختياري)",
    modalDetailsLabel: "تفاصيل وسياق الطلب / الملاحظات الهندسة",
    modalSubmitButton: "إرسال الطلب",
    modalSubmitting: "جاري الإرسال...",
    modalSuccessTitle: "تم إرسال الطلب بنجاح!",
    modalSuccessRef: "رقم مرجع الطلب الخاص بك:",
    modalFollowUp:
      "يمكنك الضغط على الزر أدناه لمتابعة الطلب فوراً عبر واتساب المؤسسة.",
    modalFollowUpButton: "متابعة عبر الواتساب",
    modalClose: "إغلاق",
  },
  en: {
    // Common
    appName: "ALHUSAINIA Platform",
    appDescription:
      "ALHUSAINIA unified platform — advanced accounting system, engineering, technical and institutional consultations, contractor and land services, e-commerce store, student services, designs, and device maintenance.",
    home: "Home & Marketing",
    workspaces: "Workspaces & Systems",
    about: "About Services",
    portal: "Tracking Portal",
    store: "Electronic Store",
    commercial: "Commercial Operations",
    reports: "Financial Reports",
    integrate: "Integration Center",
    download: "Download App",
    // Header
    languageToggle: "العربية / English",
    settings: "Settings",
    // Landing page
    landingHeroTagline: "The Unified Business OS for Institutions & Branches",
    landingHeroPromise:
      "Advanced accounting, engineering consultations, and office & student services — in one cloud platform for multiple institutions, branches, and currencies.",
    landingStartFreeTrial: "Start Free Trial (14 days)",
    landingExploreWorkspaces: "Explore Workspaces & Systems",
    landingElectronicStore: "Electronic Store",
    landingNoCreditCard: "No Credit Card Required",
    landingInstantActivation: "Instant Activation for All Modules",
    landingOfflineOnline: "Works Offline & Online",
    landingWhyChoose: "Why Choose Alhusainia?",
    landingPlatformRedefines:
      "An Integrated Platform That Redefines Institution Management",
    landingPlatformDescription:
      "We combine artificial intelligence, institutional security, and wireless-first architecture to ensure unmatched productivity.",
    // Value props
    valuePropOneAr: "منصة واحدة. كل إدارة. لا تشتت.",
    valuePropOneEn: "One platform. Every department. Zero fragmentation.",
    valuePropTwoAr:
      "بنية لاسلكية أولاً — اعمل في أي مكان، وزّع البيانات للجميع.",
    valuePropTwoEn:
      "Offline-first architecture — work anywhere, sync everywhere.",
    valuePropThreeAr: "أمان مستوى المؤسسات مع JWT وضوابط مطابقة ISO.",
    valuePropThreeEn:
      "Enterprise-grade security with JWT + ISO-compliant controls.",
    valuePropFourAr: "متعدد المؤسسات والعملات والفروع من اليوم الأول.",
    valuePropFourEn: "Multi-tenant, multi-currency, multi-branch from day one.",
    // Workspaces
    workspaceAccountingTitle: "Advanced Accounting & Financial System",
    workspaceEngineeringTitle: "Engineering Consultations & Contracting Wing",
    workspaceCommercialTitle: "Commercial Operations & Inventory Management",
    workspaceLibraryTitle: "Alhusainia Modern Library & Device Maintenance",
    // Footer
    footerSystem: "The System",
    footerUnits: "Units",
    footerResources: "Resources",
    footerContact: "Contact & Headquarters",
    footerNewsletter: "Get Latest Updates & Offers",
    footerNewsletterPlaceholder: "example@company.com",
    footerNewsletterButton: "Subscribe",
    footerTrust: "SSL Encryption & Secure JWT Authentication",
    footerTrust2: "Published on GitHub & Vercel",
    footerTrust3: "Works Offline & Cloud",
    footerTrust4: "Multi-currency & Multi-branch Support",
    footerCopyright:
      "ALHUSAINIA Business Services Establishment & Alhusainia Modern Library — All Rights Reserved",
    footerPowered:
      "Cloud-based multi-institution, multi-branch, multi-currency platform — built and deployed via GitHub & Vercel.",
    // About page
    aboutHeroTitle:
      "ALHUSAINIA Business Services Establishment & Alhusainia Modern Library",
    aboutHeroSubtitle:
      "Certified experts for engineering, contracting, land, and office services",
    aboutEngineeringTitle: "Engineering & Real Estate Development Sector",
    aboutEngineeringDescription:
      "Executive (Shop Drawings) plans, digital GPS & drone surveying, quantity tables (BOQ), cut & fill calculations, and on-site supervision.",
    aboutRequestEngineeringConsultation:
      "Request a Custom Engineering Consultation",
    aboutTechnicalTitle: "Technical & Systems Consultations",
    aboutAdministrativeTitle: "Institutional & Administrative Consultations",
    aboutFinancialTitle: "Accounting & Financial Consultations",
    aboutLibraryTitle: "Student, Research & Technology Sector",
    aboutLibraryDescription:
      "Student & office services, creative designs, academic research & studies, and mobile & computer maintenance.",
    aboutFAQTitle:
      "Frequently Asked Questions for Contractors, Landowners & Services",
    aboutContactTitle: "Direct Contact",
    aboutContactSubtitle:
      "We are honored by your visit to our headquarters or via phone communication",
    aboutContactDescription:
      "The team of engineers, consultants, and technicians at Alhusainia Establishment & Library is ready to accomplish your engineering, real estate, and office projects.",
    aboutContactAddress:
      "Main Headquarters — Institution & Library Street, Engineering & Specialty Branch",
    aboutContactPhone: "+967 778 343 988 / +967 778 332 096",
    aboutContactEmail: "engineering@husseiniya-business.com",
    aboutContactButton: "Request Engineering Quote & Study Now",
    // Modals
    modalFreeTrialTitle: "Start Free Trial (14 days)",
    modalFreeTrialDescription:
      "Full and free access to all workspaces and features without credit card.",
    modalFreeTrialFeatures: [
      "Comprehensive 14-day trial for all modules and workspaces.",
      "Secure storage and full protection of your data.",
    ],
    modalCancel: "Cancel",
    modalActivate: "Activate Free Trial & Enter",
    // Service request modal
    modalRequestTitle: "Service Request / Consultation — ",
    modalRequestDescription:
      "Enter your details and we will contact you directly to fulfill your request with the best quality.",
    modalServiceLabel: "Requested Service Type:",
    modalNameLabel: "Full Name / Entity *",
    modalPhoneLabel: "Phone / WhatsApp *",
    modalEmailLabel: "Email (Optional)",
    modalDetailsLabel: "Request Details & Engineering Notes",
    modalSubmitButton: "Submit Request",
    modalSubmitting: "Submitting...",
    modalSuccessTitle: "Request Sent Successfully!",
    modalSuccessRef: "Your Request Reference Number:",
    modalFollowUp:
      "You can press the button below to follow up your request immediately via WhatsApp with the institution.",
    modalFollowUpButton: "Follow Up via WhatsApp",
    modalClose: "Close",
  },
};

const I18nContext = createContext({
  language: "ar" as Language,
  setLanguage: (_lang: Language) => {},
  t: (key: string) => key,
});

export const useI18n = () => {
  return useContext(I18nContext);
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("ar");

  useEffect(() => {
    const saved = localStorage.getItem("i18n_lang") as Language | null;
    if (saved && ["ar", "en"].includes(saved)) {
      setLanguage(saved);
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    localStorage.setItem("i18n_lang", language);
  }, [language]);

  const t = (key: string): string => {
    // Support nested keys like "landing.heroTitle"
    const keys = key.split(".");
    let res: any = translations[language];
    for (const k of keys) {
      if (res == null) return key;
      res = res[k];
    }
    return res !== null && res !== undefined ? res : key;
  };

  return React.createElement(
    I18nContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
};
