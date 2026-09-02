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
import { APP_NAV, MARKETING_NAV, UTILITY_LINKS, type NavItem } from "@/lib/nav";
import { Zap, ArrowLeft, MessageSquare } from "lucide-react";
import { uamexDemoLink, brand } from "@/lib/brand";

interface HeaderNavbarProps {
  institutionName?: string;
  onOpenSettings?: () => void;
  publicOnly?: boolean;
}

/**
 * مجموعات القائمة المنسدلة — خبير عالمي: الأقسام الرئيسية بارزة، الأدوات في قائمة واحدة
 * Hick's Law: 3 روابط مباشرة + 2 عنقود غني (حلول + أدوات) = 5 عناصر علوية فقط
 */
const MEGA_CLUSTERS: ReadonlyArray<{
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  paths: string[];
}> = [
  {
    key: "solutions",
    label: "الحلول",
    icon: Layers,
    paths: ["/#uamex", "/#corporate", "/#engineering", "/#library"],
  },
  {
    key: "tools",
    label: "الأدوات",
    icon: Compass,
    paths: ["/tools", "/insights", "/portal", "/integrate", "/download"],
  },
];
/** روابط مباشرة — الأقسام الرئيسية فقط */
const DIRECT_NAV_PATHS = ["/", "/about", "/pricing", "/contact"];
const NAV_BY_PATH = new Map(
  [...MARKETING_NAV, ...UTILITY_LINKS].map(item => [item.path, item])
);

/**
 * جلب مسبق عند النية (Hover/Focus Intent Prefetch):
 * المستخدم الذي يمرّر فوق رابط يُرجَّح أنه سينقر — نحمّل الحزمة مسبقًا
 * فيبدو التنقل فوريًا، بينما الزائر العادي لا يدفع بايتًا واحدًا إضافيًا.
 */
