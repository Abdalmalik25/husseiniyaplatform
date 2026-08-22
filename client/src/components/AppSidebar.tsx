import React, { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, ChevronLeft, LogOut } from "lucide-react";
import { APP_NAV, UTILITY_LINKS } from "@/lib/nav";
import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandLogo";

/**
 * ────────────────────────────────────────────────────────────────────────
 * AppSidebar — Layer 2 navigation (authenticated app shell)
 * ────────────────────────────────────────────────────────────────────────
 *
 * A collapsible sidebar rendered inside the system pages only. Keeps the
 * marketing site header clean while giving power users one-click access
 * to every workspace. Utility tools live in a secondary section.
 */
export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false); // mobile drawer
  const { user, logout } = useAuth();

  const navClass = (active: boolean) =>
    active
      ? "bg-brand text-ink font-bold shadow"
      : "text-white/70 hover:bg-white/5 hover:text-white";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand mark only — the sidebar context makes the identity clear */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
        <BrandMark size={34} />
        {/* Close button (mobile) */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden mr-auto text-white/60 hover:text-white p-1"
          aria-label="إغلاق القائمة"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User badge */}
      {user && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full brand-gradient-warm flex items-center justify-center text-ink font-black text-xs shrink-0">
            {(user.name || "م").charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {user.name || "مشرف المنصة"}
            </p>
            <p className="text-[10px] text-brand-300">مدير النظام</p>
          </div>
        </div>
      )}

      {/* Primary app navigation */}
      <nav
        className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto"
        aria-label="تنقل النظام"
      >
        <p className="text-[9px] font-bold text-white/40 tracking-wider px-2 pb-1.5">
          مساحات العمل
        </p>
        {APP_NAV.map(item => {
          const Icon = item.icon;
          const isActive =
            location === item.path ||
            (item.path !== "/app" && location.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${navClass(isActive)}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.highlight && !isActive && (
                <span className="mr-auto w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              )}
            </button>
          );
        })}

        {/* Utility tools — secondary section */}
        <p className="text-[9px] font-bold text-white/40 tracking-wider px-2 pt-4 pb-1.5">
          أدوات مساعدة
        </p>
        {UTILITY_LINKS.map(item => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${navClass(isActive)}`}
            >
              <Icon className="w-4 h-4 shrink-0 opacity-80" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer: back to site + logout */}
      <div className="border-t border-white/10 p-2.5 space-y-1">
        <button
          onClick={() => setLocation("/")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>الموقع التعريفي</span>
        </button>
        {user && (
          <button
            onClick={async () => {
              await logout();
              setLocation("/");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-60 shrink-0 bg-ink border-l border-white/10 sticky top-0 h-screen z-40"
        dir="rtl"
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer trigger + drawer */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-50 bg-brand text-ink p-3 rounded-2xl shadow-2xl hover:scale-105 transition-transform"
        aria-label="فتح قائمة النظام"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" dir="rtl">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Drawer panel */}
          <aside className="relative w-72 max-w-[85vw] bg-ink border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
