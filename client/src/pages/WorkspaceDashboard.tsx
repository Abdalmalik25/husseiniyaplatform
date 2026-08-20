import React, { useState } from "react";
import { useLocation } from "wouter";
import { HeaderNavbar } from "@/components/HeaderNavbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { ModuleCard } from "@/components/ui/module-card";
import {
  Building2,
  ShoppingCart,
  BookOpen as BookIcon,
  BarChart3,
  Layers,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { EngineeringBOQCalculator } from "@/components/EngineeringBOQCalculator";
import { BusinessLifecycleWizard } from "@/components/BusinessLifecycleWizard";
import {
  MODULES,
  MODULE_LIST,
  modulesForRole,
  greetingByHour,
  formatMoney,
  type ModuleKey,
} from "@/lib/design";

const ERP_KEYS: ModuleKey[] = [
  "hr",
  "projects",
  "procurement",
  "support",
  "quality",
];

function AdvisorInsight({ data }: { data: unknown }) {
  if (!data) {
    return (
      <p className="text-muted-foreground">
        مؤشرات الأداء المالي والإنشائي ممتازة. الاستقرار المالي متوافق مع معايير
        التدفقات النقدية.
      </p>
    );
  }
  if (typeof data === "string") {
    return <p className="whitespace-pre-wrap">{data}</p>;
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <ul className="space-y-2">
        {entries.map(([k, v]) => (
          <li
            key={k}
            className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
          >
            <span className="text-muted-foreground text-[11px] shrink-0">{k}</span>
            <span
              dir="ltr"
              className="font-semibold text-foreground text-[11px] text-left break-all"
            >
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return <p>{String(data)}</p>;
}

export default function WorkspaceDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeWorkspace, setActiveWorkspace] = useState<ModuleKey>("accounting");

  const { data: summaryData } = trpc.accounting.getDashboardSummary.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const { data: commercialStats } = trpc.commercial.getStats.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: aiAdvisorData } = trpc.accounting.getAiFinancialAdvisorAnalysis.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  const firstName = (user?.name || "المشرف").split(" ")[0];
  const active = MODULES[activeWorkspace];
  const allowed = modulesForRole(user?.role);
  const visibleModules = MODULE_LIST.filter(m => allowed.includes(m.key));

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-sans transition-colors" dir="rtl">
      <HeaderNavbar institutionName="لوحة قيادة منظومة الحسينية" />

      {/* Trial status banner */}
      <div className="brand-gradient text-white py-2 px-4 shadow border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#d4a574] fill-current" />
            <span className="font-bold text-[#d4a574]">الفترة التجريبية المجانية:</span>
            <span>متبقي 14 يوماً — جميع المساحات والخواص مفعّلة بالكامل</span>
          </div>
            <Badge className="bg-brand text-ink font-bold text-[10px]">
              اشتراك قياسي مفعّل
            </Badge>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Welcome / command header */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="brand-gradient rounded-3xl px-5 sm:px-7 py-6 shadow-lg relative overflow-hidden"
        >
          <div className="absolute inset-0 brand-dotgrid opacity-10" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-brand-300 text-xs font-bold">
                {greetingByHour()}، {firstName} 👋
              </p>
              <h1 className="text-xl sm:text-2xl font-black font-display text-white mt-1">
                لوحة القيادة الموحّدة للأعمال
              </h1>
              <p className="text-xs text-white/70 mt-1 max-w-xl text-pretty">
                أدر محاسبتك وفروعك وعملياتك التجارية وخدماتك من مركز واحد متعدد
                المؤسسات والعملات.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setActiveWorkspace("accounting")}
                className="bg-brand hover:bg-brand-deep text-ink font-bold text-xs h-9 px-4 rounded-xl"
              >
                <Plus className="w-4 h-4" /> معاملة جديدة
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/reports")}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs h-9 px-4 rounded-xl"
              >
                <BarChart3 className="w-4 h-4 text-brand-300" /> التقارير
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Modular workspace selector */}
        <div className="surface rounded-2xl p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {visibleModules.map(m => {
              const Icon = m.icon;
              const isActive = activeWorkspace === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveWorkspace(m.key)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? `bg-gradient-to-br ${m.gradient} text-white shadow-md ring-2 ring-white/30`
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-right leading-tight">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeWorkspace}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* ACCOUNTING */}
            {activeWorkspace === "accounting" && (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                      <Badge className="bg-ink text-brand-300 font-bold text-xs mb-1">
                        وحدة المحاسبة المركزية
                      </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                      مساحة النظام المحاسبي والمالي المتقدم
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setLocation("/accounting")}
                    className="bg-brand hover:bg-brand-deep text-ink font-bold text-xs h-8"
                  >
                    دفتر القيود الكامل
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="إجمالي الإيرادات"
                    value={formatMoney(summaryData?.totalRevenue ?? 0)}
                    tone="positive"
                    icon={Building2}
                    hint="هذا العام"
                  />
                  <StatCard
                    label="إجمالي المصروفات"
                    value={formatMoney(summaryData?.totalExpense ?? 0)}
                    tone="negative"
                    icon={Layers}
                    hint="هذا العام"
                  />
                  <StatCard
                    label="صافي الأرباح"
                    value={formatMoney(summaryData?.netIncome ?? 0)}
                    tone="info"
                    icon={BarChart3}
                    hint="قبل الضريبة"
                  />
                  <StatCard
                    label="إجمالي الأصول"
                    value={formatMoney(summaryData?.totalAssets ?? 0)}
                    tone="warning"
                    icon={BookIcon}
                    hint="الرصيد الحالي"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ModuleCard
                    module={MODULES.accounting}
                    title="الإدخال السريع للمعاملات"
                    description="تسجيل قيد مالية في الخزينة أو البنك فورياً."
                    badge="سريع"
                    onClick={() => setLocation("/accounting")}
                  />
                  <ModuleCard
                    module={MODULES.accounting}
                    title="دليل الحسابات الشجري"
                    description="استعراض وتعديل الحسابات الرئيسية والفرعية."
                    badge="محاسبي"
                    onClick={() => setLocation("/accounting")}
                  />
                  <ModuleCard
                    module={MODULES.accounting}
                    title="التقارير والقوائم المالية"
                    description="ميزان المراجعة، قائمة الدخل، والميزانية العمومية."
                    badge="تحليلي"
                    onClick={() => setLocation("/reports")}
                  />
                </div>
              </>
            )}

            {/* ENGINEERING */}
            {activeWorkspace === "engineering" && (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                      <Badge className="bg-brand text-ink font-bold text-xs mb-1">
                        وحدة الهندسة والمقاولات
                      </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                      مساحة الاستشارات الهندسية والأراضي والعقارات
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setLocation("/about")}
                    className="bg-brand hover:bg-brand-deep text-ink font-bold text-xs h-8"
                  >
                    الكتالوج الهندسي الكامل
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ModuleCard
                    module={MODULES.engineering}
                    title="المخططات التنفيذية (Shop Drawings & BIM)"
                    description="خرائط تفصيلية للمقاولين وتفريد التسليح لمنع الهدر."
                  />
                  <ModuleCard
                    module={MODULES.engineering}
                    title="الرفع المساحي الرقمي وتثبيت الحدود"
                    description="أجهزة GPS ودرون معتمدة لتحديد الحدود والفرز العقاري."
                  />
                  <ModuleCard
                    module={MODULES.engineering}
                    title="حصر الكميات (BOQ) والحفر والردم"
                    description="حساب دقيق لأوزان الحديد والخرسانات وحجوم القطع والردم."
                  />
                </div>

                <EngineeringBOQCalculator />
              </>
            )}

            {/* COMMERCIAL */}
            {activeWorkspace === "commercial" && (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <Badge className="bg-[#0f766e] text-white font-bold text-xs mb-1">
                      وحدة التجارة والمخزون
                    </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                      مساحة المبيعات والمشتريات وإدارة المخازن
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setLocation("/commercial")}
                    className="bg-[#0f766e] hover:bg-[#115e59] text-white font-bold text-xs h-8"
                  >
                    النظام التجاري الكامل
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard
                    label="الأصناف المنخفضة بالمخزن"
                    value={`${commercialStats?.lowStock?.length ?? 0} صنف`}
                    tone="warning"
                    icon={ShoppingCart}
                  />
                  <StatCard
                    label="إجمالي ديون العملاء"
                    value={formatMoney(
                      commercialStats?.topCustomers?.reduce(
                        (s: number, c: any) => s + parseFloat(c.balance || "0"),
                        0
                      ) ?? 0
                    )}
                    tone="negative"
                    icon={Layers}
                  />
                  <StatCard
                    label="طلبات المتجر الإلكتروني"
                    value="نشط ومتزامن"
                    tone="positive"
                    icon={Sparkles}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ModuleCard
                    module={MODULES.commercial}
                    title="فواتير وسندات"
                    description="إصدار فواتير المبيعات والمشتريات وربطها المحاسبي."
                    badge="محاسبي"
                    onClick={() => setLocation("/commercial")}
                  />
                  <ModuleCard
                    module={MODULES.commercial}
                    title="حركة المخزون"
                    description="تنبيهات حد أدنى وجرد وتحويل بين المستودعات."
                    badge="مخازن"
                    onClick={() => setLocation("/commercial")}
                  />
                  <ModuleCard
                    module={MODULES.commercial}
                    title="المتجر الإلكتروني المدمج"
                    description="ربط طلبات الموقع بكتالوج المنتجات آلياً."
                    badge="مدمج"
                    onClick={() => setLocation("/store")}
                  />
                </div>
              </>
            )}

            {/* LIBRARY */}
            {activeWorkspace === "library" && (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <Badge className="bg-[#0369a1] text-white font-bold text-xs mb-1">
                      وحدة المكتبة والخدمات
                    </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                      مكتبة الحسينية الحديثة وصيانة الأجهزة
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setLocation("/store")}
                    className="bg-[#0369a1] hover:bg-[#075985] text-white font-bold text-xs h-8"
                  >
                    متجر الخدمات
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModuleCard
                    module={MODULES.library}
                    title="الخدمات الطلابية والأبحاث العلمية"
                    description="طباعة الرسائل العلمية والتحليل الإحصائي بـ SPSS & Excel."
                  />
                  <ModuleCard
                    module={MODULES.library}
                    title="صيانة الموبايل والكمبيوتر"
                    description="إصلاح الشاشات، البطاريات، السوفتوير، وتحديث الويندوز."
                  />
                </div>
              </>
            )}

            {/* ANALYTICS */}
            {activeWorkspace === "analytics" && (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <Badge className="bg-[#7c3aed] text-white font-bold text-xs mb-1">
                      محرك الذكاء والتحليلات
                    </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                      مستشار الذكاء الاصطناعي والتحليل المالي
                    </h2>
                  </div>
                </div>

                <ModuleCard
                  module={MODULES.analytics}
                  title="تحليل المستشار المالي الفوري"
                  description="رؤى ذكية حول السيولة، الاستقرار، وكفاءة التكاليف."
                >
                  <div className="text-xs text-foreground leading-relaxed bg-muted/40 p-4 rounded-xl border border-border max-h-80 overflow-auto">
                    <AdvisorInsight data={aiAdvisorData} />
                  </div>
                </ModuleCard>
              </>
            )}

            {/* ERP التشغيلي العرضي */}
            {ERP_KEYS.includes(activeWorkspace) && (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <Badge className="bg-ink text-brand-300 font-bold text-xs mb-1">
                      وحدة تشغيلية عرضية
                    </Badge>
                    <h2 className="text-xl font-bold font-display text-foreground">
                      {active.label}
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setLocation(`/erp?module=${active.key}`)}
                    className="bg-brand hover:bg-brand-deep text-ink font-bold text-xs h-8"
                  >
                    فتح الوحدة الكاملة
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {active.tagline}
                </p>
                <ErpWorkspacePanel moduleKey={activeWorkspace} />
              </>
            )}

          </motion.div>
        </AnimatePresence>

        <BusinessLifecycleWizard />
      </main>
    </div>
  );
}

function ErpWorkspacePanel({ moduleKey }: { moduleKey: ModuleKey }) {
  const { data } = trpc.erp.getDashboard.useQuery(undefined, {
    staleTime: 60_000,
  });
  const cards: Record<string, { label: string; value: string | number }[]> = {
    hr: [{ label: "الموظفون", value: data?.employees ?? 0 }],
    projects: [{ label: "المشاريع النشطة", value: data?.activeProjects ?? 0 }],
    procurement: [
      { label: "أوامر بانتظار الاعتماد", value: data?.pendingRequisitions ?? 0 },
    ],
    support: [{ label: "تذاكر مفتوحة", value: data?.openTickets ?? 0 }],
    quality: [{ label: "فحوص مسجلة", value: data?.inspections ?? 0 }],
  };
  const items = cards[moduleKey] ?? [];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(c => (
        <div
          key={c.label}
          className="rounded-xl border border-border bg-muted/40 p-4"
        >
          <p className="text-[11px] text-muted-foreground">{c.label}</p>
          <p className="text-2xl font-black" dir="ltr">
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
