import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Building2, CalendarCheck, CheckCircle2, FileText, GraduationCap, HardHat, Mail, Phone, Printer, Send, Settings, Sparkles, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { siteConfig } from "@/lib/siteConfig";

type Segment = "office" | "engineering" | "maintenance" | "technical" | "student";

const segments: Record<Segment, { title: string; icon: any; description: string; offers: string[]; steps: string[]; formTitle: string }> = {
  office: {
    title: "الخدمات المكتبية",
    icon: Printer,
    description: "حلول مكتبية منظمة للأفراد والشركات: إدارة مستندات، أرشفة، تقارير، ومساندة إدارية يومية ترفع الكفاءة.",
    offers: ["إدارة وأرشفة المستندات", "إعداد التقارير والمراسلات", "مساندة إدارية للشركات", "استشارات تنظيم العمل المكتبي"],
    steps: ["سجّل بياناتك", "اختر الخدمة المكتبية", "استلم المخرج الجاهز"],
    formTitle: "اطلب خدمة مكتبية",
  },
  engineering: {
    title: "الخدمات الهندسية",
    icon: HardHat,
    description: "رفع مساحي، مخططات أراضٍ، تصاميم معمارية، واستشارات هندسية من مهندسين خبراء.",
    offers: ["رفع مساحي ومخططات أراضٍ", "تصاميم معمارية وهندسية", "استشارات ومراجعات فنية", "تنسيق نطاقات التنفيذ"],
    steps: ["سجّل بياناتك", "حدد الخدمة الهندسية", "احصل على المخطط والاستشارة"],
    formTitle: "اطلب خدمة هندسية",
  },
  maintenance: {
    title: "الصيانة والتشغيل",
    icon: Wrench,
    description: "خدمات صيانة وتشغيل للمنشآت والمباني والمعدات مع عقود صيانة دورية مرنة.",
    offers: ["عقود صيانة دورية", "صيانة المباني والمنشآت", "تشغيل وصيانة المعدات", "متابعة فنية ميدانية"],
    steps: ["سجّل بياناتك", "حدد نطاق الصيانة", "استلم عقد الصيانة"],
    formTitle: "اطلب خدمة صيانة",
  },
  technical: {
    title: "الخدمات التقنية",
    icon: Settings,
    description: "حلول تقنية للأعمال: تطوير مواقع، أنظمة إدارة، دعم فني، وأتمتة العمليات.",
    offers: ["تطوير مواقع وأنظمة", "حلول أتمتة الأعمال", "دعم فني ومتابعة", "استشارات تقنية"],
    steps: ["سجّل بياناتك", "حدد الاحتياج التقني", "استلم الحل التقني"],
    formTitle: "اطلب خدمة تقنية",
  },
  student: {
    title: "الخدمات الطلابية",
    icon: GraduationCap,
    description: "خدمات مخصصة للطلاب: طباعة، إخراج، أبحاث، وتوثيق أكاديمي بجودة عالية وأسعار مناسبة.",
    offers: ["طباعة وإخراج الأبحاث", "توثيق وتنسيق المستندات", "دعم في إعداد التقارير", "باقات طلابية مرنة"],
    steps: ["سجّل بياناتك", "اختر الخدمة الطلابية", "استلم عملك جاهزاً"],
    formTitle: "اطلب خدمة طلابية",
  },
};

function SegmentForm({ segment, onDone }: { segment: Segment; onDone: () => void }) {
  const mutation = trpc.requests.service.useMutation({ onSuccess: () => { toast.success(`تم استلام طلبك — سيتواصل معك فريق ${siteConfig.brand.commercialName} قريباً.`); onDone(); }, onError: () => toast.error("تعذر إرسال الطلب") });
  const [form, setForm] = useState({ name: "", phone: "", email: "", details: "" });
  return <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, serviceType: segments[segment].title }); }}>
    <Input required placeholder="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
    <Input required placeholder="رقم الجوال" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
    <Input type="email" placeholder="البريد الإلكتروني (اختياري)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
    <Textarea required placeholder="اذكر تفاصيل طلبك..." value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
    <Button disabled={mutation.isPending} className="w-full rounded-full bg-ink text-white hover:bg-ink/90">{mutation.isPending ? "جارٍ الإرسال..." : "إرسال الطلب"}<Send className="mr-2 h-4 w-4" /></Button>
  </form>;
}

