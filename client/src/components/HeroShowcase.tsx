import React, { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { MODULES } from "@/lib/design";

type ModuleKey = "accounting" | "engineering" | "commercial" | "library";

const SHOWCASE: Record<
  ModuleKey,
  {
    title: string;
    subtitle: string;
    kpis: { label: string; value: string }[];
    bars: number[];
    trend: string;
  }
> = {
  accounting: {
    title: "لوحة المحاسبة المالية",
    subtitle: "قيود مزدوجة • دليل حسابات شجري • تقارير ضريبية",
    kpis: [
      { label: "الإيرادات", value: "1.24M" },
      { label: "المصروفات", value: "0.86M" },
      { label: "الصافي", value: "380K" },
    ],
    bars: [42, 58, 50, 72, 64, 88, 95],
    trend: "+18% هذا الربع",
  },
  engineering: {
    title: "جناح الهندسة والمقاولات",
    subtitle: "جداول BOQ • رفع مساحي • حصر حديد ومواد",
    kpis: [
      { label: "مشاريع نشطة", value: "12" },
      { label: "جداول BOQ", value: "48" },
      { label: "كميات مرفوعة", value: "1,840" },
    ],
    bars: [30, 45, 60, 55, 78, 70, 92],
    trend: "+9 مشاريع جديدة",
  },
  commercial: {
    title: "إدارة المبيعات والمخازن",
    subtitle: "فواتير ذكية • مخزون متعدد الفروع • عملاء",
    kpis: [
      { label: "فواتير", value: "320" },
      { label: "المخزون", value: "1,205" },
      { label: "مستحقات", value: "94K" },
    ],
    bars: [55, 48, 66, 72, 60, 84, 76],
    trend: "+24% المبيعات",
  },
  library: {
    title: "مكتبة الحسينية وصيانة الأجهزة",
    subtitle: "طلبات طلابي • تصاميم • صيانة ودعم",
    kpis: [
      { label: "طلبات", value: "180" },
      { label: "تصاميم", value: "64" },
      { label: "صيانات", value: "42" },
    ],
    bars: [40, 52, 47, 63, 71, 80, 88],
    trend: "+36 عميل هذا الشهر",
  },
};

const ORDER: ModuleKey[] = ["accounting", "engineering", "commercial", "library"];

export function HeroShowcase() {
  const [active, setActive] = useState<ModuleKey>("accounting");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [active]);

  const data = SHOWCASE[active];
  const Icon = MODULES[active].icon;
  const accent = MODULES[active].accent;

  return (
    <div className="relative w-full">
      {/* Segmented module selector */}
      <div className="flex flex-wrap gap-2 justify-center mb-5">
        {ORDER.map(k => {
          const MIcon = MODULES[k].icon;
          const on = k === active;
          return (
            <button
              key={k}
              onClick={() => setActive(k)}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                on
                  ? "bg-brand text-ink border-brand shadow-lg shadow-brand/30"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <MIcon className="w-4 h-4" />
              <span>{MODULES[k].label}</span>
            </button>
          );
        })}
      </div>

      {/* App frame */}
      <div className="rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-white/5">
        {/* window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
          <span className="w-3 h-3 rounded-full bg-rose-400/80" />
          <span className="w-3 h-3 rounded-full bg-amber-400/80" />
          <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-[11px] text-white/45 font-mono tracking-wide">
            app.husseiniya.com
          </span>
          <span className="mr-auto flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            مباشر
          </span>
        </div>

        {/* content (re-mounts per module to replay animations) */}
        <div
          key={active}
          className="p-5 sm:p-7 bg-gradient-to-br from-[#0e2a2b]/50 to-[#0a1f20]/70"
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-ink shadow-lg shrink-0"
              style={{ background: accent }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-black text-base leading-tight truncate">
                {data.title}
              </h3>
              <p className="text-white/55 text-[11px] truncate">{data.subtitle}</p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {data.kpis.map(k => (
              <div
                key={k.label}
                className="rounded-2xl bg-white/[0.04] border border-white/10 p-3"
              >
                <div className="text-[10px] text-white/50 mb-1">{k.label}</div>
                <div className="text-white font-black text-lg leading-none">
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          {/* Performance chart */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-white/55">نشاط الأداء</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                {data.trend}
              </span>
            </div>
            <div className="flex items-end gap-2 h-28">
              {data.bars.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-lg transition-all duration-700 ease-out"
                  style={{
                    height: mounted ? `${b}%` : "0%",
                    background: `linear-gradient(to top, ${accent}, ${accent}aa)`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
