import { DEFAULT_SITE_CONFIG, type CreditPlan, type CreditPriority, type PaymentMode, type SiteConfig } from "@shared/config";

const numberEnv = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const env = import.meta.env as Record<string, string | undefined>;

const plansFromEnv = () => {
  if (!env.VITE_CREDIT_PLANS_JSON) return DEFAULT_SITE_CONFIG.plans;
  try {
    const parsed = JSON.parse(env.VITE_CREDIT_PLANS_JSON) as CreditPlan[];
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SITE_CONFIG.plans;
  } catch {
    return DEFAULT_SITE_CONFIG.plans;
  }
};

export const siteConfig: SiteConfig = {
  ...DEFAULT_SITE_CONFIG,
  brand: {
    ...DEFAULT_SITE_CONFIG.brand,
    arabicName: env.VITE_BRAND_ARABIC_NAME || DEFAULT_SITE_CONFIG.brand.arabicName,
    commercialName: env.VITE_BRAND_COMMERCIAL_NAME || DEFAULT_SITE_CONFIG.brand.commercialName,
    legalName: env.VITE_BRAND_LEGAL_NAME || DEFAULT_SITE_CONFIG.brand.legalName,
    englishName: env.VITE_BRAND_ENGLISH_NAME || DEFAULT_SITE_CONFIG.brand.englishName,
    tagline: env.VITE_BRAND_TAGLINE || DEFAULT_SITE_CONFIG.brand.tagline,
    supportEmail: env.VITE_SUPPORT_EMAIL || DEFAULT_SITE_CONFIG.brand.supportEmail,
    phone: env.VITE_SUPPORT_PHONE || DEFAULT_SITE_CONFIG.brand.phone,
    whatsapp: env.VITE_SUPPORT_WHATSAPP || DEFAULT_SITE_CONFIG.brand.whatsapp,
  },
  credits: {
    ...DEFAULT_SITE_CONFIG.credits,
    trialAmount: numberEnv(env.VITE_TRIAL_CREDITS, DEFAULT_SITE_CONFIG.credits.trialAmount),
    unitLabel: env.VITE_CREDIT_UNIT_LABEL || DEFAULT_SITE_CONFIG.credits.unitLabel,
    consumptionLabel: env.VITE_CREDIT_CONSUMPTION_LABEL || DEFAULT_SITE_CONFIG.credits.consumptionLabel,
    consumptionPriority: (env.VITE_CREDIT_CONSUMPTION_PRIORITY as CreditPriority) || DEFAULT_SITE_CONFIG.credits.consumptionPriority,
    costPerAction: numberEnv(env.VITE_CREDIT_COST_PER_ACTION, DEFAULT_SITE_CONFIG.credits.costPerAction) || DEFAULT_SITE_CONFIG.credits.costPerAction,
  },
  payment: {
    ...DEFAULT_SITE_CONFIG.payment,
    mode: (env.VITE_PAYMENT_MODE as PaymentMode) || DEFAULT_SITE_CONFIG.payment.mode,
    providerLabel: env.VITE_PAYMENT_PROVIDER_LABEL || DEFAULT_SITE_CONFIG.payment.providerLabel,
    checkoutEnabled: env.VITE_CHECKOUT_ENABLED === "true",
    successUrl: env.VITE_PAYMENT_SUCCESS_URL || DEFAULT_SITE_CONFIG.payment.successUrl,
    cancelUrl: env.VITE_PAYMENT_CANCEL_URL || DEFAULT_SITE_CONFIG.payment.cancelUrl,
  },
  plans: plansFromEnv(),
};
