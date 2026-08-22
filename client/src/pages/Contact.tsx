import { useState } from "react";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { brand, whatsappLink } from "@/lib/brand";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  Clock,
} from "lucide-react";

export default function Contact() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      toast.error("يرجى تعبئة الاسم ورقم الهاتف والرسالة");
      return;
    }
    toast.success("تم استلام رسالتك — سيتواصل معك أحد خبرائنا قريباً");
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
  };

  const channels = [
    {
      icon: MessageSquare,
      title: "واتساب",
      value: brand.contact.whatsapp,
      href: whatsappLink(
        `السلام عليكم ${brand.names.legalFull}، أود الاستفسار عن خدماتكم.`
      ),
      cta: "راسلنا الآن",
    },
    {
      icon: Phone,
      title: "الهاتف",
      value: brand.contact.phone,
      href: `tel:${brand.contact.phone.replace(/\s/g, "")}`,
      cta: "اتصل بنا",
    },
    {
      icon: Mail,
      title: "البريد الإلكتروني",
      value: brand.contact.email,
      href: `mailto:${brand.contact.email}`,
      cta: "أرسل بريداً",
    },
    {
      icon: MapPin,
      title: "العنوان",
      value: brand.contact.address,
      href: undefined,
      cta: undefined,
    },
  ];

  return (
    <div
      className="min-h-screen bg-sand text-ink dark:bg-background dark:text-foreground font-display"
      dir="rtl"
    >
      <HeaderNavbar />

      {/* Hero */}
      <section className="relative text-white py-20 px-4 overflow-hidden border-b border-white/10 bg-ink">
        <div className="max-w-5xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur border border-brand/50 text-brand-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
            <Phone className="w-4 h-4 text-brand" />
            تواصل معنا
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-tight text-balance">
            فريق خبراء الحسينية في خدمتك
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-lg text-white/70 leading-relaxed font-light">
            سواء كنت مقاولاً، مهندساً، طالباً، أو صاحب مؤسسة — نرد على استفساراتك
            ونوجّهك للحل المناسب خلال دقائق.
          </p>
        </div>
      </section>

      {/* Channels */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {channels.map((c, i) => {
            const Icon = c.icon;
            const body = (
              <Card className="surface rounded-2xl p-5 hover:-translate-y-1 hover:shadow-xl transition-all h-full">
                <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-[11px] font-bold text-muted-foreground mb-1">
                  {c.title}
                </p>
                <p className="text-sm font-bold text-foreground leading-snug">
                  {c.value}
                </p>
                {c.cta && (
                  <p className="text-[11px] text-brand-300 mt-2 font-medium">
                    {c.cta}
                  </p>
                )}
              </Card>
            );
            return c.href ? (
              <a
                key={i}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener"
                className="block"
              >
                {body}
              </a>
            ) : (
              <div key={i}>{body}</div>
            );
          })}
        </div>

        {/* Form + working hours */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-1">
                أرسل رسالتك
              </h2>
              <p className="text-xs text-muted-foreground mb-5">
                سنعاود الاتصال بك في أقرب وقت ممكن.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">الاسم الكامل *</Label>
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="مثال: المهندس محمد علي"
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">رقم الهاتف *</Label>
                    <Input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      dir="ltr"
                      placeholder="770000000"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">البريد الإلكتروني</Label>
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    dir="ltr"
                    placeholder="name@company.com"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">رسالتك *</Label>
                  <Textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="كيف يمكن للحسينية مساعدة مؤسستك؟"
                    className="min-h-28 text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-brand hover:bg-brand-deep text-ink font-bold gap-2"
                >
                  <Send className="w-4 h-4" />
                  إرسال الرسالة
                </Button>
              </form>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-3xl border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-3 text-brand">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-foreground text-sm">
                  ساعات العمل
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex justify-between">
                  <span>الأحد — الخميس</span>
                  <span className="font-bold text-foreground">
                    8 ص — 6 م
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>الجمعة</span>
                  <span className="font-bold text-foreground">مغلق</span>
                </li>
                <li className="flex justify-between">
                  <span>السبت</span>
                  <span className="font-bold text-foreground">10 ص — 4 م</span>
                </li>
                <li className="pt-2 mt-2 border-t border-border text-[11px]">
                  دعم الواتساب متاح 24/7 لجميع العملاء.
                </li>
              </ul>
            </Card>
            <Card className="rounded-3xl border-border bg-ink text-white p-6">
              <p className="text-xs text-white/70 leading-relaxed">
                تفضّل التواصل المباشر عبر الواتساب للحصول على استشارة فورية من
                فريقنا الهندسي والمحاسبي.
              </p>
              <Button
                onClick={() =>
                  window.open(
                    whatsappLink(
                      `السلام عليكم ${brand.names.legalFull}، أود استشارة سريعة.`
                    ),
                    "_blank"
                  )
                }
                className="w-full mt-4 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold h-10 gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                محادثة واتساب
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
