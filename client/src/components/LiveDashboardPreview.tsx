import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Package,
  Wallet,
  ArrowUpRight,
  CircleDot,
  CheckCircle2,
  Clock,
} from "lucide-react";

/**
 * LiveDashboardPreview — Animated interactive dashboard mockup.
 *
 * Inspired by: Linear's product showcase, Vercel's interactive demos,
 * Stripe's animated product pages.
 *
 * Design principles:
 * - Looks like a real product screenshot (not a stock photo).
 * - Subtle live animations: numbers tick up, progress bars grow, status
 *   dots pulse.
 * - Three KPI cards + transaction feed + chart — covers the breadth of
 *   Uamex_erp without overwhelming.
 * - Real RTL layout for Arabic authenticity.
 * - Realistic placeholder data — never "Lorem ipsum".
 *
 * Marketing-only component — does NOT connect to real backend data.
 */

const KPI_DATA = [
  {
    key: "revenue",
    icon: Wallet,
    label: "الإيرادات الشهرية",
    value: 487650,
    unit: "ر.ي",
    delta: 12.4,
    color: "#b87945",
  },
  {
    key: "cash",
    icon: TrendingUp,
    label: "التدفق النقدي",
    value: 1248000,
    unit: "ر.ي",
    delta: 8.2,
    color: "#0f766e",
  },
  {
    key: "orders",
    icon: Package,
    label: "طلبات قيد التنفيذ",
    value: 47,
    unit: "طلب",
    delta: -3.1,
    color: "#0369a1",
  },
];

const LIVE_FEED = [
  {
    type: "invoice",
    label: "فاتورة مبيعات #INV-2841",
    amount: "+ ١٢٬٤٠٠ ر.ي",
    status: "success",
    time: "منذ ٢ دقيقة",
  },
  {
    type: "payment",
    label: "تحصيل من عميل النور",
    amount: "+ ٤٥٬٠٠٠ ر.ي",
    status: "success",
    time: "منذ ١٥ دقيقة",
  },
  {
    type: "po",
    label: "أمر شراء #PO-1108",
    amount: "- ٢٣٬٧٠٠ ر.ي",
    status: "pending",
    time: "منذ ساعة",
  },
  {
    type: "journal",
    label: "قيد يومية يدوية",
    amount: "+ ٨٬٢٠٠ ر.ي",
    status: "success",
    time: "منذ ٣ ساعات",
  },
];

const CHART_BARS = [
  { label: "السبت", height: 62 },
  { label: "الأحد", height: 78 },
  { label: "الإثنين", height: 91 },
  { label: "الثلاثاء", height: 68 },
  { label: "الأربعاء", height: 85 },
  { label: "الخميس", height: 94 },
  { label: "الجمعة", height: 73 },
];