const ROUTE_PREFETCHERS: Record<string, () => Promise<unknown>> = {
  "/about": () => import("@/pages/About"),
  "/solutions": () => import("@/pages/TechSolutions"),
  "/insights": () => import("@/pages/KnowledgeHub"),
  "/tools": () => import("@/pages/InteractiveCalculators"),
  "/pricing": () => import("@/pages/Pricing"),
  "/contact": () => import("@/pages/Contact"),
  "/portal": () => import("@/pages/Portal"),
  "/integrate": () => import("@/pages/Integrate"),
  "/download": () => import("@/pages/Download"),
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
  const workspaceNav = APP_NAV.filter(item =>
    [
      "/app",
      "/accounting",
      "/commercial",
      "/inventory",
      "/reports",
      "/settings",
    ].includes(item.path)
  );
  const mobileNav = isWorkspace ? APP_NAV.slice(0, 12) : MARKETING_NAV;

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
    "h-9 px-3 text-xs font-medium transition-all gap-1.5 focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none";
  const navClass = (active: boolean, highlight?: boolean) =>
    active
      ? "bg-brand/15 text-brand-300 font-bold border border-brand/40 shadow-inner"
      : highlight
        ? "bg-white/5 text-brand-300 hover:bg-white/10 border border-brand/30"
        : "text-white/75 hover:bg-white/5 hover:text-white border border-transparent";

  return (
    <header className="text-white sticky top-0 z-50" dir="rtl">
      {/* Top bar — institutional descriptor (world-class subtle) */}
      <div className="hidden lg:flex items-center justify-between px-4 py-1.5 bg-ink-deep/90 backdrop-blur border-b border-white/5 text-[11px] text-white/50">
        <span className="font-mono tracking-widest">
          {brand.names.siteName} — {brand.names.erp}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-brand-300" /> {brand.contact.phone}
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span className="font-mono text-brand-300">
            {brand.names.erp} v{brand.names.version}
          </span>
        </span>
      </div>
      <div
        className={`bg-ink/75 backdrop-blur-2xl border-b transition-all duration-500 ${scrolled ? "border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]" : "border-white/5"}`}
      >
        <div
          className={`max-w-7xl mx-auto px-4 flex items-center justify-between gap-3 transition-all duration-300 ${
            scrolled ? "py-1.5" : "py-2.5"
          }`}
        >
          {/* Brand — identity lockup */}
          <div
            className="flex items-center gap-3 cursor-pointer group/brand shrink-0"
            onClick={() => setLocation("/")}
            role="link"
            aria-label="alhusainiaye — الصفحة الرئيسية"
          >
            <BrandLogo
              size={scrolled ? 32 : 38}
              className="transition-transform duration-300 group-hover/brand:scale-105 drop-shadow-[0_2px_10px_rgba(184,121,69,0.35)]"
            />
            <div className="hidden lg:flex items-center gap-2">
              {!publicOnly && (
                <span
                  className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border font-mono font-bold text-[10px] transition-colors ${
                    isOnline
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-300"
                  }`}
                  title={
                    isOnline
                      ? "متصل بالخادم"
                      : "وضع عدم الاتصال — ستتم المزامنة تلقائياً"
                  }
                >
                  {isSyncing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-rose-400"
                      }`}
                    />
                  )}
                  {isSyncing ? "مزامنة…" : isOnline ? "متصل" : "أوفلاين"}
                </span>
              )}
              {isAuthenticated && !publicOnly && (
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-brand/30 bg-brand/10 text-brand-300 font-mono font-bold text-[10px]">
                  <ShieldCheck className="w-3 h-3" />
                  {user?.name || "مشرف المنصة"}
                </span>
              )}
            </div>
          </div>

          {/* Helper tools — يسار الشريط وحده — أدوات مساعدة منفصلة عن التنقل الرئيسي */}
          <div className="hidden lg:flex items-center gap-1.5 border-r border-white/10 pr-3 mr-1">
            <button
              onClick={() =>
                window.dispatchEvent(new Event("alh:open-command"))
              }
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 h-7 px-2.5 rounded-lg text-[11px] transition-colors"
              aria-label="بحث شامل — اكتمال تلقائي"
              title="بحث شامل (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-brand-300" />
              <span className="hidden xl:inline">بحث</span>
            </button>
            <ThemeSwitcher compact />
            <button
              onClick={handleLanguageToggle}
              className="flex items-center gap-1 text-white/50 hover:text-white h-7 px-2 rounded-lg hover:bg-white/5 text-[11px] transition-colors"
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

            {/* القوائم المنسدلة الغنية */}
            {MEGA_CLUSTERS.map(cluster => {
              const ClusterIcon = cluster.icon;
              const items = cluster.paths
                .map(p => NAV_BY_PATH.get(p))
                .filter((i): i is NavItem => Boolean(i));
              const isOpen = openCluster === cluster.key;
              const containsActive = items.some(i => location === i.path);
              return (
                <div
                  key={cluster.key}
                  className="relative"
                  onMouseEnter={() => {
                    setOpenCluster(cluster.key);
                    cluster.paths.forEach(p => prefetchRoute(p));
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
                    <ClusterIcon className="w-3.5 h-3.5 text-brand-300" />
                    {cluster.label}
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute top-full right-0 mt-2 min-w-[320px] rounded-2xl border border-brand/25 bg-ink-deep/95 backdrop-blur-2xl shadow-2xl shadow-black/60 p-2 origin-top"
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
                              className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-right transition-colors duration-200 group/item ${isActive ? "bg-brand/10" : "hover:bg-white/5"}`}
                            >
                              <span className="mt-0.5 w-9 h-9 shrink-0 rounded-lg bg-brand/10 border border-brand/25 text-brand-300 flex items-center justify-center transition-colors duration-300 group-hover/item:bg-brand group-hover/item:text-ink-deep">
                                <Icon className="w-4 h-4" />
                              </span>
                              <span className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                  {item.label}
                                  {item.highlight && (
                                    <span className="text-[9px] bg-brand/20 text-brand-300 px-1.5 py-0.5 rounded-full font-black">
                                      ERP
                                    </span>
                                  )}
                                </span>
                                {item.description && (
                                  <span className="text-[10px] text-white/50 leading-relaxed">
                                    {item.description}
                                  </span>
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

            {/* Free Trial CTA — للزوار فقط */}
            {!isAuthenticated && (
              <a
                href={uamexDemoLink()}
                target="_blank"
                rel="noopener"
                className="hidden lg:inline-flex items-center gap-1.5 bg-white/5 hover:bg-brand/15 border border-brand/40 text-brand-300 hover:text-white font-bold h-9 px-4 rounded-xl text-xs transition-all mr-1 hover:border-brand/60 hover:shadow-[0_0_20px_rgba(184,121,69,0.25)]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                ابدأ مجاناً
              </a>
            )}

            {/* Primary CTA — تأثير Shine انسيابي عند المرور */}
            <Button
              onClick={() => setLocation("/app")}
              className="relative overflow-hidden group/cta bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black h-9 px-4 rounded-xl shadow-lg shadow-brand/25 hover:shadow-brand/40 hover:-translate-y-px transition-all flex items-center gap-1.5 text-xs mr-1"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover/cta:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-l from-transparent via-white/40 to-transparent" />
              <Zap className="w-4 h-4 fill-current" />
              {isAuthenticated ? "لوحة التحكم" : "ابدأ الآن"}
              <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover/cta:-translate-x-0.5" />
            </Button>
          </nav>

          {isWorkspace && (
            <nav
              className="hidden md:flex items-center gap-1"
              aria-label="تنقل مساحة العمل"
            >
              {workspaceNav.map(item => {
                const Icon = item.icon;
                const active = location === item.path;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateOrScroll(item.path)}
                    className={`${baseBtn} ${navClass(active, item.highlight)}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/erp")}
                className={`${baseBtn} ${navClass(location === "/erp")}`}
                aria-current={location === "/erp" ? "page" : undefined}
              >
                <Layers className="h-3.5 w-3.5 text-brand-300" />
                المزيد
                <ChevronDown className="h-3 w-3" />
              </Button>
            </nav>
          )}

          {/* Actions — يمين الشريط: تنقل رئيسي فقط + إجراءات */}
          <div className="flex items-center gap-2">
            {/* Super-admin tenant switcher (owner only) */}
            {!publicOnly && <TenantSwitcher />}

            {/* Account security — login activity & map (signed-in users only) */}
            {isAuthenticated && !publicOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/security")}
                className="hidden sm:flex text-white/70 hover:text-white hover:bg-white/5 h-8 px-2.5 rounded-lg items-center gap-1.5 text-xs font-medium"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-brand-300" />
                <span>الأمان</span>
              </Button>
            )}

            {onOpenSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
                className="bg-white/5 border-white/15 text-white h-8 text-xs px-2.5 hover:bg-white/10 hidden sm:flex items-center gap-1"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>إعدادات</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-white p-2 h-9 w-9 hover:bg-white/5"
              aria-label="فتح القائمة"
              aria-expanded={mobileOpen}
            >
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
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="md:hidden absolute inset-x-3 top-full z-50 mt-2 rounded-2xl border border-white/10 bg-ink-deep/95 backdrop-blur-2xl shadow-2xl shadow-black/60 p-3 space-y-1.5 max-h-[calc(100dvh-110px)] overflow-y-auto"
              aria-label="قائمة التنقل"
            >
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-brand/15 text-brand-300 font-bold border border-brand/30"
                        : item.highlight
                          ? "text-brand-300 border border-brand/25 hover:bg-brand/10"
                          : "text-white/80 hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex flex-col items-start gap-0.5">
                      <span>{item.label}</span>
                      {item.description && (
                        <span className="text-[10px] text-white/40 font-normal">
                          {item.description}
                        </span>
                      )}
                    </span>
                    {item.highlight && (
                      <span className="mr-auto text-[9px] bg-brand/20 text-brand-300 px-2 py-0.5 rounded-full font-black">
                        ERP
                      </span>
                    )}
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/70 hover:bg-white/5"
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
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/70 hover:bg-white/5"
              >
                <Globe className="w-4 h-4 text-brand-300" />
                <span>العربية / English</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
