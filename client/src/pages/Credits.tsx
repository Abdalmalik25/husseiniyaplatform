import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/lib/siteConfig";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, Crown, Globe, Gift, Monitor, Smartphone, Sparkles, Wallet } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

const toneClass = { sand: "bg-sand", ink: "bg-ink text-white", white: "bg-white" } as const;
type CheckoutState = { status: "disabled" | "manual" | "unavailable" | "ready"; message: string; provider?: string; successUrl?: string; cancelUrl?: string; planId?: string };

export default function Credits() {
  const { user } = useAuth();
  const wallet = trpc.credits.me.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const history = trpc.credits.history.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const subscription = trpc.subscription.me.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const freeCredits = wallet.data?.freeCredits ?? 0;
  const paidCredits = wallet.data?.paidCredits ?? 0;
  const [checkoutResult, setCheckoutResult] = useState<CheckoutState | null>(null);
  const checkout = trpc.credits.checkout.useMutation({
    onSuccess: (result) => { setCheckoutResult(result); toast(result.message); },
    onError: (error) => toast.error(error.message),
  });
  const requestCheckout = (planId: string) => {
    if (!user) return startLogin();
    checkout.mutate({ planId });
  };

  return <div dir="rtl" className="min-h-screen bg-cream text-ink">
    <header className="border-b border-slate-200 bg-cream/90 backdrop-blur"><div className="container flex h-20 items-center justify-between"><Link href="/" className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-copper"><span className="font-display text-xl font-bold">ح</span></div><div><div className="font-display text-lg font-bold">{siteConfig.brand.arabicName} <span className="text-copper">{siteConfig.brand.commercialName}</span></div><div className="text-[10px] tracking-[0.14em] text-slate-500">{siteConfig.brand.englishName}</div></div></Link><div className="flex items-center gap-3"><Link href="/account"><Button variant="ghost" className="rounded-full">حسابي</Button></Link><Link href="/"><Button variant="outline" className="rounded-full">العودة للموقع <ArrowLeft className="mr-2 h-4 w-4" /></Button></Link></div></div></header>
    <main className="container py-16">
      <section className="mx-auto max-w-3xl text-center"><div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-copper shadow-lg"><Wallet /></div><p className="text-sm font-semibold tracking-[0.16em] text-copper">نظام الرصيد الذكي</p><h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">ابدأ مجاناً، ووسّع عملك عندما تكون جاهزاً.</h1><p className="mt-5 text-lg leading-9 text-slate-600">رصيد بسيط لتجربة خدمات {siteConfig.brand.commercialName}، ثم باقات مرنة للأفراد والأعمال والمؤسسات. لا ندفعك إلى الاشتراك قبل أن ترى القيمة.</p></section>
      <section className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3 text-sm">
        <Badge className="rounded-full border-0 bg-emerald-600/10 px-4 py-2 text-emerald-700"><Globe className="ml-1 h-3 w-3" /> مزامنة سحابية متعددة الأجهزة</Badge>
        <Badge className="rounded-full border-0 bg-sand px-4 py-2 text-copper"><Monitor className="ml-1 h-3 w-3" /> تطبيق سطح مكتب PWA</Badge>
        <Badge className="rounded-full border-0 bg-sand px-4 py-2 text-copper"><Smartphone className="ml-1 h-3 w-3" /> تطبيق جوال PWA</Badge>
        <Badge className="rounded-full border-0 bg-ink px-4 py-2 text-white">{subscription.data?.status === "active" ? "اشتراك نشط" : subscription.data?.status === "trial" ? "تجربة مجانية" : "اشتراك مرن"}</Badge>
      </section>
      <section className="mx-auto mt-12 max-w-4xl rounded-[2rem] bg-ink p-7 text-white shadow-2xl md:p-10"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-center"><div><div className="flex items-center gap-2 text-copper"><Gift className="h-5 w-5" /> رصيدك التجريبي</div><h2 className="mt-3 font-display text-3xl font-bold">{user ? `${freeCredits + paidCredits} ${siteConfig.credits.unitLabel} متاح` : `${siteConfig.credits.trialAmount} ${siteConfig.credits.unitLabel} مجانية`}</h2><p className="mt-2 max-w-xl leading-7 text-white/65">كل {siteConfig.credits.unitLabel} يتيح لك بدء {siteConfig.credits.consumptionLabel}. {user ? `المجاني: ${freeCredits} · المدفوع: ${paidCredits}` : "سجّل الدخول لتفعيل رصيدك وربطه بحسابك."}</p></div>{user ? <Button onClick={() => requestCheckout("business")} disabled={checkout.isPending} className="rounded-full bg-copper text-white hover:bg-copper/90">{checkout.isPending ? "جارٍ تجهيز الطلب..." : siteConfig.payment.checkoutEnabled ? "الترقية الآن" : "استعرض مسار الترقية"}</Button> : <Button onClick={startLogin} className="rounded-full bg-copper text-white hover:bg-copper/90">فعّل رصيدك المجاني <ArrowLeft className="mr-2 h-4 w-4" /></Button>}</div></section>
      {checkoutResult && <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-copper/30 bg-white p-6 shadow-soft"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-semibold text-copper">حالة الترقية: {checkoutResult.status === "ready" ? "جاهزة" : checkoutResult.status === "manual" ? "تحويل يدوي" : checkoutResult.status === "unavailable" ? "بانتظار الإعداد" : "غير مفعّلة"}</p><p className="mt-2 leading-7 text-slate-600">{checkoutResult.message}</p></div>{checkoutResult.status === "ready" && checkoutResult.successUrl && checkoutResult.cancelUrl && <div className="flex gap-2"><a href={checkoutResult.successUrl} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">متابعة العملية</a><a href={checkoutResult.cancelUrl} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">إلغاء</a></div>}</div></section>}
      <section className="mt-14 grid gap-5 lg:grid-cols-3">{siteConfig.plans.map((plan, index) => <Card key={plan.id} className={`border-0 shadow-soft ${toneClass[plan.tone]}`}><CardHeader><div className="flex items-center justify-between"><CardTitle className="font-display text-2xl">{plan.name}</CardTitle>{index === 1 ? <Crown className="text-copper" /> : <Sparkles className="text-copper" />}</div><p className={`mt-3 text-3xl font-bold ${index === 1 ? "text-copper" : "text-ink"}`}>{plan.priceLabel}</p><p className={`text-sm leading-7 ${index === 1 ? "text-white/65" : "text-slate-600"}`}>{plan.description}</p></CardHeader><CardContent><div className="mb-5 rounded-2xl bg-white/10 p-4 font-semibold">{plan.creditsLabel}</div><ul className={`space-y-3 text-sm ${index === 1 ? "text-white/80" : "text-slate-600"}`}>{plan.features.map((feature) => <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 text-copper" />{feature}</li>)}</ul><Button onClick={() => index === 0 ? (user ? toast("رصيد التجربة مرتبط بحسابك") : startLogin()) : requestCheckout(plan.id)} disabled={checkout.isPending} variant={index === 1 ? "secondary" : "outline"} className="mt-7 w-full rounded-full">{index === 0 ? "ابدأ بالتجربة" : "اطلب هذه الباقة"}</Button></CardContent></Card>)}</section>
      {user && <section className="mx-auto mt-14 max-w-3xl rounded-3xl border border-slate-200 bg-white p-7 shadow-soft"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold">سجل الرصيد</h2><span className="text-xs text-slate-500">شفافية كاملة في الاستخدام</span></div><div className="mt-5 space-y-3">{history.data?.length ? history.data.slice(0, 6).map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm"><span>{entry.type === "grant" ? "منحة تجربة مجانية" : entry.type === "consume" ? "استهلاك خدمة" : "شراء رصيد"}</span><b className={entry.amount > 0 ? "text-emerald-700" : "text-copper"}>{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</b></div>) : <p className="text-sm text-slate-500">سيظهر سجل الاستخدام هنا بعد أول حركة على الحساب.</p>}</div></section>}
      <section className="mx-auto mt-14 max-w-3xl rounded-3xl border border-copper/20 bg-sand/50 p-7 text-center"><h2 className="font-display text-2xl font-bold">دفع آمن قابل للتهيئة</h2><p className="mt-3 leading-8 text-slate-600">وضع الدفع الحالي: {siteConfig.payment.mode === "disabled" ? "غير مفعّل" : siteConfig.payment.mode === "manual" ? "يدوي" : siteConfig.payment.providerLabel}. يمكن تغيير المزوّد والوضع والرسائل من إعدادات التشغيل دون تعديل الواجهة.</p></section>
    </main>
  </div>;
}
