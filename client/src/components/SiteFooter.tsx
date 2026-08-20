import React from "react";
import { useLocation } from "wouter";
import { BrandLogo } from "@/components/BrandLogo";
import { brand, whatsappLink } from "@/lib/brand";
import {
  Building2,
  HardHat,
  ShoppingCart,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Github,
  Globe,
  ShieldCheck,
  Layers,
} from "lucide-react";

const footerNav = [
  {
    title: "المنظومة",
    icon: Layers,
    links: [
      { label: "الرئيسية والتسويق", path: "/" },
      { label: "مساحات العمل", path: "/app" },
      { label: "التعريف بالخدمات", path: "/about" },
      { label: "بوابة التتبع", path: "/portal" },
      { label: "مركز التكامل", path: "/integrate" },
    ],
  },
  {
    title: "الوحدات",
    icon: Building2,
    links: [
      { label: "النظام المحاسبي", path: "/app" },
      { label: "الاستشارات الهندسية", path: "/about" },
      { label: "العمليات التجارية", path: "/commercial" },
      { label: "مكتبة الحسينية", path: "/store" },
      { label: "المتجر الإلكتروني", path: "/store" },
    ],
  },
  {
    title: "الموارد",
    icon: ShieldCheck,
    links: [
      { label: "تحميل التطبيق", path: "/download" },
      { label: "التقارير المالية", path: "/reports" },
      { label: "إعدادات المؤسسة", path: "/settings" },
      { label: "الدعم الفني", path: "/portal" },
    ],
  },
];

export function SiteFooter() {
  const [, setLocation] = useLocation();
  return (
    <footer
      className="bg-ink text-white/70 border-t border-white/10 pt-14 pb-8 font-display"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Brand column */}
        <div className="md:col-span-4 space-y-4">
          <div className="cursor-pointer" onClick={() => setLocation("/")}>
            <BrandLogo size={42} />
          </div>
          <p className="text-xs sm:text-sm text-white/60 leading-relaxed text-pretty max-w-sm">
            {brand.promise}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={whatsappLink(
                `السلام عليكم ${brand.names.legalFull}، أود الاستفسار عن خدماتكم.`
              )}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-deep text-ink text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> تواصل واتساب
            </a>
            <a
              href="https://github.com/alhusainia/husseiniya-platform"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] px-3 py-1.5 rounded-full transition-colors"
            >
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
            <a
              href={brand.contact.website}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] px-3 py-1.5 rounded-full transition-colors"
            >
              <Globe className="w-3.5 h-3.5" /> الموقع الرسمي
            </a>
          </div>
        </div>

        {/* Nav columns */}
        {footerNav.map(col => {
          const Icon = col.icon;
          return (
            <div key={col.title} className="md:col-span-2">
              <h4 className="text-[13px] font-bold text-white flex items-center gap-1.5 mb-3">
                <Icon className="w-4 h-4 text-brand-300" />
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l, i) => (
                  <li key={`${l.path}-${i}`}>
                    <button
                      onClick={() => setLocation(l.path)}
                      className="text-xs text-white/55 hover:text-brand-300 transition-colors text-right"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Contact column */}
        <div className="md:col-span-2 space-y-3">
          <h4 className="text-[13px] font-bold text-white flex items-center gap-1.5 mb-3">
            <MapPin className="w-4 h-4 text-brand-300" /> تواصل ومقر المؤسسة
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <Phone className="w-3.5 h-3.5 text-brand mt-0.5" />
              <span className="font-mono text-white/70">
                {brand.contact.phone}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Mail className="w-3.5 h-3.5 text-brand mt-0.5" />
              <span className="font-mono text-white/70">
                {brand.contact.email}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-3.5 h-3.5 text-brand mt-0.5" />
              <span className="text-white/70">{brand.contact.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-[11px] text-white/50">
          {brand.trustBadges.map(b => (
            <span key={b} className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Legal */}
      <div className="max-w-7xl mx-auto px-4 mt-6 text-center text-[11px] text-white/45 space-y-1">
        <p className="text-white/70 font-bold">
          {brand.names.legalFull} © {new Date().getFullYear()} — جميع الحقوق
          محفوظة
        </p>
        <p>
          منظومة سحابية متعددة المؤسسات والفروع والعملات — مبنية ومُنشورة عبر
          GitHub &amp; Vercel.
        </p>
      </div>
    </footer>
  );
}
