import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Command } from "cmdk";
import {
  Building2,
  BarChart3,
  Layers,
  Search,
  Settings,
  Globe2,
  Home as HomeIcon,
  Phone,
  FileText,
  Zap,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { MODULE_LIST } from "@/lib/design";
import { whatsappLink } from "@/lib/brand";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  hint?: string;
}

const NAV: NavItem[] = [
  { label: "الرئيسية والتسويق", path: "/", icon: HomeIcon },
  { label: "مساحات العمل والأنظمة", path: "/app", icon: Layers },
  { label: "التعريف بالخدمات", path: "/about", icon: FileText },
  { label: "الأسعار والباقات", path: "/pricing", icon: CreditCard },
  { label: "تواصل معنا", path: "/contact", icon: Phone },
  { label: "بوابة التتبع", path: "/portal", icon: Search },
  { label: "العمليات التجارية", path: "/commercial", icon: Building2 },
  { label: "التقارير المالية", path: "/reports", icon: BarChart3 },
  { label: "مركز التكامل", path: "/integrate", icon: Globe2 },
  { label: "تحميل التطبيق", path: "/download", icon: Zap },
  { label: "إعدادات المؤسسة", path: "/settings", icon: Settings },
];

/**
 * Global Command Palette (⌘K / Ctrl+K) — the signature navigation surface of
 * world-class SaaS. Lets power users jump to any module or run an action
 * without leaving the keyboard. Self-contained and mounted once at the app root.
 */
export function CommandPalette() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    const onOpenEvent = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("alh:open-command", onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("alh:open-command", onOpenEvent);
    };
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="لوحة الأوامر"
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[12vh]"
    >
      <div className="w-full max-w-xl bg-card text-card-foreground rounded-2xl shadow-2xl overflow-hidden border border-border">
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Command.Input
            placeholder="ابحث عن صفحة، وحدة، أو إجراء…"
            className="flex-1 h-12 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="text-center text-xs text-muted-foreground py-8">
            لا توجد نتائج مطابقة.
          </Command.Empty>

          <Command.Group
            heading="التنقل السريع"
            className="px-1 py-1 text-[10px] font-bold text-muted-foreground uppercase"
          >
            {NAV.map(item => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.path}
                  value={`${item.label} ${item.path}`}
                  onSelect={() => go(item.path)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground cursor-pointer hover:bg-brand hover:text-ink aria-selected:bg-brand aria-selected:text-ink"
                >
                  <Icon className="w-4 h-4 text-brand" />
                  <span className="flex-1">{item.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>

          <Command.Group
            heading="الوحدات التشغيلية"
            className="px-1 py-1 text-[10px] font-bold text-muted-foreground uppercase"
          >
            {MODULE_LIST.map(m => {
              const Icon = m.icon;
              return (
                <Command.Item
                  key={m.key}
                  value={`وحدة ${m.label} ${m.en}`}
                  onSelect={() => go("/app")}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 cursor-pointer hover:bg-[#0e2a2b] hover:text-white aria-selected:bg-[#0e2a2b] aria-selected:text-white"
                >
                  <Icon className="w-4 h-4" style={{ color: m.accent }} />
                  <span className="flex-1">{m.label}</span>
                  <span className="text-[10px] text-slate-400">
                    {m.tagline}
                  </span>
                </Command.Item>
              );
            })}
          </Command.Group>

          <Command.Group
            heading="الإجراءات"
            className="px-1 py-1 text-[10px] font-bold text-muted-foreground uppercase"
          >
            <Command.Item
              value="تواصل واتساب دعم"
              onSelect={() => {
                setOpen(false);
                window.open(
                  whatsappLink("السلام عليكم مؤسسة الحسينية، أحتاج دعماً."),
                  "_blank"
                );
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 cursor-pointer hover:bg-[#0e2a2b] hover:text-white aria-selected:bg-[#0e2a2b] aria-selected:text-white"
            >
              <Phone className="w-4 h-4 text-[#b87945]" />
              <span className="flex-1">تواصل واتساب مع الدعم</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
