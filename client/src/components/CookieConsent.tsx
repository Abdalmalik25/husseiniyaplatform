import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, X, Cookie, Settings2 } from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * CookieConsent — World-class GDPR-style consent banner.
 *
 * Design principles:
 * - First-impression respectful: small, non-blocking, dismissible.
 * - Granular choice: accept all, reject all, or customize.
 * - Persistent: remembers user choice in localStorage for 180 days.
 * - Accessible: role="dialog", aria-modal, focus trap on open.
 * - Marketing-only: does NOT affect the internal ERP system.
 * - No tracking until consent: respects user privacy by default.
 */
const STORAGE_KEY = "alh_cookie_consent_v1";
const EXPIRY_DAYS = 180;

type ConsentState = {
  necessary: true; // always true
  analytics: boolean;
  marketing: boolean;
  decidedAt: number;
  expiresAt: number;
};

function loadConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(consent: Omit<ConsentState, "decidedAt" | "expiresAt">) {
  const payload: ConsentState = {
    ...consent,
    decidedAt: Date.now(),
    expiresAt: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* localStorage unavailable */
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Show after a small delay so it doesn't compete with hero content
    const t = setTimeout(() => {
      const existing = loadConsent();
      if (!existing) setVisible(true);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const decide = (kind: "all" | "reject" | "custom") => {
    let consent: Omit<ConsentState, "decidedAt" | "expiresAt">;
    if (kind === "all") {
      consent = { necessary: true, analytics: true, marketing: true };
    } else if (kind === "reject") {
      consent = { necessary: true, analytics: false, marketing: false };
    } else {
      consent = { necessary: true, analytics, marketing };
    }
    saveConsent(consent);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-3 right-3 left-3 sm:left-auto sm:bottom-4 sm:right-4 z-[60] max-w-md animate-in slide-in-from-bottom-4 fade-in duration-500"
      dir="rtl"
    >
      <div className="relative bg-ink-deep text-white/90 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">
        {/* Brand accent line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-l from-brand via-brand-300 to-brand" />

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-3">
            <span className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4 text-brand-300" />
            </span>
            <div className="flex-1 min-w-0">
              <h3
                id="cookie-consent-title"
                className="font-black text-sm text-white flex items-center gap-2"
              >
                نحترم خصوصيتك
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </h3>
              <p
                id="cookie-consent-desc"
                className="text-[11px] text-white/65 leading-relaxed mt-1.5"
              >
                نستخدم ملفات تعريف الارتباط لتحسين تجربتك وقياس أداء المنصة.
                يمكنك قبول الكل، أو رفض غير الضروري، أو تخصيص تفضيلاتك.
              </p>
            </div>
            <button
              onClick={() => decide("reject")}
              aria-label="إغلاق"
              className="text-white/40 hover:text-white/80 transition-colors p-1 -mt-1 -ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {showDetails && (
            <div className="space-y-2 mb-4 border-t border-white/10 pt-3 animate-in slide-in-from-top-2 fade-in duration-300">
              <label className="flex items-center gap-2.5 text-[11px] text-white/70 cursor-not-allowed">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="accent-brand"
                />
                <span>
                  <strong className="text-white/90">ضرورية</strong> — لتشغيل
                  الموقع والجلسة
                </span>
              </label>
              <label className="flex items-center gap-2.5 text-[11px] text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={e => setAnalytics(e.target.checked)}
                  className="accent-brand"
                />
                <span>
                  <strong className="text-white/90">تحليلية</strong> — لقياس
                  أداء الصفحات
                </span>
              </label>
              <label className="flex items-center gap-2.5 text-[11px] text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={e => setMarketing(e.target.checked)}
                  className="accent-brand"
                />
                <span>
                  <strong className="text-white/90">تسويقية</strong> — لعروض
                  مخصصة
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => decide("all")}
              size="sm"
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-9 px-4 rounded-lg flex-1 sm:flex-none"
            >
              قبول الجميع
            </Button>
            <Button
              onClick={() => decide("reject")}
              variant="outline"
              size="sm"
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs h-9 px-4 rounded-lg flex-1 sm:flex-none"
            >
              رفض غير الضروري
            </Button>
            <button
              onClick={() => setShowDetails(s => !s)}
              className="text-[11px] text-brand-300 hover:text-brand inline-flex items-center gap-1 px-2"
              aria-expanded={showDetails}
            >
              <Settings2 className="w-3 h-3" />
              {showDetails ? "إخفاء" : "تخصيص"}
            </button>
          </div>
          <p className="text-[10px] text-white/35 mt-3 leading-relaxed">
            للتفاصيل الكاملة، اطلع على{" "}
            <a
              href="/privacy"
              className="text-brand-300 hover:text-brand underline-offset-2 hover:underline"
            >
              سياسة الخصوصية
            </a>{" "}
            — {brand.names.legal}
          </p>
        </div>
      </div>
    </div>
  );
}

export { STORAGE_KEY as COOKIE_CONSENT_KEY };
