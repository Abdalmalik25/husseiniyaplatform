import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  LogOut,
  Bell,
  MessageSquare,
  Globe,
} from "lucide-react";
import { APP_NAV, UTILITY_LINKS } from "@/lib/nav";
import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function NotificationBell({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: count } = trpc.modules.notifications.unreadCount.useQuery();
  const { data: items, isPending } = trpc.modules.notifications.list.useQuery(
    undefined,
    { enabled: open }
  );
  const markRead = trpc.modules.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.modules.notifications.unreadCount.invalidate();
      utils.modules.notifications.list.invalidate();
    },
  });
  const markAll = trpc.modules.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.modules.notifications.unreadCount.invalidate();
      utils.modules.notifications.list.invalidate();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="الإشعارات"
          title="الإشعارات"
          className={`relative rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/5 hover:text-white ${
            compact ? "" : "mr-auto"
          }`}
        >
          <Bell className="h-4 w-4" />
          {count ? (
            <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> الإشعارات
            {count ? (
              <Badge className="bg-rose-100 text-rose-700 text-[10px]">
                {count} غير مقروء
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isPending ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              جاري التحميل...
            </p>
          ) : (items ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              لا توجد إشعارات
            </p>
          ) : (
            (items ?? []).map((n: any) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead.mutate({ id: n.id });
                  if (n.link) {
                    setLocation(n.link);
                    setOpen(false);
                  }
                }}
                className={`w-full rounded-xl border p-2.5 text-right transition hover:bg-muted/40 ${
                  n.isRead ? "bg-transparent opacity-60" : "bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-foreground">
                    {n.title}
                  </span>
                  {!n.isRead && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {n.body}
                </p>
              </button>
            ))
          )}
        </div>
        {(items ?? []).length > 0 && (
          <button
            onClick={() => markAll.mutate()}
            className="w-full rounded-lg bg-brand/10 py-2 text-[11px] font-medium text-brand hover:bg-brand/20"
          >
            تعليم الكل كمقروء
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MessagesButton({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [withUser, setWithUser] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [toUser, setToUser] = useState<string>("");
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: unread } = trpc.modules.messages.unreadCount.useQuery();
  const { data: inbox, isPending: inboxPending } =
    trpc.modules.messages.listInbox.useQuery(undefined, { enabled: open });
  const { data: users } = trpc.modules.rbac.listUsers.useQuery(undefined, {
    enabled: open,
  });
  const { data: thread, isPending: threadPending } =
    trpc.modules.messages.listWith.useQuery(
      { userId: withUser! },
      { enabled: open && !!withUser }
    );
  const markRead = trpc.modules.messages.markRead.useMutation({
    onSuccess: () => {
      utils.modules.messages.unreadCount.invalidate();
      utils.modules.messages.listInbox.invalidate();
    },
  });
  const send = trpc.modules.messages.send.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال الرسالة");
      setBody("");
      utils.modules.messages.listInbox.invalidate();
      if (withUser)
        utils.modules.messages.listWith.invalidate({ userId: withUser });
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الإرسال"),
  });

  const me = String(user?.id ?? -1);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="الرسائل"
          title="الرسائل"
          className={`relative rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/5 hover:text-white ${
            compact ? "" : "mr-auto"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          {unread ? (
            <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" /> الرسائل المباشرة
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {/* Inbox */}
          <div className="max-h-80 overflow-y-auto space-y-1 rounded-lg border p-2">
            <p className="mb-1 text-[11px] font-bold text-muted-foreground">
              الوارد
            </p>
            {inboxPending ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                جاري التحميل...
              </p>
            ) : (inbox ?? []).length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                لا رسائل
              </p>
            ) : (
              (inbox ?? []).map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setWithUser(m.fromUserId);
                    setToUser(m.fromUserId);
                    if (!m.isRead) markRead.mutate({ id: m.id });
                  }}
                  className={`w-full rounded-lg border p-2 text-right transition hover:bg-muted/40 ${
                    m.isRead ? "opacity-60" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold text-foreground">
                      {m.fromName || m.fromUserId}
                    </span>
                    {!m.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {m.body}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Conversation */}
          <div className="flex max-h-80 flex-col rounded-lg border p-2">
            {withUser ? (
              <>
                <div className="mb-2 flex-1 space-y-1 overflow-y-auto">
                  {threadPending ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      جاري التحميل...
                    </p>
                  ) : (thread ?? []).length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      لا رسائل بعد
                    </p>
                  ) : (
                    (thread ?? []).map((m: any) => {
                      const mine = String(m.fromUserId) === me;
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[90%] rounded-lg p-2 text-[11px] ${
                            mine
                              ? "ml-auto bg-[#b87945] text-[#102a2b]"
                              : "mr-auto bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {m.body}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="mb-1 text-[10px] text-muted-foreground">
                  المحادثة مع:{" "}
                  {users?.find((u: any) => String(u.id) === withUser)?.name ??
                    withUser}
                </p>
              </>
            ) : (
              <p className="m-auto text-center text-xs text-muted-foreground">
                اختر مرسلاً من الوارد لعرض المحادثة
              </p>
            )}
          </div>
        </div>

        {/* Send box */}
        <div className="space-y-2 border-t pt-2">
          <select
            value={toUser}
            onChange={(e) => {
              setToUser(e.target.value);
              setWithUser(e.target.value || null);
            }}
            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[12px]"
          >
            <option value="">اختر مستخدماً...</option>
            {(users ?? []).map((u: any) => (
              <option key={u.id} value={String(u.id)}>
                {u.name}
              </option>
            ))}
          </select>
          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-[12px]"
          />
          <Button
            size="sm"
            className="w-full bg-[#b87945] text-[#102a2b]"
            disabled={!toUser || !body.trim() || send.isPending}
            onClick={() => send.mutate({ toUserId: toUser, message: body })}
          >
            إرسال
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ────────────────────────────────────────────────────────────────────────
 * AppSidebar — Layer 2 navigation (authenticated app shell)
 * ────────────────────────────────────────────────────────────────────────
 *
 * A collapsible sidebar (desktop rail ↔ full, mobile drawer) that gives
 * power users one-click access to every workspace. Utility tools live in a
 * secondary section. Collapsing keeps dense screens uncluttered while
 * preserving instant navigation via icon tooltips.
 */
export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail
  const { user, logout } = useAuth();

  const renderSidebar = (variant: "desktop" | "drawer", isCollapsed: boolean) => {
    const isDrawer = variant === "drawer";
    const compact = isCollapsed && !isDrawer;

    const navClass = (active: boolean) =>
      active
        ? "bg-brand text-ink font-bold shadow relative"
        : "text-white/70 hover:bg-white/5 hover:text-white relative";

    return (
      <div className="flex flex-col h-full">
        {/* Brand mark + collapse / close controls */}
        <div className="flex items-center gap-2.5 px-3 py-4 border-b border-white/10">
          {!compact && <BrandMark size={34} />}
          {compact && (
            <div className="mx-auto">
              <BrandMark size={30} />
            </div>
          )}
          {isDrawer ? (
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden mr-auto text-white/60 hover:text-white p-1"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            !compact && (
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="mr-auto text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="طي القائمة"
                title="طي/توسيع القائمة"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            )
          )}
          {compact && !isDrawer && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="absolute top-3 left-2 text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="توسيع القائمة"
              title="توسيع القائمة"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* User badge */}
        {user && (
          <div
            className={`px-4 py-3 border-b border-white/10 flex items-center gap-2.5 ${
              compact ? "justify-center" : ""
            }`}
          >
            <NotificationBell compact={compact} />
            <MessagesButton compact={compact} />
            <div className="w-8 h-8 rounded-full brand-gradient-warm flex items-center justify-center text-ink font-black text-xs shrink-0">
              {(user.name || "م").charAt(0)}
            </div>
            {!compact && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user.name || "مشرف المنصة"}
                </p>
                <p className="text-[10px] text-brand-300">مدير النظام</p>
              </div>
            )}
          </div>
        )}

        {/* Primary app navigation */}
        <nav
          className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto"
          aria-label="تنقل النظام"
        >
          {!compact && (
            <p className="text-[9px] font-bold text-white/40 tracking-wider px-2 pb-1.5">
              مساحات العمل
            </p>
          )}
          {APP_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              location === item.path ||
              (item.path !== "/app" && location.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                aria-current={isActive ? "page" : undefined}
                title={compact ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${navClass(
                  isActive
                )} ${compact ? "justify-center" : ""}`}
              >
                {isActive && (
                  <span className="absolute inset-y-2 right-0 w-1 rounded-full bg-brand-300" />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                {!compact && <span className="truncate">{item.label}</span>}
                {!compact && item.highlight && !isActive && (
                  <span className="mr-auto w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                )}
              </button>
            );
          })}

          {/* Utility tools — secondary section */}
          {!compact && (
            <p className="text-[9px] font-bold text-white/40 tracking-wider px-2 pt-4 pb-1.5">
              أدوات مساعدة
            </p>
          )}
          {UTILITY_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                aria-current={isActive ? "page" : undefined}
                title={compact ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${navClass(
                  isActive
                )} ${compact ? "justify-center" : ""}`}
              >
                {isActive && (
                  <span className="absolute inset-y-2 right-0 w-1 rounded-full bg-brand-300" />
                )}
                <Icon className="w-4 h-4 shrink-0 opacity-80" />
                {!compact && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer: collapse toggle (desktop) + back to site + logout */}
        <div className="border-t border-white/10 p-2.5 space-y-1">
          {compact && !isDrawer && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="w-full flex items-center justify-center px-3 py-2 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-colors"
              aria-label="توسيع القائمة"
              title="توسيع القائمة"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setLocation("/")}
            title={compact ? "الموقع الإلكتروني والخدمات" : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/65 hover:bg-white/10 hover:text-white transition-colors ${
              compact ? "justify-center" : ""
            }`}
          >
            <Globe className="w-4 h-4 text-brand-300 shrink-0" />
            {!compact && <span>الموقع الإلكتروني والخدمات</span>}
          </button>
          {user && (
            <button
              onClick={async () => {
                await logout();
                setLocation("/");
              }}
              title={compact ? "تسجيل الخروج" : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200 transition-colors ${
                compact ? "justify-center" : ""
              }`}
            >
              <LogOut className="w-4 h-4" />
              {!compact && <span>تسجيل الخروج</span>}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-ink border-l border-white/10 sticky top-0 h-screen z-40 transition-[width] duration-300 ${
          collapsed ? "w-[76px]" : "w-60"
        }`}
        dir="rtl"
      >
        {renderSidebar("desktop", collapsed)}
      </aside>

      {/* Mobile drawer trigger + drawer */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-brand text-ink p-3 rounded-2xl shadow-2xl hover:scale-105 transition-transform"
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
            {renderSidebar("drawer", false)}
          </aside>
        </div>
      )}
    </>
  );
}