export default function Clients() {
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return <div dir="rtl" className="min-h-screen bg-cream text-ink">
    <header className="border-b border-slate-200 bg-cream/90 backdrop-blur"><div className="container flex h-20 items-center justify-between">
      <Link href="/" className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-copper"><span className="font-display text-xl font-bold">ح</span></div><div><div className="font-display text-lg font-bold">{siteConfig.brand.arabicName} <span className="text-copper">{siteConfig.brand.commercialName}</span></div><div className="text-[10px] tracking-[0.14em] text-slate-500">خدمات العملاء</div></div></Link>
      <button className="rounded-lg p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="فتح القائمة">{menuOpen ? <X /> : <span className="text-sm">☰</span>}</button>
      <nav className={`${menuOpen ? "absolute inset-x-4 top-20 flex" : "hidden"} flex-col gap-4 rounded-2xl border border-slate-200 bg-cream p-5 text-sm font-semibold shadow-xl md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
        <Link href="/credits" className="hover:text-copper">الأرصدة والباقات</Link>
        <Link href="/account" className="hover:text-copper">حسابي</Link>
        <Link href="/" className="rounded-full bg-ink px-5 py-2 text-white">الموقع الرئيسي</Link>
      </nav>
    </div></header>

    <main className="container py-14">
      <section className="mx-auto max-w-4xl text-center">
        <Badge className="mb-5 rounded-full border-0 bg-sand px-4 py-2 text-copper">بوابة العملاء</Badge>
        <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">خدمات مخصصة لكل عميل.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-9 text-slate-600">اختر الفئة التي تناسب احتياجك — مكتبية، هندسية، صيانة، تقنية، أو طلابية — وسجّل بياناتك وسنبدأ فوراً.</p>
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(segments) as Segment[]).map((key) => {
          const seg = segments[key];
          const Icon = seg.icon;
          return <Card key={key} className="border-0 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="p-7">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-copper"><Icon className="h-7 w-7" /></div>
              <h3 className="font-display text-2xl font-bold">{seg.title}</h3>
              <p className="mt-3 min-h-20 text-sm leading-7 text-slate-600">{seg.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">{seg.offers.map((offer) => <li key={offer} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-copper" />{offer}</li>)}</ul>
              <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                <div className="flex flex-wrap gap-1">{seg.steps.map((step, i) => <span key={step} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">{i + 1}. {step}</span>)}</div>
                <Button size="sm" className="rounded-full bg-copper text-white" onClick={() => setActiveSegment(key)}>اطلب الآن</Button>
              </div>
            </CardContent>
          </Card>;
        })}
      </section>

      <section className="mx-auto mt-16 max-w-4xl rounded-[2rem] bg-ink p-10 text-white md:p-14">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-3 text-sm font-bold tracking-[0.18em] text-copper">لماذا تبدأ معنا؟</div>
            <h2 className="font-display text-3xl font-bold leading-tight">مسار بسيط من الطلب إلى الإنجاز.</h2>
            <p className="mt-4 leading-8 text-white/65">نسجّل بياناتك مرة واحدة، ونبقى معك حتى تستلم النتيجة. نساعدك بحسب نوع عملك: فرد، شركة صغيرة، مؤسسة، أو مشروع طلابي.</p>
            <div className="mt-6 space-y-3 text-sm text-white/75">
              <div className="flex items-center gap-3"><CheckCircle2 className="text-copper" />استجابة سريعة لكل طلب</div>
              <div className="flex items-center gap-3"><CheckCircle2 className="text-copper" />رصيد مجاني للبدء</div>
              <div className="flex items-center gap-3"><CheckCircle2 className="text-copper" />متابعة واضحة عبر حسابك</div>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-7 text-ink shadow-2xl">
            <h3 className="font-display text-xl font-bold">تواصل مباشر</h3>
            <p className="mt-2 text-sm text-slate-500">اترك رسالتك وسنتواصل معك في أقرب وقت.</p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><Phone className="text-copper" />فريق الاستقبال متاح</div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><Mail className="text-copper" />نستقبل استفساراتك بالعربية</div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><CalendarCheck className="text-copper" />حجز موعد عبر الموقع</div>
            </div>
            <Link href="/credits"><Button className="mt-6 w-full rounded-full bg-copper text-white">ابدأ برصيدك المجاني <ArrowLeft className="mr-2 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>
    </main>

    <footer className="bg-[#091719] py-8 text-white"><div className="container flex flex-col items-center justify-between gap-4 text-center text-sm text-white/60 md:flex-row md:text-right"><div><span className="font-display font-bold text-white">الحسينية | ALHUSAINIA</span><span className="mr-3">{siteConfig.brand.englishName}</span></div><div className="flex items-center gap-5"><Link href="/admin" className="hover:text-copper">لوحة الإدارة</Link><span>© 2026 جميع الحقوق محفوظة</span></div></div></footer>

    {activeSegment && <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-4" onClick={() => setActiveSegment(null)}><div className="w-full max-w-lg rounded-3xl bg-cream p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="mb-5 flex items-start justify-between"><div><div className="text-sm font-bold text-copper">{segments[activeSegment].formTitle}</div><h3 className="mt-1 font-display text-2xl font-bold">{segments[activeSegment].title}</h3></div><button onClick={() => setActiveSegment(null)} aria-label="إغلاق"><X /></button></div><SegmentForm segment={activeSegment} onDone={() => setActiveSegment(null)} /></div></div>}
  </div>;
}