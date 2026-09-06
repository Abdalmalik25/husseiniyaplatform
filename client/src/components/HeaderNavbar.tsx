import React from "react";
import { useLocation } from "wouter";
import { withViewTransition } from "@/lib/viewTransition";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  ShieldCheck,
  Settings,
  Search,
  Menu,
  X,
  Globe,
  ChevronDown,
  Layers,
  Compass,
  Phone,
} from "lucide-react";
import { useOffline } from "@/lib/offline/OfflineContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { BrandLogo } from "@/components/BrandLogo";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  APP_NAV,
  MARKETING_NAV,
  UTILITY_LINKS,
  PLATFORM_CLUSTER,
  SOLUTIONS_CLUSTER,
  COMPANY_CLUSTER,
  TOOLS_CLUSTER,
  type NavItem,
} from "@/lib/nav";
import { Zap, ArrowLeft, MessageSquare } from "lucide-react";
import { uamexDemoLink, brand } from "@/lib/brand";

interface HeaderNavbarProps {
  institutionName?: string;
  onOpenSettings?: () => void;
  publicOnly?: boolean;
}

/**
 * هندسة التنقل بمستوى شركة عالمية — 3 عناقيد واضحة + رابط تحويل واحد
 * منطق خبير: الحلول (JTBD) / المنصة (How) / الموارد (Learn & Integrate)
 * Hick's Law: ≤5 عناصر علوية = قرار أسرع + مظهر مرتب كـ Stripe/Linear
 */
const DOMAIN_CLUSTERS: ReadonlyArray<{
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}> = [
  { key: "solutions", label: "الحلول", icon: Layers, items: SOLUTIONS_CLUSTER },
  { key: "platform", label: "المنصة", icon: Compass, items: PLATFORM_CLUSTER },
  { key: "resources", label: "الموارد", icon: Globe, items: TOOLS_CLUSTER },
];
/** رابط تحويلي واحد مباشر — التسعير فقط (أعلى نية) */
const DIRECT_NAV_PATHS = ["/pricing"];
const NAV_BY_PATH = new Map(
  [...MARKETING_NAV, ...UTILITY_LINKS, ...SOLUTIONS_CLUSTER, ...COMPANY_CLUSTER].map(item => [item.path, item])
);

/**
 * جلب مسبق عند النية — يغطي الآن الذكاء والتقارير بدقة (لا عشوائية)
 * كل مسار BI يُحمّل خلفياً عند المرور — يبدو الانتقال فورياً
 */
const ROUTE_PREFETCHERS: Record<string, () => Promise<unknown>> = {
  "/about": () => import("@/pages/About"),
  "/pricing": () => import("@/pages/Pricing"),
  "/contact": () => import("@/pages/Contact"),
  "/tools": () => import("@/pages/InteractiveCalculators"),
  "/insights": () => import("@/pages/KnowledgeHub"),
  "/portal": () => import("@/pages/Portal"),
  "/integrate": () => import("@/pages/Integrate"),
  "/download": () => import("@/pages/Download"),
  "/reports": () => import("@/pages/Reports"),
  "/financial-statements": () => import("@/pages/FinancialStatements"),
  "/analytics": () => import("@/pages/Analytics"),
  "/supplier-analytics": () => import("@/pages/SupplierAnalytics"),
  "/operations": () => import("@/pages/Operations"),
  "/inventory": () => import("@/pages/Inventory"),
  "/store": () => import("@/pages/Store"),
};
const prefetchedRoutes = new Set<string>();
function prefetchRoute(path: string) {
  const clean = path.split("#")[0] || "/";
  const loader = ROUTE_PREFETCHERS[clean];
  if (!loader || prefetchedRoutes.has(clean)) return;
  prefetchedRoutes.add(clean);
  void loader().catch(() => {});
}

