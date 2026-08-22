import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { goLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/BrandLogo";
import { Building2, Lock, ShieldCheck, Zap } from "lucide-react";

/**
 * RequireAuth — route-level access gate for operational pages.
 *
 * Visitors (no session) see a branded login prompt instead of the page
 * shell, so no business UI, tools, or buttons leak to unauthenticated
 * users. Server-side tRPC procedures remain the authoritative guard;
 * this component only improves UX and hides the interface.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#0d1b1c] flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="text-center space-y-3">
          <BrandMark size={56} className="rounded-2xl shadow-lg mx-auto" />
          <p className="text-xs text-slate-400 font-bold">
            جاري التحقق من الجلسة…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen bg-[#0d1b1c] flex flex-col items-center justify-center p-4 text-white"
        dir="rtl"
      >
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="bg-[#b87945] text-[#102a2b] w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-bold shadow-lg">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display">
              ALHUSAINIA | منطقة مشغّلين محمية
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              مؤسسة الحسينية لخدمات الأعمال
            </p>
          </div>

          <Card className="bg-[#162e30] border-[#1e3a3c] text-white p-6 space-y-4 shadow-xl text-right">
            <div className="flex items-center gap-2 text-xs font-bold text-[#d4a574]">
              <Lock className="w-4 h-4" />
              هذه الصفحة تتطلب تسجيل دخول واشتراكاً مفعّلاً
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              الوظائف التشغيلية (المحاسبة، التجارة، التقارير، الإعدادات، ووحدات
              التشغيل) متاحة للمشتركين المسجلين فقط — بياناتك معزولة ومحمية
              بجلسة مشفرة.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                جلسة آمنة عبر بوابة الدخول الموحدة
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                فترة تجريبية مجانية 14 يوماً بدون بطاقة ائتمان
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                عزل كامل لبيانات كل مؤسسة ومستخدم
              </li>
            </ul>
            <Button
              onClick={() => goLogin()}
              className="w-full bg-[#b87945] hover:bg-[#a06838] text-[#102a2b] text-xs h-10 font-bold"
            >
              <Zap className="w-4 h-4 fill-current" />
              تسجيل الدخول أو تفعيل التجربة المجانية
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
