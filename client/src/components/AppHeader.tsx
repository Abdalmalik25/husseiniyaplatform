import React from "react";
import { useLocation } from "wouter";
import { Search, Menu, X, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOffline } from "@/lib/offline/OfflineContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { APP_NAV } from "@/lib/nav";

export function AppHeader({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const [location, setLocation] = useLocation();
  const { isOnline, isSyncing } = useOffline();
  const { user, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const current = APP_NAV.find(i => location === i.path || (i.path !== "/app" && location.startsWith(i.path)));

  return (
    <header className="sticky top-0 z-30 bg-ink border-b border-white/10 backdrop-blur-xl" dir="rtl">
      <div className="max-w-[1600px] mx-auto px-3 lg:px-4 flex items-center justify-between gap-3 h-[48px]">
        <div className="flex items-center gap-3 min-w-0">
          {onToggleSidebar && (
            <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="lg:hidden text-white/70 hover:text-white hover:bg-white/5 h-8 w-8 p-0">
              <Menu className="w-4 h-4" />
            </Button>
          )}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-white/40">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
            {isOnline ? "متصل" : "أوفلاين"}
            {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-brand-300" />}
          </span>
          <span className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs min-w-0">
            <span className="text-white/40 hidden md:inline">نظام التشغيل</span>
            <span className="text-white/20 hidden md:inline">/</span>
            <span className="font-bold text-white truncate">{current?.label ?? "لوحة التحكم"}</span>
            {current?.description && <span className="hidden xl:inline text-white/40 text-[11px] truncate">— {current.description}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => window.dispatchEvent(new Event("alh:open-command"))} className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-[11px]">
            <Search className="w-3.5 h-3.5 text-brand-300" />بحث<span className="hidden xl:inline-flex text-[10px] font-mono bg-white/10 border border-white/10 rounded px-1">⌘K</span>
          </button>
          <ThemeSwitcher compact />
          <TenantSwitcher />
          {isAuthenticated && (
            <span className="hidden md:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-brand/20 bg-brand/10 text-brand-300 text-[11px] font-bold">
              <ShieldCheck className="w-3 h-3" />{user?.name?.split(" ")[0] || "مشرف"}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(v => !v)} className="lg:hidden text-white p-2 h-8 w-8 hover:bg-white/5">
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
                <Icon className="w-4 h-4" />{item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
