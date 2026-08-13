import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/lib/siteConfig";

export default function Auth() {
  useEffect(() => {
    window.location.href = "/api/oauth/login";
  }, []);

  return <div dir="rtl" className="grid min-h-screen place-items-center bg-cream p-6">
    <Card className="max-w-md border-0 shadow-soft">
      <CardContent className="p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-copper">
          <span className="font-display text-2xl font-bold">ح</span>
        </div>
        <h1 className="font-display text-2xl font-bold">تسجيل الدخول</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          جارٍ تحويلك إلى بوابة المصادقة الآمنة...
        </p>
        <Button 
          className="mt-6 bg-ink text-white" 
          onClick={() => window.location.href = "/api/oauth/login"}
        >
          متابعة تسجيل الدخول
        </Button>
      </CardContent>
    </Card>
  </div>;
}