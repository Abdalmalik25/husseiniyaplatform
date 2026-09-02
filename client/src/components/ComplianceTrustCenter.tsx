import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Database,
  Lock,
  RefreshCw,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * ComplianceTrustCenter — Enterprise Trust & Compliance section.
 *
 * Inspired by: Microsoft Trust Center, AWS Compliance, Stripe's security
 * documentation.
 *
 * Design principles:
 * - Four trust pillars with expandable detail.
 * - Certification badges with official codes.
 * - "Download whitepaper" CTA for enterprise buyers.
 * - "Request audit report" for security-conscious prospects.
 *
 * Marketing-only component.
 */

const PILLAR_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  ShieldCheck,
  Database,
  Lock,
  RefreshCw,
};

export function ComplianceTrustCenter() {
  const { title, subtitle, pillars, certifications } = brand.trustCenter;

  return (
    <section
      id="trust-center"
      className="py-20 px-4 bg-ink text-white scroll-mt-20"
      aria-labelledby="trust-center-title"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-14 reveal">
          <Badge className="bg-white/10 text-brand-300 border border-brand/30 font-bold text-xs px-3 py-1">
            مركز الثقة والامتثال
          </Badge>
          <h2
            id="trust-center-title"
            className="text-2xl sm:text-4xl font-black leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Four Trust Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16 reveal">
          {pillars.map((pillar, i) => {
            const Icon = PILLAR_ICONS[pillar.icon] || ShieldCheck;
            return (
              <div
                key={pillar.title}
                className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 hover:bg-white/[0.06] transition-all"
                data-reveal-delay={i * 100}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-brand-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-white text-sm mb-3">
                      {pillar.title}
                    </h3>
                    <ul className="space-y-2">
                      {pillar.items.map((item, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2.5 text-xs text-white/65 leading-relaxed"
                        >
                          <span className="text-brand-300 mt-0.5 shrink-0">
                            ✓
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Certifications */}
        <div className="reveal">
          <h3 className="text-center text-sm font-bold text-white/50 mb-8 uppercase tracking-widest">
            الامتثال والمعاير المعتمدة
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {certifications.map(cert => (
              <div
                key={cert.code}
                className="group bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-brand/40 rounded-xl p-4 text-center transition-all cursor-default"
              >
                <div className="w-10 h-10 rounded-lg bg-brand/15 border border-brand/30 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 text-brand-300" />
                </div>
                <p className="font-mono font-black text-xs text-brand-300 leading-tight mb-1">
                  {cert.code}
                </p>
                <p className="text-[10px] text-white/50 leading-tight">
                  {cert.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust CTAs */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-4 reveal">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-brand-300" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm mb-1">
                اطلب تقرير المراجعة الأمنية
              </h3>
              <p className="text-xs text-white/55 leading-relaxed mb-3">
                تقرير تدقيق مستقل من طرف ثالث — متاح للعملاء المحتملين
                والمؤسسات.
              </p>
              <a
                href={`mailto:${brand.contact.email}?subject=طلب تقرير المراجعة الأمنية&body=السلام عليكم، أود طلب نسخة من تقرير المراجعة الأمنية لتقرير Uamex_erp.`}
                className="inline-flex items-center gap-1.5 text-brand-300 hover:text-brand-200 text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                اطلب التقرير
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-brand-300" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm mb-1">
                اتفاقيات NDA و DPA جاهزة
              </h3>
              <p className="text-xs text-white/55 leading-relaxed mb-3">
                نموذج اتفاقية معالجة البيانات (DPA) ونموذج NDA متاحان للتوقيع
                الإلكتروني.
              </p>
              <a
                href={`mailto:${brand.contact.email}?subject=طلب نماذج NDA و DPA&body=السلام عليكم، أود الحصول على نماذج اتفاقية NDA واتفاقية معالجة البيانات DPA.`}
                className="inline-flex items-center gap-1.5 text-brand-300 hover:text-brand-200 text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                اطلب النماذج
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
