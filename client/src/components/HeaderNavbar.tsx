import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { useOffline } from "@/lib/offline/OfflineContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/lib/brand";
import { NAV_ITEMS } from "@/lib/nav";

interface HeaderNavbarProps {
  institutionName?: string;
  onOpenSettings?: () => void;
}

export function HeaderNavbar({
  institutionName = "مؤسسة الحسينية لخدمات الأعمال",
  onOpenSettings,
}: HeaderNavbarProps) {
  const [location, setLocation] = useLocation();
  const { isOnline, isSyncing } = useOffline();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const baseBtn =
    "h-9 px-3 text-xs font-medium transition-all gap-1.5";
  const navClass = (active: boolean, highlight?: boolean) =>
    active
      ? "bg-brand text-ink font-bold shadow"
      : highlight
        ? "bg-white/5 text-brand-300 hover:bg-white/10 border border-brand/30"
        : "text-white/75 hover:bg-white/5 hover:text-white";

  return (
    <header
      className="bg-ink text-white shadow-lg sticky top-0 z-50 border-b border-white/10"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        {/* Brand & Title */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setLocation("/")}
        >
          <BrandLogo size={38} />
          <div>
            <h1 className="text-sm md:text-base font-bold tracking-wide font-display text-white flex items-center gap-1.5">
              {institutionName}
              <span className="hidden sm:inline-block text-[10px] bg-brand/20 text-brand-300 px-2 py-0.5 rounded-full border border-brand/40">
                ومكتبة الحسينية الحديثة
              </span>
            </h1>
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
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="التنقل الرئيسي">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => setLocation(item.path)}
                aria-current={isActive ? "page" : undefined}
                className={`${baseBtn} ${navClass(isActive, item.highlight)}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Button>
            );
          })}
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
            onClick={() => {
              const current = document.documentElement.lang || "ar";
              const next = current === "ar" ? "en" : "ar";
              document.documentElement.lang = next;
              document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
            }}
            className="text-white/70 hover:text-white hover:bg-white/5 h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium"
            aria-label="تبديل اللغة"
          >
            <Globe className="w-3.5 h-3.5 text-brand-300" />
            <span>العربية / EN</span>
          </Button>

          {/* Role & Language Selector Badge */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/settings")}
            className="bg-white/5 border-brand/40 text-brand-300 h-8 text-[11px] px-2.5 hover:bg-white/10 hidden sm:flex items-center gap-1 font-bold"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>مدير النظام (العربية)</span>
          </Button>

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
        <div className="md:hidden bg-ink-deep border-t border-white/10 px-4 py-3 space-y-1.5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  setLocation(item.path);
                  setMobileOpen(false);
                }}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-brand text-ink font-bold"
                    : "text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
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
              const current = document.documentElement.lang || "ar";
              const next = current === "ar" ? "en" : "ar";
              document.documentElement.lang = next;
              document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
              setMobileOpen(false);
            }}
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
