import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Settings,
  Search,
  Menu,
  X,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import { useOffline } from "@/lib/offline/OfflineContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/contexts/ThemeContext";
import { BrandLogo } from "@/components/BrandLogo";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { MARKETING_NAV } from "@/lib/nav";
import { Zap, ArrowLeft, MessageSquare } from "lucide-react";
import { uamexDemoLink } from "@/lib/brand";

interface HeaderNavbarProps {
  institutionName?: string;
  onOpenSettings?: () => void;
}

export function HeaderNavbar({ onOpenSettings }: HeaderNavbarProps) {
  const [location, setLocation] = useLocation();
  const { isOnline, isSyncing } = useOffline();
  const { user, isAuthenticated } = useAuth();
  const { language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const baseBtn = "h-9 px-3 text-xs font-medium transition-all gap-1.5";
  const navClass = (active: boolean, highlight?: boolean) =>
    active
      ? "bg-brand text-ink font-bold shadow"
      : highlight
        ? "bg-white/5 text-brand-300 hover:bg-white/10 border border-brand/30"
        : "text-white/75 hover:bg-white/5 hover:text-white";

  const handleLanguageToggle = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  return (
    <header
      className={`text-white sticky top-0 z-50 border-b border-white/10 transition-all duration-300 ${
        scrolled
          ? "bg-ink/80 backdrop-blur-xl shadow-2xl shadow-black/40"
          : "bg-ink/95"
      }`}
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        {/* Brand — the logo lockup is the identity; no repeated names */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setLocation("/")}
        >
          <BrandLogo size={38} />
          <div className="flex items-center gap-2 text-[10px] text-brand font-mono">
            {isAuthenticated && (
              <span className="hidden sm:inline-flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-brand-300" />{" "}
                {user?.name || "مشرف المنصة"}
              </span>
            )}
            {isOnline ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> جاري
                    المزامنة...
                  </>
                ) : (
                  <>
                    <Wifi className="w-2.5 h-2.5" /> متصل
                  </>
                )}
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5">
                <WifiOff className="w-2.5 h-2.5" /> أوفلاين
              </span>
            )}
          </div>
        </div>

        {/* Desktop Navigation Links — marketing layer (5 items max) */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="التنقل الرئيسي"
        >
          {MARKETING_NAV.map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            const isAnchor = item.path.includes("#");
            const handleNavClick = () => {
              if (isAnchor) {
                const [pagePath, hash] = item.path.split("#");
                if (location !== pagePath && pagePath !== "/") {
                  setLocation(pagePath);
                  setTimeout(() => {
                    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 300);
                } else {
                  document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              } else {
                setLocation(item.path);
              }
            };
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={handleNavClick}
                aria-current={isActive ? "page" : undefined}
                className={`${baseBtn} ${navClass(isActive, item.highlight)} group relative`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
                {item.highlight && (
                  <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-brand animate-pulse" />
                )}
                <span
                  className={`absolute bottom-1 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-brand transition-all duration-300 ${
                    isActive ? "w-2/3" : "w-0 group-hover:w-2/3"
                  }`}
                />
              </Button>
            );
          })}

          {/* Free Trial CTA — shown only to visitors */}
          {!isAuthenticated && (
            <a
              href={uamexDemoLink()}
              target="_blank"
              rel="noopener"
              className="hidden lg:inline-flex items-center gap-1.5 bg-white/8 hover:bg-brand/15 border border-brand/40 text-brand-300 hover:text-white font-bold h-9 px-4 rounded-xl text-xs transition-all mr-1 hover:border-brand/60"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              ابدأ مجاناً
            </a>
          )}

          {/* Primary CTA — enter the system */}
          <Button
            onClick={() => setLocation("/app")}
            className="bg-brand hover:bg-brand-deep text-ink font-black h-9 px-4 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 text-xs mr-1"
          >
            <Zap className="w-4 h-4 fill-current" />
            {isAuthenticated ? "لوحة التحكم" : "دخول النظام"}
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </nav>

        {/* Actions & Mobile Menu Toggle */}
        <div className="flex items-center gap-2">
          {/* Command palette trigger (⌘K) */}
          <button
            onClick={() => window.dispatchEvent(new Event("alh:open-command"))}
            className="hidden lg:flex items-center gap-2 bg-white/5 border border-brand/30 text-white/75 hover:text-white hover:bg-white/10 h-8 px-2.5 rounded-lg text-[11px] transition-colors"
            aria-label="لوحة الأوامر"
          >
            <Search className="w-3.5 h-3.5 text-brand-300" />
            <span>بحث…</span>
            <kbd className="font-mono text-[9px] text-brand-300 border border-brand/40 rounded px-1">
              ⌘K
            </kbd>
          </button>

          {/* Language Toggle (Global Identity) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLanguageToggle}
            className="text-white/70 hover:text-white hover:bg-white/5 h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium"
            aria-label="تبديل اللغة"
          >
            <Globe className="w-3.5 h-3.5 text-brand-300" />
            <span>العربية / EN</span>
          </Button>

          {/* Theme Toggle (Light / Dark) — world-class a11y + persistence */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-white/70 hover:text-white hover:bg-white/5 h-8 w-8 p-0 rounded-lg flex items-center justify-center"
            aria-label={theme === "dark" ? "تبديل للوضع الفاتح" : "تبديل للوضع الداكن"}
            title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-brand-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-brand-300" />
            )}
          </Button>

          {/* Super-admin tenant switcher (owner only) */}
          <TenantSwitcher />

          {/* Account security — login activity & map (signed-in users only) */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/security")}
              className="text-white/70 hover:text-white hover:bg-white/5 h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium hidden sm:flex"
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

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-ink-deep border-t border-white/10 px-4 py-4 space-y-2">
          {/* Primary CTA on mobile */}
          <button
            onClick={() => { setLocation("/app"); setMobileOpen(false); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand text-ink font-black text-xs shadow-lg"
          >
            <Zap className="w-4 h-4 fill-current" />
            {isAuthenticated ? "لوحة التحكم" : "دخول النظام"}
          </button>

          {/* Free trial CTA for visitors */}
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

          {MARKETING_NAV.map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            const isAnchor = item.path.includes("#");
            const handleClick = () => {
              if (isAnchor) {
                const [pagePath, hash] = item.path.split("#");
                setMobileOpen(false);
                if (location !== "/" && pagePath === "/") {
                  setLocation("/");
                  setTimeout(() => {
                    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 350);
                } else {
                  document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              } else {
                setLocation(item.path);
                setMobileOpen(false);
              }
            };
            return (
              <button
                key={item.path}
                onClick={handleClick}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-brand text-ink font-bold"
                    : item.highlight
                      ? "text-brand-300 border border-brand/25 hover:bg-brand/10"
                      : "text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="mr-auto text-[9px] bg-brand/20 text-brand-300 px-2 py-0.5 rounded-full font-black">ERP</span>
                )}
              </button>
            );
          })}

          {onOpenSettings && (
            <button
              onClick={() => { onOpenSettings(); setMobileOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/70 hover:bg-white/5"
            >
              <Settings className="w-4 h-4" />
              <span>إعدادات المؤسسة</span>
            </button>
          )}
          <button
            onClick={() => { setLanguage(language === "ar" ? "en" : "ar"); setMobileOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/70 hover:bg-white/5"
          >
            <Globe className="w-4 h-4 text-brand-300" />
            <span>العربية / English</span>
          </button>
        </div>
      )}
    </header>
  );
}
