import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Crown, Globe, Laptop, Monitor, RefreshCw, ServerCog, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { siteConfig } from "@/lib/siteConfig";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

const toneClass = { sand: "bg-sand", ink: "bg-ink text-white", white: "bg-white" } as const;

export default function Account() {
  const { user, loading: isLoading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/account" });
  const wallet = trpc.credits.me.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const history = trpc.credits.history.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const subscription = trpc.subscription.me.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const devices = trpc.sync.devices.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const pendingSyncs = trpc.sync.pending.useQuery({}, { enabled: Boolean(user), retry: false });
  const registerDevice = trpc.sync.registerDevice.useMutation({
    onSuccess: () => { toast.success("تم تسجيل هذا الجهاز للعمل المتزامن"); devices.refetch(); },
    onError: () => toast.error("تعذر تسجيل الجهاز"),
  });
  const updateSub = trpc.subscription.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث اشتراكك"); subscription.refetch(); },
    onError: () => toast.error("تعذر تحديث الاشتراك"),
  });

  // Register this device on mount
  useEffect(() => {
    if (!user) return;
    const platform = navigator.userAgent.includes("Android") || /iPhone|iPad|iPod/.test(navigator.userAgent) ? "mobile" : "web";
    const deviceId = `${platform}-${crypto.randomUUID()}`;
    localStorage.setItem("alhusainia-device-id", deviceId);
    localStorage.setItem("alhusainia-platform", platform);
    registerDevice.mutate({ deviceId, platform, name: navigator.platform || platform });
  }, [user]);

  const freeCredits = wallet.data?.freeCredits ?? 0;
  const paidCredits = wallet.data?.paidCredits ?? 0;

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-cream">جارٍ التحميل...</div>;

  return <div dir="rtl" className="min-h-screen bg-cream text-ink">
    <header className="border-b border-slate-200 bg-cream/90 backdrop-blur"><div className="container flex h-20 items-center justify-between"><Link href="/" className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-copper"><span className="font-display text-xl font-bold">ح</span></div><div><div className="font-display text-lg font-bold">{siteConfig.brand.arabicName} <span className="text-copper">{siteConfig.brand.commercialName}</span></div><div className="text-[10px] tracking-[0.14em] text-slate-500">حسابي</div></div></Link><div className="flex items-center gap-3"><Link href="/commerce"><Button variant="ghost" className="rounded-full">النظام التجاري</Button></Link><Link href="/"><Button variant="outline" className="rounded-full">العودة للموقع <ArrowLeft className="mr-2 h-4 w-4" /></Button></Link></div></div></header>
    <main className="container py-12">
      <section className="mx-auto max-w-4xl">
        <div className="mb-10 rounded-[2rem] bg-ink p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <Badge className="mb-3 rounded-full border-0 bg-copper/20 text-copper">حساب {siteConfig.brand.commercialName}</Badge>
              <h1 className="font-display text-3xl font-bold">مرحباً {user?.name || "بك"} 👋</h1>
              <p className="mt-2 text-white/65">إدارة رصيدك واشتراكك وأجهزتك المتزامنة في مكان واحد.</p>
            </div>
            <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-copper/20 md:flex"><Wallet className="h-8 w-8 text-copper" /></div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-5"><p className="text-sm text-white/60">الرصيد المتاح</p><b className="mt-1 block font-display text-3xl">{freeCredits + paidCredits} <span className="text-base">{siteConfig.credits.unitLabel}</span></b></div>
            <div className="rounded-2xl bg-white/10 p-5"><p className="text-sm text-white/60">رصيد مجاني</p><b className="mt-1 block font-display text-3xl text-copper">{freeCredits}</b></div>
            <div className="rounded-2xl bg-white/10 p-5"><p className="text-sm text-white/60">رصيد مدفوع</p><b className="mt-1 block font-display text-3xl">{paidCredits}</b></div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2 font-display"><Crown className="text-copper" />اشتراكي الحالي</CardTitle></CardHeader>
            <CardContent>
              <Badge className="mb-3 rounded-full bg-copper/10 text-copper">{subscription.data?.status === "active" ? "اشتراك نشط" : subscription.data?.status === "trial" ? "تجربة مجانية" : subscription.data?.status}</Badge>
              <p className="text-lg font-bold">{siteConfig.plans.find(p => p.id === subscription.data?.planId)?.name || "باقة التجربة"}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">بدأ في {subscription.data?.startedAt ? new Date(subscription.data.startedAt).toLocaleDateString("ar") : "—"}</p>
              <div className="mt-6 space-y-3">
                {siteConfig.plans.slice(1).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div><b className="text-sm">{plan.name}</b><p className="text-xs text-slate-500">{plan.creditsLabel}</p></div>
                    <Button size="sm" variant={subscription.data?.planId === plan.id ? "secondary" : "outline"} disabled={subscription.data?.planId === plan.id} onClick={() => updateSub.mutate({ planId: plan.id, status: "active" })}>{subscription.data?.planId === plan.id ? "مفعّل" : "تفعيل"}</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2 font-display"><Globe className="text-copper" />أجهزتي المتزامنة</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-600">يعمل حسابك على عدة أجهزة مع مزامنة فورية للبيانات — ويب، سطح مكتب، جوال، أو سحابي.</p>
              <div className="mt-5 space-y-3">
                {devices.data?.length ? devices.data.slice(0, 5).map((device) => (
                  <div key={device.deviceId} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      {device.platform === "desktop" ? <Monitor className="text-copper" /> : device.platform === "mobile" ? <Smartphone className="text-copper" /> : device.platform === "cloud" ? <ServerCog className="text-copper" /> : <Laptop className="text-copper" />}
                      <div><b className="text-sm">{device.name || device.platform}</b><p className="text-xs text-slate-500">آخر مزامنة: {new Date(device.lastSyncAt).toLocaleString("ar")}</p></div>
                    </div>
                    <Badge variant="outline" className="text-xs">{device.platform}</Badge>
                  </div>
                )) : <p className="text-sm text-slate-500">لم يُسجل أي جهاز بعد. سجل الجهاز الحالي لمزامنة بياناتك.</p>}
              </div>
              <Button className="mt-5 w-full bg-ink text-white" onClick={() => {
                const deviceId = localStorage.getItem("alhusainia-device-id") || `desktop-${crypto.randomUUID()}`;
                if (!localStorage.getItem("alhusainia-device-id")) localStorage.setItem("alhusainia-device-id", deviceId);
                const platform = localStorage.getItem("alhusainia-platform") || "desktop";
                registerDevice.mutate({ deviceId, platform, name: navigator.platform || "جهازي" });
              }}><RefreshCw className="ml-2 h-4 w-4" />تسجيل هذا الجهاز</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-soft">
            <CardHeader><CardTitle className="font-display">سجل الحركات</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.data?.length ? history.data.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm">
                    <div><b>{entry.type === "grant" ? "منحة تجربة مجانية" : entry.type === "consume" ? "استهلاك خدمة" : "شراء رصيد"}</b><p className="mt-1 text-xs text-slate-500">{entry.reference} · {new Date(entry.createdAt).toLocaleString("ar")}</p></div>
                    <b className={entry.amount > 0 ? "text-emerald-700" : "text-copper"}>{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</b>
                  </div>
                )) : <p className="text-sm text-slate-500">لا توجد حركات بعد.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader><CardTitle className="font-display">المزامنة السحابية</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-600">العمل سحابياً يتيح لك متابعة طلباتك وحسابك من أي جهاز — نسخة الويب أو تطبيق سطح المكتب أو الجوال.</p>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2"><Globe className="h-4 w-4 text-copper" /><span className="text-sm">نسخة الويب السحابية</span></div><Badge className="bg-emerald-600 text-white">نشطة الآن</Badge></div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2"><Monitor className="h-4 w-4 text-copper" /><span className="text-sm">تطبيق سطح المكتب</span></div><Badge variant="outline">تثبيت PWA</Badge></div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-copper" /><span className="text-sm">تطبيق الجوال</span></div><Badge variant="outline">تثبيت PWA</Badge></div>
              </div>
              <div className="mt-5 rounded-2xl bg-sand/60 p-4 text-sm leading-7 text-slate-600">
                <b className="text-ink">كيف تثبّت التطبيق؟</b><br />
                من المتصفح: افتح القائمة ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية". سيعمل التطبيق بنسخة مستقلة مع المزامنة التلقائية لحسابك.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  </div>;
}