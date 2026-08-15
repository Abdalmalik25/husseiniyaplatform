import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div dir="rtl" className="min-h-screen w-full flex items-center justify-center bg-cream">
      <Card className="w-full max-w-lg mx-4 shadow-soft border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-copper/10 rounded-full animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-ink text-copper">
                <span className="font-display text-3xl font-bold">404</span>
              </div>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink mb-2">الصفحة غير موجودة</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">يبدو أن هذه الصفحة تمت إزالتها أو نقلها أو أن الرابط غير صحيح.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setLocation("/")} className="bg-ink text-white hover:bg-ink/90 px-6 py-2.5 rounded-full transition-all duration-200">
              <Home className="w-4 h-4 ml-2" />العودة للرئيسية
            </Button>
            <Link href="/clients">
              <Button variant="outline" className="rounded-full border-copper text-copper hover:bg-sand">
                <Search className="w-4 h-4 ml-2" />تصفح خدماتنا<ArrowLeft className="mr-2 h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6 text-xs text-slate-400">
            هل تحتاج مساعدة؟ <a href="mailto:info@alhusainia.com" className="text-copper underline">تواصل معنا</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
