import React, { useEffect, useRef, useState } from "react";
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
  Package,
  Users,
  type LucideIcon,
  AlertCircle,
  Clock,
} from "lucide-react";
import { MODULE_LIST } from "@/lib/design";
import { whatsappLink } from "@/lib/brand";
import { trpc } from "@/lib/trpc";

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
  { label: "التحليلات الذكية", path: "/analytics", icon: BarChart3 },
  { label: "التقارير المالية", path: "/reports", icon: BarChart3 },
  { label: "مركز التكامل", path: "/integrate", icon: Globe2 },
  { label: "تحميل التطبيق", path: "/download", icon: Zap },
  { label: "الاشتراك والفوترة", path: "/billing", icon: CreditCard },
  { label: "إعدادات المؤسسة", path: "/settings", icon: Settings },
];

interface CommandPaletteFeature {
  label: string;
  icon: LucideIcon;
  action: () => void;
  description?: string;
}

interface SearchResults {
  products: { id: number; name: string; code: string }[];
  customers: { id: number; name: string; code: string }[];
  suppliers: { id: number; name: string; code: string }[];
}

/**
 * Global Command Palette (⌘K / Ctrl+K) — the signature navigation surface of
 * world-class SaaS. Lets power users jump to any module, search live products
 * / customers / suppliers, or run an action without leaving the keyboard.
 * Self-contained and mounted once at the app root. Luxury refactor: enhanced
 * styling, quick-action shortcuts, and richer search results.
 */
export function CommandPalette() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    products: [],
    customers: [],
    suppliers: [],
  });
  const utils = trpc.useUtils();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    setLocation(path);
  };

  const QUICK_ACTIONS: CommandPaletteFeature[] = [
    {
      label: "إنشاء فاتورة جديدة",
      icon: FileText,
      action: () => go("/commercial/invoice/create"),
      description: "إنشاء فاتورة مبيعات أو مشتريات جديدة",
    },
    {
      label: "عرض القائمة الكاملة",
      icon: Building2,
      action: () => go("/commercial"),
      description: "عرض جميع المعاملات التجارية",
    },
    {
      label: "إدارة المخزون",
      icon: Package,
      action: () => go("/inventory"),
      description: "عرض وتحكم في مستويات المخزون",
    },
    {
      label: "فحص التنبيهات",
      icon: AlertCircle,
      action: () => go("/support-quality"),
      description: "عرض التنبيهات التنبؤية والحالة",
    },
    {
      label: "الجداول المجدولة",
      icon: Clock,
      action: () => go("/reports/scheduled"),
      description: "عرض وإدارة الجداول المجدولة",
    },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
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

  // Debounced live search across products / customers / suppliers.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults({ products: [], customers: [], suppliers: [] });
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const [p, c, s] = await Promise.all([
          utils.products.list.fetch({ search: q, limit: 5 }),
          utils.customers.list.fetch({ search: q, limit: 5 }),
          utils.suppliers.list.fetch({ search: q, limit: 5 }),
        ]);
        setResults({
          products: (p.items ?? []).map((x: any) => ({
            id: x.id,
            name: x.name,
            code: x.code,
          })),
          customers: (c.items ?? []).map((x: any) => ({
            id: x.id,
            name: x.name,
            code: x.code,
          })),
          suppliers: (s.items ?? []).map((x: any) => ({
            id: x.id,
            name: x.name,
            code: x.code,
          })),
        });
      } catch {
        // ignore — user may be logged out
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, utils]);

  const handleQuickAction = (action: CommandPaletteFeature) => {
    setOpen(false);
    setQuery("");
    action.action();
  };

  const hasResults =
    results.products.length ||
    results.customers.length ||
    results.suppliers.length;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
      label="لوحة الأوامر"
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-start justify-center pt-[12vh] transition-opacity duration-300"
    >
      <div
        className="w-full max-w-xl bg-gray-950 text-white rounded-3xl shadow-2xl overflow-hidden border border-white/10 backdrop-filter backdrop-blur-md"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-400" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="ابحث عن صفحة، منتج، عميل، أو مورد…"
            className="flex-1 h-14 bg-gray-900 text-white outline-none placeholder:text-gray-400 focus:bg-gray-800 transition-colors"
          />
          <kbd className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-1 font-mono">
            ESC
          </kbd>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
            title="إغلاق (Esc)"
          >
            ✕
          </button>
        </div>

        <Command.List className="max-h-[65vh] overflow-y-auto p-4">
          <Command.Empty className="text-center text-sm text-gray-500 py-12">
            لا توجد نتائج مطابقة.
          </Command.Empty>

          {hasResults && (
            <Command.Group
              heading="نتائج البحث"
              className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              {results.products.map((p) => (
                <Command.Item
                  key={`p-${p.id}`}
                  value={`منتج ${p.name} ${p.code}`}
                  onSelect={() => go("/inventory")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Package className="w-4 h-4 text-[#b87945] shrink-0" />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-[10px] opacity-60">{p.code}</span>
                </Command.Item>
              ))}
              {results.customers.map((c) => (
                <Command.Item
                  key={`c-${c.id}`}
                  value={`عميل ${c.name} ${c.code}`}
                  onSelect={() => go("/commercial")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Users className="w-4 h-4 text-[#1f7a6d] shrink-0" />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-[10px] opacity-60">{c.code}</span>
                </Command.Item>
              ))}
              {results.suppliers.map((s) => (
                <Command.Item
                  key={`s-${s.id}`}
                  value={`مورد ${s.name} ${s.code}`}
                  onSelect={() => go("/commercial")}
                  className="flex items-center gap-3 px^4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Building2 className="w-4 h-4 text-[#0e2a2b] shrink-0" />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-[10px] opacity-60">{s.code}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {hasResults && (
            <Command.Group
              heading="التنقل السريع"
              className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.path}
                    value={`${item.label} ${item.path}`}
                    onSelect={() => go(item.path)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <Icon className="w-4 h-4 text-brand shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {hasResults && (
            <Command.Group
              heading="الوحدات التشغيلية"
              className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              {MODULE_LIST.map((m) => {
                const Icon = m.icon;
                return (
                  <Command.Item
                    key={m.key}
                    value={`وحدة ${m.label} ${m.en}`}
                    onSelect={() => go("/app")}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: m.accent }} shrink-0 />
                    <span className="flex-1">{m.label}</span>
                    <span className="text-[10px] text-gray-400">{m.tagline}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {/* QUICK ACTIONS SECTION */}
          {QUICK_ACTIONS.length > 0 && (
            <Command.Group
              heading="الإجراءات السريعة"
              className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              {QUICK_ACTIONS.map((f) => (
                <Command.Item
                  key={f.label}
                  value={f.label}
                  onSelect={() => handleQuickAction(f)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <f.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{f.label}</span>
                  <span className="text-[10px] opacity-60 capitalize">{f.description || ""}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group
            heading="الإجراءات"
            className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider"
          >
            <Command.Item
              value="تواصل واتساب دعم"
              onSelect={() => {
                setOpen(false);
                setQuery("");
                window.open(
                  whatsappLink("السلام عليكم مؤسسة الحسينية، أحتاج دعماً."),
                  "_blank"
                );
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Phone className="w-4 h-4 text-[#b87945] shrink-0" />
              <span className="flex-1">تواصل واتساب مع الدعم</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}