export function LiveDashboardPreview() {
  const [tick, setTick] = useState(0);

  // Animate values slightly to give "live" feel
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 2200);
    return () => clearInterval(t);
  }, []);

  const getKpiValue = (kpi: typeof KPI_DATA[number]) => {
    const jitter = Math.sin((tick + kpi.value) / 3) * 0.005;
    const adjusted = kpi.value * (1 + jitter);
    return Math.round(adjusted).toLocaleString("en-US");
  };

  return (
    <section
      id="product-preview"
      className="py-20 px-4 bg-gradient-to-b from-background to-muted/30 scroll-mt-20"
      aria-labelledby="preview-title"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-12 reveal">
          <Badge className="bg-brand/10 text-brand border border-brand/30 font-bold text-xs px-3 py-1">
            <CircleDot className="w-3 h-3 ml-1 animate-pulse text-emerald-500" />
            حيّ — عرض حي للمنصة
          </Badge>
          <h2
            id="preview-title"
            className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight"
          >
            واجهة يفهمها مدير المؤسسة في 60 ثانية
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            لوحة قيادة تنفيذية حقيقية — أرقام لحظية، مؤشرات قابلة للقراءة،
            وتدفق عمليات لا يضيع فيه ريال.
          </p>
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-6xl mx-auto reveal">
          {/* Glow halo */}
          <div
            className="absolute -inset-4 bg-gradient-to-r from-brand/20 via-brand/5 to-brand/20 rounded-3xl blur-2xl opacity-50"
            aria-hidden
          />

          {/* Browser chrome */}
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
            {/* Window bar */}
            <div className="bg-muted/60 border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-background/80 border border-border rounded-md px-3 py-1 text-[10px] font-mono text-muted-foreground">
                <CircleDot className="w-3 h-3 text-emerald-500 animate-pulse" />
                uamex.app/dashboard
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <CircleDot className="w-2 h-2 text-emerald-500 animate-pulse" />
                متصل
              </div>
            </div>

            {/* Dashboard body */}
            <div className="p-6 sm:p-8 bg-background grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left column — KPIs + Chart */}
              <div className="lg:col-span-2 space-y-5">
                {/* Header line */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      لوحة القيادة التنفيذية
                    </p>
                    <p className="font-black text-foreground text-base mt-1">
                      صباح الخير، محمد 👋
                    </p>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    آخر تحديث: الآن
                  </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {KPI_DATA.map(kpi => {
                    const Icon = kpi.icon;
                    const positive = kpi.delta > 0;
                    return (
                      <div
                        key={kpi.key}
                        className="rounded-2xl border border-border p-4 bg-card hover:border-brand/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                              background: `${kpi.color}15`,
                              border: `1px solid ${kpi.color}30`,
                            }}
                          >
                            <Icon
                              className="w-4 h-4"
                              style={{ color: kpi.color }}
                            />
                          </div>
                          <div
                            className={`flex items-center gap-1 text-[10px] font-bold ${
                              positive ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {positive ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {positive ? "+" : ""}
                            {kpi.delta}%
                          </div>
                        </div>
                        <div className="font-mono font-black text-xl text-foreground tabular-nums">
                          {getKpiValue(kpi)}
                          <span className="text-[10px] text-muted-foreground font-medium mr-1.5">
                            {kpi.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {kpi.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Chart */}
                <div className="rounded-2xl border border-border p-5 bg-card">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="font-black text-foreground text-sm">
                        تدفق المبيعات الأسبوعي
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        مقارنة بأسبوع سابق
                      </p>
                    </div>
                    <BarChart3 className="w-5 h-5 text-brand" />
                  </div>

                  <div className="flex items-end justify-between gap-2 h-32">
                    {CHART_BARS.map((bar, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-2"
                      >
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-brand to-brand-light relative group cursor-default"
                          style={{
                            height: `${bar.height}%`,
                            minHeight: "8px",
                            transition: "height 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          <div className="absolute -top-7 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-ink text-white text-[9px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                            {bar.height * 1200} ر.ي
                          </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground font-medium">
                          {bar.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column — Live feed + Status */}
              <div className="space-y-5">
                {/* Live transactions */}
                <div className="rounded-2xl border border-border p-5 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CircleDot className="w-3 h-3 text-emerald-500 animate-pulse" />
                      <p className="font-black text-foreground text-sm">
                        تدفق العمليات
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      حيّ
                    </span>
                  </div>

                  <div className="space-y-3">
                    {LIVE_FEED.map((tx, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 pb-3 border-b border-border/60 last:border-0 last:pb-0"
                      >
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                            tx.status === "success"
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {tx.status === "success" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground leading-tight truncate">
                            {tx.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {tx.time}
                          </p>
                        </div>
                        <p
                          className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                            tx.amount.startsWith("+")
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {tx.amount}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System status */}
                <div className="rounded-2xl border border-border p-5 bg-card">
                  <p className="font-black text-foreground text-sm mb-3">
                    صحة النظام
                  </p>
                  <div className="space-y-2.5">
                    {[
                      {
                        label: "المحاسبة",
                        status: "active",
                        value: "٢٤٬١٠٤ قيد",
                      },
                      {
                        label: "التجارة",
                        status: "active",
                        value: "٣٤٧ طلب",
                      },
                      {
                        label: "المخزون",
                        status: "active",
                        value: "١٬٢٠٨ صنف",
                      },
                      {
                        label: "الموارد البشرية",
                        status: "syncing",
                        value: "٤٢ موظف",
                      },
                    ].map(s => (
                      <div
                        key={s.label}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "active"
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-amber-500 animate-pulse"
                            }`}
                          />
                          <span className="text-foreground/80">{s.label}</span>
                        </div>
                        <span className="font-mono text-muted-foreground text-[10px]">
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating annotations */}
          <div className="hidden lg:block absolute -right-6 top-32 bg-card border border-border rounded-2xl shadow-xl p-3 max-w-[180px] -rotate-2 animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-brand/15 border border-brand/30 flex items-center justify-center">
                <ArrowUpRight className="w-3 h-3 text-brand" />
              </div>
              <p className="text-[10px] font-bold text-foreground">رؤية لحظية</p>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              كل قيد يُحدّث الميزانية والقوائم فوراً — لا انتظار.
            </p>
          </div>

          <div className="hidden lg:block absolute -left-6 bottom-32 bg-card border border-border rounded-2xl shadow-xl p-3 max-w-[180px] rotate-2 animate-in fade-in slide-in-from-left-4 duration-700 delay-150">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Users className="w-3 h-3 text-emerald-600" />
              </div>
              <p className="text-[10px] font-bold text-foreground">
                صلاحيات COSO
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              كل دور يرى ما يحتاجه فقط — حماية بطبقات.
            </p>
          </div>
        </div>

        {/* CTA below preview */}
        <div className="mt-14 text-center reveal">
          <p className="text-sm text-muted-foreground mb-4">
            كل هذا في متصفحك، أوفلاين، وعلى موبايلك — بنفس التجربة.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => (window.location.hash = "uamex")}
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-deep text-ink font-black px-7 py-3 rounded-2xl text-sm shadow-xl shadow-brand/30 transition-all hover:scale-105"
            >
              <BarChart3 className="w-5 h-5 fill-current" />
              ادخل لوحة القيادة مباشرة
            </button>
            <a
              href="#case-studies"
              className="inline-flex items-center gap-2 border border-border bg-card hover:border-brand/30 text-foreground font-medium px-6 py-3 rounded-2xl text-sm transition-all"
            >
              شاهد تحوّل المؤسسات بالأرقام
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}