export function HeaderNavbar({
  onOpenSettings,
  publicOnly = false,
}: HeaderNavbarProps) {
  const [location, setLocation] = useLocation();
  const { isOnline, isSyncing } = useOffline();
  const { user, isAuthenticated } = useAuth();
  const { language, setLanguage } = useI18n();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openCluster, setOpenCluster] = React.useState<string | null>(null);
  const [scrolled, setScrolled] = React.useState(false);
  const isWorkspace =
    !publicOnly &&
    isAuthenticated &&
    APP_NAV.some(item => location === item.path);
  const currentAppItem = APP_NAV.find(item => location === item.path || (item.path !== "/app" && location.startsWith(item.path)));
  const visibleClusters = DOMAIN_CLUSTERS;
  const mobileNav = [...SOLUTIONS_CLUSTER, ...PLATFORM_CLUSTER, ...TOOLS_CLUSTER.slice(0, 2), ...COMPANY_CLUSTER];

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* إغلاق كل الطبقات بمفتاح Escape (وصولية لوحة مفاتيح كاملة) */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenCluster(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* إغلاق أي طبقة مفتوحة عند تغيّر المسار */
  React.useEffect(() => {
    setOpenCluster(null);
    setMobileOpen(false);
  }, [location]);

  /* قفل تمرير الصفحة خلف درج الجوال المفتوح */
  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* تنقّل موحّد: روابط عادية أو مراسي تمرير سلس — مع View Transition راقٍ */
  const navigateOrScroll = React.useCallback(
    (path: string) => {
      setMobileOpen(false);
      if (!path.includes("#")) {
        withViewTransition(() => setLocation(path));
        return;
      }
      const [pagePath, hash] = path.split("#");
      const scrollToHash = () =>
        document
          .getElementById(hash)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (location !== pagePath && pagePath !== "/") {
        withViewTransition(() => setLocation(pagePath));
        window.setTimeout(scrollToHash, 380);
      } else if (location !== "/" && pagePath === "/") {
        withViewTransition(() => setLocation("/"));
        window.setTimeout(scrollToHash, 380);
      } else {
        scrollToHash();
      }
    },
    [location, setLocation]
  );

  const handleLanguageToggle = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const baseBtn =
    "h-8 px-3 text-[13px] font-medium transition-all gap-1.5 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none rounded-lg";
  const navClass = (active: boolean, highlight?: boolean) => {
    if (active) return "bg-slate-900 text-white font-bold shadow-sm";
    if (highlight) return "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100";
    return "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent";
  };

  // فصل جذري — هيدر نظام مستقل تماما (لا عناقيد تسويقية إطلاقا)
  if (isWorkspace) {
    return (
      <header className="sticky top-0 z-40 bg-ink border-b border-white/10 backdrop-blur-xl" dir="rtl">
        <div className="max-w-[1600px] mx-auto px-3 lg:px-4 flex items-center justify-between gap-3 h-[48px]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden sm:inline-flex items-center gap-2 text-[11px] font-mono text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {isOnline ? "متصل" : "أوفلاين"}
              {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-brand-300" />}
            </span>
            <span className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs min-w-0">
              <span className="text-white/40 hidden md:inline">نظام التشغيل</span>
              <span className="text-white/20 hidden md:inline">/</span>
              <span className="font-bold text-white truncate">{currentAppItem?.label ?? "لوحة التحكم"}</span>
              {currentAppItem?.description && (
                <span className="hidden lg:inline text-white/40 text-[11px] truncate">— {currentAppItem.description}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.dispatchEvent(new Event("alh:open-command"))}
              className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-[11px] transition-colors"
              title="بحث شامل (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-brand-300" />
              بحث
              <span className="hidden xl:inline-flex text-[10px] font-mono bg-white/10 border border-white/10 rounded px-1">⌘K</span>
            </button>
            <ThemeSwitcher compact />
            {!publicOnly && <TenantSwitcher />}
            {isAuthenticated && (
              <span className="hidden md:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-brand/20 bg-brand/10 text-brand-300 text-[11px] font-bold">
                <ShieldCheck className="w-3 h-3" />
                {user?.name?.split(" ")[0] || "مشرف"}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-white p-2 h-8 w-8 hover:bg-white/5" aria-label="قائمة النظام">
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 bg-ink-deep p-2 space-y-1 max-h-[60vh] overflow-y-auto">
            {APP_NAV.slice(0, 14).map(item => {
              const Icon = item.icon;
              const active = location === item.path;
              return (
                <button key={item.path} onClick={() => { setLocation(item.path); setMobileOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium ${active ? "bg-brand text-ink-deep font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 text-ink" dir="rtl">
      {/* Top bar — سطر ثقة رفيع كـ Stripe — يختفي عند التمرير */}
      <div
        className={`hidden lg:flex items-center justify-between px-4 backdrop-blur border-b text-[11px] transition-all duration-300 ${scrolled ? "h-0 overflow-hidden opacity-0 py-0 border-transparent" : "h-7 py-0 opacity-100"} bg-white/80 border-slate-200 text-slate-500`}
      >
        <span className="flex items-center gap-2.5 font-mono tracking-widest">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black border bg-slate-900 text-white border-slate-900">ALHUSAINIA</span>
          <span className="hidden xl:inline font-sans font-medium tracking-normal">
            {brand.names.siteName} — {brand.names.erp} v{brand.names.version}
          </span>
        </span>
        <span className="flex items-center gap-3 font-medium">
          <a href={`tel:${brand.contact.phone}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <Phone className="w-3 h-3 text-slate-400" />
            {brand.contact.phone}
          </a>
          <span className="w-px h-3 bg-slate-200" />
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            AES-256-GCM · عزل مستأجرين
          </span>
        </span>
      </div>
      <div className="border-b backdrop-blur-xl transition-all duration-300 bg-white/90 border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4 h-[56px]">
          {/* Brand — identity lockup */}
          <div
            className="flex items-center gap-3 cursor-pointer group/brand shrink-0"
            onClick={() => setLocation("/")}
            role="link"
            aria-label="alhusainiaye — الصفحة الرئيسية"
          >
            <BrandLogo size={32} className="transition-transform duration-300 group-hover/brand:scale-105" />
          </div>

          {/* Helper tools — أدوات مساعدة رفيعة — لا تنافس التنقل */}
          <div className="hidden lg:flex items-center gap-1 pr-3 mr-1 border-r border-slate-200">
            <button
              onClick={() => window.dispatchEvent(new Event("alh:open-command"))}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] transition-colors border bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white hover:border-slate-300"
              aria-label="بحث شامل"
              title="بحث شامل (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden xl:inline">بحث</span>
              <span className="hidden xl:inline-flex items-center gap-0.5 text-[10px] font-mono border rounded px-1 py-0 bg-white border-slate-200 text-slate-400">⌘K</span>
            </button>
            <ThemeSwitcher compact />
            <button
              onClick={handleLanguageToggle}
              className="flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] transition-colors text-slate-400 hover:text-slate-900 hover:bg-slate-50"
              aria-label="تبديل اللغة"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Desktop Navigation — عناقيد Mega Menu بأسلوب SaaS العالمي */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="التنقل الرئيسي"
          >
            {DIRECT_NAV_PATHS.map(p => {
              const item = NAV_BY_PATH.get(p);
              if (!item) return null;
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateOrScroll(item.path)}
                  onMouseEnter={() => prefetchRoute(item.path)}
                  onFocus={() => prefetchRoute(item.path)}
                  aria-current={isActive ? "page" : undefined}
                  className={`${baseBtn} ${navClass(isActive, item.highlight)} group relative`}
                >
                  <Icon className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  {item.label}
                  <span
                    className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-gradient-to-l from-brand to-brand-300 transition-all duration-300 ${isActive ? "w-2/3" : "w-0 group-hover:w-2/3"}`}
                  />
                </Button>
              );
            })}

            {/* 3 عناقيد خبيرة — مرتبة: الحلول → المنصة → الموارد */}
            {visibleClusters.map(cluster => {
              const ClusterIcon = cluster.icon;
              const items = cluster.items;
              const isOpen = openCluster === cluster.key;
              const containsActive = items.some(i => location === i.path);
              return (
                <div
                  key={cluster.key}
                  className="relative"
                  onMouseEnter={() => {
                    setOpenCluster(cluster.key);
                    items.forEach(it => prefetchRoute(it.path));
                  }}
                  onMouseLeave={() => setOpenCluster(null)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenCluster(isOpen ? null : cluster.key)}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    className={`${baseBtn} ${navClass(containsActive)} group`}
                  >
                    <ClusterIcon className={`w-3.5 h-3.5 ${!containsActive ? "text-slate-400" : "text-brand-300"}`} />
                    {cluster.label}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} text-slate-400`} />
                  </Button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full right-0 mt-2 rounded-2xl border p-2 origin-top min-w-[340px] bg-white border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)]"
                      >
                        {items.map(item => {
                          const Icon = item.icon;
                          const isActive = location === item.path;
                          return (
                            <button
                              key={item.path}
                              onClick={() => navigateOrScroll(item.path)}
                              onMouseEnter={() => prefetchRoute(item.path)}
                              onFocus={() => prefetchRoute(item.path)}
                              aria-current={isActive ? "page" : undefined}
                              className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-right transition-colors duration-150 group/item ${isActive ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
                            >
                              <span className={`mt-0.5 w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${isActive ? "bg-white/10 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-600 group-hover/item:bg-slate-900 group-hover/item:text-white group-hover/item:border-slate-900"}`}>
                                <Icon className="w-4 h-4" />
                              </span>
                              <span className="flex flex-col gap-0.5">
                                <span className={`text-[13px] font-bold flex items-center gap-2 ${isActive ? "text-white" : "text-slate-900"}`}>
                                  {item.label}
                                  {item.highlight && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black bg-amber-100 text-amber-700">ERP</span>}
                                </span>
                                {item.description && (
                                  <span className={`text-[11px] leading-relaxed ${isActive ? "text-white/70" : "text-slate-500"}`}>{item.description}</span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* CTAs — فصل تسويقي نقي: لا لوحة تحكم هنا، فقط تسويق */}
            <button
              onClick={() => setLocation("/contact")}
              className="hidden lg:inline-flex items-center h-8 px-3.5 rounded-lg text-[13px] font-medium transition-colors mr-1 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              تواصل
            </button>
            <Button
              onClick={() => setLocation(isAuthenticated ? "/app" : "/login")}
              className="relative overflow-hidden group/cta bg-slate-900 hover:bg-black text-white font-bold h-8 px-4 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 text-[13px] mr-1"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              {isAuthenticated ? "ادخل النظام" : "ابدأ مجاناً"}
            </Button>
          </nav>

          {/* Actions — لا أدوات نظام هنا إطلاقا — فقط إعدادات الصفحة إن وجدت */}
          <div className="flex items-center gap-1.5">
            {onOpenSettings && (
              <Button variant="outline" size="sm" onClick={onOpenSettings} className="h-8 text-xs px-2.5 hidden sm:flex items-center gap-1 bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                <Settings className="w-3.5 h-3.5" />
                <span>إعدادات</span>
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 h-9 w-9 text-slate-700 hover:bg-slate-50" aria-label="فتح القائمة" aria-expanded={mobileOpen}>
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer — لوحة منزلقة متحركة فوق خلفية معتمة ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 top-[64px] z-40 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div key="panel" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }} className="md:hidden absolute inset-x-3 top-full z-50 mt-2 rounded-2xl border p-3 space-y-1.5 max-h-[calc(100dvh-110px)] overflow-y-auto backdrop-blur-2xl shadow-2xl bg-white border-slate-200 shadow-[0_16px_48px_rgba(0,0,0,0.12)]" aria-label="قائمة التنقل">
              {/* Primary CTA */}
              <button
                onClick={() => {
                  setLocation("/app");
                  setMobileOpen(false);
                }}
                className="relative overflow-hidden w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand text-ink-deep font-black text-xs shadow-lg"
              >
                <Zap className="w-4 h-4 fill-current" />
                {isAuthenticated ? "لوحة التحكم" : "دخول النظام"}
              </button>

              {/* Free trial CTA للزوار */}
              {!isAuthenticated && (
                <a
                  href={uamexDemoLink()}
                  target="_blank"
                  rel="noopener"
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-brand/40 text-brand-300 font-bold text-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  ابدأ بتجربة مجانية
                </a>
              )}

              <div className="section-divider" />

              {mobileNav.map((item, index) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <motion.button
                    key={item.path}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * index, duration: 0.22 }}
                    onClick={() => navigateOrScroll(item.path)}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${isActive ? "bg-slate-900 text-white font-bold" : item.highlight ? "text-amber-700 border border-amber-200 bg-amber-50" : "text-slate-700 hover:bg-slate-50 border border-transparent"}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex flex-col items-start gap-0.5">
                      <span>{item.label}</span>
                      {item.description && <span className="text-[10px] font-normal text-slate-400">{item.description}</span>}
                    </span>
                    {item.highlight && <span className="mr-auto text-[9px] px-2 py-0.5 rounded-full font-black bg-slate-900 text-white">ERP</span>}
                  </motion.button>
                );
              })}

              <div className="section-divider" />

              {onOpenSettings && (
                <button
                  onClick={() => {
                    onOpenSettings();
                    setMobileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50"
                >
                  <Settings className="w-4 h-4" />
                  <span>إعدادات المؤسسة</span>
                </button>
              )}
              <button
                onClick={() => {
                  setLanguage(language === "ar" ? "en" : "ar");
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50"
              >
                <Globe className="w-4 h-4 text-slate-400" />
                <span>العربية / English</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
