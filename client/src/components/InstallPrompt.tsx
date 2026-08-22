import { useInstallPrompt } from "@/lib/use-install-prompt";
import { brand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Shield } from "lucide-react";

export function InstallPrompt() {
  const { hasInstalled, showInstallCTA, handleInstallClick } =
    useInstallPrompt();

  if (hasInstalled) {
    return null;
  }

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 font-display flex gap-3 animate-in fade-in-from-bottom duration-300">
      <div
        className="bg-ink text-white border border-white/15 rounded-xl p-4 shadow-2xl max-w-md w-full dir:max-w-none"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <Download className="w-5 h-5" />
          <div>
            <p className="font-bold text-lg">حمله تطبيق ALHUSAINIA</p>
            <p className="text-sm text-white/60">
              لتحقيق أفضل تجربة، قم بتثبيت التطبيق على سطح المكتب أو الشاشة
              الرئيسية
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
          <button
            onClick={handleInstallClick}
            className="bg-brand text-ink font-black px-4 py-2 rounded-full text-sm hover:bg-brand-deep transition-colors"
            aria-label="تثبيت التطبيق"
          >
            <span className="hidden sm:inline">تثبيت</span>
          </button>
          <button
            onClick={() => window.open(brand.contact.whatsapp, "_blank")}
            className="text-white/60 hover:text-white text-sm flex items-center gap-1"
            aria-label="فتح الواتساب"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            اتصل بنا
          </button>
        </div>
      </div>
    </div>
  );
}
