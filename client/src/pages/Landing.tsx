import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Building2, BookOpen, Layers, ShieldCheck, CheckCircle2, HardHat, Calculator, Users, BarChart3, Cpu, Award } from "lucide-react";
import { brand, whatsappLink } from "@/lib/brand";
import { SiteFooter } from "@/components/SiteFooter";

export default function Landing() {
  const [, setLocation] = useLocation();
  return (
    <div className="bg-white text-ink" dir="rtl">
      {/* 1. Welcome/Hero — يجيب فورا: من نحن/ماذا/لمن/قيمة */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-l from-brand/15 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 py-14 lg:py-20">
          <div className="max-w-3xl space-y-5">
            <Badge className="bg-white/10 text-white border-white/20">مؤسسة الحسينية لخدمات الأعمال — منذ 2018</Badge>
            <h1 className="text-3xl lg:text-5xl font-black leading-tight text-balance">
              شريك نموك <span className="text-brand-300">من الفكرة إلى الأثر</span>
            </h1>
            <p className="text-base lg:text-lg text-white/70 leading-relaxed">
              نحن شركة خدمات أعمال متكاملة. نخدم <strong className="text-white">المقاول وصاحب الأرض، التاجر وصاحب المتجر، الطالب والباحث</strong> — بحلول واضحة: استشارات مؤسسية، هندسية، ومعرفية. ومن منتجاتنا الرقمية منصة <strong className="text-brand-300">Uamex ERP</strong> لإدارة المحاسبة والتجارة والمخزون.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => document.getElementById("solutions")?.scrollIntoView({ behavior: "smooth" })} className="bg-brand hover:bg-brand-deep text-ink-deep font-black h-11 px-7">استكشف حلولنا</Button>
              <Button variant="outline" onClick={() => setLocation("/login")} className="h-11 px-7 bg-white/5 border-white/20 text-white hover:bg-white/10">دخول النظام</Button>
              <Button variant="outline" onClick={() => setLocation("/login")} className="h-11 px-7 bg-transparent border-white/20 text-white/80 hover:text-white">سجل منشأتك</Button>
            </div>
            <p className="text-xs text-white/50">شركة: الحسينية لخدمات الأعمال — منتج رقمي: Uamex ERP (أحد حلولنا)</p>
          </div>
        </div>
      </section>

      {/* 2. تعريف الشركة وقيمتها */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <Badge variant="outline" className="border-slate-200">من نحن</Badge>
          <h2 className="text-2xl lg:text-3xl font-black">شركة تضع القرار أمامك — لا التوقع</h2>
          <p className="text-sm text-slate-600 leading-relaxed">نبني هياكل واضحة، ودلائل إجراءات، وأرقاما قابلة للمراجعة. هدفنا قرار يبنى على بيان، لا على انطباع.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50">
            <Building2 className="w-6 h-6 text-brand mb-3" />
            <h3 className="font-black">الرؤية</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">أن نكون الشريك الاستراتيجي للمؤسسات العربية في التحول إلى عمل منظم وآمن وقابل للنمو.</p>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
            <Layers className="w-6 h-6 text-brand mb-3" />
            <h3 className="font-black">الرسالة</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">تمكين المؤسسات عبر منظومة واحدة تدير الحسابات والمشاريع والموارد بمرونة وشفافية.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <Award className="w-6 h-6 text-brand mb-3" />
            <h3 className="font-black">قيمنا</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">تميز — موثوقية — ابتكار — شراكة. تفاصيل صغيرة تصنع فارقا كبيرا.</p>
          </div>
        </div>
      </section>

      {/* 3. الحلول والخدمات */}
      <section id="solutions" className="bg-slate-50 border-y border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge className="bg-slate-900 text-white">الحلول والخدمات</Badge>
            <h2 className="text-2xl lg:text-3xl font-black">ثلاثة مسارات — حل واحد متكامل</h2>
            <p className="text-sm text-slate-600">اختر مسارك — نحن نربط الباقي ببعضه.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <Building2 className="w-8 h-8 text-brand mb-3" />
              <h3 className="font-black">الاستشارات المؤسسية</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">هياكل تنظيمية، أدلة إجراءات، مؤشرات أداء، وحوكمة قرار ببيان لا بتوقع.</p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> تحليل قوائم وميزانيات تقديرية</li>
                <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> مصفوفة صلاحيات واضحة</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <HardHat className="w-8 h-8 text-brand mb-3" />
              <h3 className="font-black">الهندسة والمساحة</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">مخططات تنفيذية، رفع مساحي دقيق، جداول كميات BOQ وحساب حفر وردم.</p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Shop Drawings و BIM</li>
                <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> GPS/درون بدقة عالية</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <BookOpen className="w-8 h-8 text-brand mb-3" />
              <h3 className="font-black">الخدمات المعرفية</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">تنسيق أبحاث، تحليل SPSS، طباعة وتجليد بمعايير الجامعات.</p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> APA 7th وتوثيق مراجع</li>
                <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> صيانة أجهزة محمولة وحواسيب</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Uamex ERP كمنتج رئيسي — مفصول بصريا */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="rounded-3xl bg-slate-900 text-white p-8 lg:p-10 flex flex-col lg:flex-row gap-8 items-center">
          <div className="flex-1 space-y-3">
            <Badge className="bg-white/10 text-brand-300 border-white/20">منتج رقمي من الحسينية — Uamex ERP</Badge>
            <h2 className="text-2xl lg:text-3xl font-black">منصة تشغيل — لا مجرد برنامج محاسبة</h2>
            <p className="text-sm text-white/70 leading-relaxed">Uamex ERP هو أحد منتجاتنا الرقمية لإدارة المحاسبة والمبيعات والمخزون والموارد. يعمل بمعايير محاسبية واضحة، مع صلاحيات محكمة وسجل تدقيق.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => setLocation("/login")} className="bg-brand text-ink-deep font-black">جرّب Uamex ERP</Button>
              <Button variant="outline" onClick={() => setLocation("/pricing")} className="border-white/20 text-white bg-white/5">الأسعار</Button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 w-full">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4"><Cpu className="w-5 h-5 text-brand-300 mb-2" /><p className="text-xs font-bold">وضوح مالي يومي</p><p className="text-[11px] text-white/50">تعرف ربحك وسيولتك كل صباح</p></div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4"><BarChart3 className="w-5 h-5 text-brand-300 mb-2" /><p className="text-xs font-bold">تقارير وقوائم</p><p className="text-[11px] text-white/50">حتى تاريخ مع مقارنة</p></div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4"><ShieldCheck className="w-5 h-5 text-brand-300 mb-2" /><p className="text-xs font-bold">صلاحيات ومراجعة</p><p className="text-[11px] text-white/50">اعتماد بثلاث مستويات</p></div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4"><Calculator className="w-5 h-5 text-brand-300 mb-2" /><p className="text-xs font-bold">بدون إنترنت</p><p className="text-[11px] text-white/50">يعمل ويزامن لاحقا</p></div>
          </div>
        </div>
      </section>

      {/* 5. المزايا والقطاعات */}
      <section className="bg-white border-y border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-center font-black text-xl">حل لكل قطاع — لا قالب واحد</h2>
          <div className="grid md:grid-cols-3 gap-3 mt-6">
            {brand.industrySolutions.sectors.slice(0, 6).map(s => (
              <div key={s.key} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-black">{s.name}</p>
                <p className="text-[11px] text-slate-500 mt-1">{s.headline}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. الثقة */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
          <h3 className="font-black flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> ثقة تبنى ببيان</h3>
          <div className="grid md:grid-cols-3 gap-2 mt-4 text-xs">
            {brand.trustBadges.map(b => (
              <div key={b} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{b}</div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. الأسعار/التواصل + CTA نهائي */}
      <section className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <h2 className="text-2xl font-black">جاهز لتنظيم عملك؟</h2>
          <p className="text-sm text-white/60">ابدأ بتجربة 14 يوما — بدون بطاقة — أو تحدث معنا.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => setLocation("/pricing")} className="bg-white text-slate-900 font-black h-11 px-7">الأسعار</Button>
            <a href={whatsappLink("السلام عليكم، أود الاستفسار عن خدمات الحسينية")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-11 px-7 rounded-xl bg-brand text-ink-deep font-black">تواصل واتساب</a>
            <Button variant="outline" onClick={() => setLocation("/login")} className="h-11 px-7 border-white/20 text-white bg-white/5">دخول النظام</Button>
          </div>
        </div>
      </section>

      {/* FAQ مختصر */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <h3 className="font-black text-center mb-4">أسئلة شائعة</h3>
        <Accordion type="single" collapsible>
          {brand.faq.slice(0, 4).map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`}><AccordionTrigger className="text-sm font-bold text-right">{f.q}</AccordionTrigger><AccordionContent className="text-xs text-slate-600 leading-relaxed">{f.a}</AccordionContent></AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
