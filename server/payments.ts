import { DEFAULT_SITE_CONFIG, type PaymentMode } from "../shared/config";

export type CheckoutResult =
  | { status: "disabled"; message: string }
  | { status: "manual"; message: string; provider: string }
  | { status: "unavailable"; message: string; provider: string }
  | { status: "ready"; provider: string; successUrl: string; cancelUrl: string; planId: string; message: string };

function resolveMode(value: unknown = process.env.PAYMENT_MODE): PaymentMode {
  return value === "stripe" || value === "manual" ? value : DEFAULT_SITE_CONFIG.payment.mode;
}

export function createCheckoutRequest(planId: string): CheckoutResult {
  const mode = resolveMode();
  const provider = process.env.PAYMENT_PROVIDER_LABEL || DEFAULT_SITE_CONFIG.payment.providerLabel;
  const successUrl = process.env.PAYMENT_SUCCESS_URL || DEFAULT_SITE_CONFIG.payment.successUrl;
  const cancelUrl = process.env.PAYMENT_CANCEL_URL || DEFAULT_SITE_CONFIG.payment.cancelUrl;

  if (mode === "disabled") return { status: "disabled", message: "الدفع غير مفعّل حالياً." };
  if (mode === "manual") return { status: "manual", provider, message: `سيتم التواصل لإتمام الدفع عبر ${provider}.` };
  if (!process.env.STRIPE_SECRET_KEY) return { status: "unavailable", provider, message: "مفتاح مزوّد الدفع غير متاح بعد." };

  return { status: "ready", provider, successUrl, cancelUrl, planId, message: "تم تجهيز طلب الترقية، وسيُفتح الدفع عند تفعيل الموصل." };
}
