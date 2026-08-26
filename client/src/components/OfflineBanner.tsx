import { useEffect, useRef } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { useOffline } from "@/lib/offline/OfflineContext";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * OfflineBanner — a friendly, non-blocking status strip shown above the page
 * when the visitor loses their connection.
 *
 * Copy promise: tells the user (a) what happened, (b) that their work is safe
 * locally, and (c) that sync will resume automatically. Restoring the link
 * shows a success toast. Visitors (unauthenticated) get the banner without the
 * sync button since there is nothing to push to the server.
 *
 * Placement: fixed above the sticky header (z-80 > header z-50) so it always
 * reads as a system-level status, not a page-level error.
 */
export function OfflineBanner() {
  const { isOnline, isSyncing, syncNow } = useOffline();
  const { isAuthenticated } = useAuth();
  const wasOffline = useRef(false);

  // When the link comes back, announce it with a toast — users often don't
  // notice a tiny icon flip, but they DO notice their data syncing.
  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      import("sonner").then(({ toast }) => {
        toast.success("تمت استعادة الاتصال", {
          description: "تتم مزامنة بياناتك تلقائياً الآن.",
          duration: 5000,
        });
      });
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className="fixed inset-x-0 top-0 z-[80] bg-gradient-to-l from-amber-500 to-amber-400 text-ink text-xs font-bold shadow-lg shadow-black/25 animate-in slide-in-from-top-3 duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span className="leading-relaxed">
          لا يوجد اتصال — بياناتك محفوظة على جهازك وستتزامن تلقائياً عند عودة
          الشبكة
        </span>
        {isSyncing && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black opacity-80">
            <RefreshCw className="w-3 h-3 animate-spin" /> جارٍ المزامنة…
          </span>
        )}
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => {
              void syncNow();
            }}
            disabled={isSyncing}
            className="shrink-0 rounded-full bg-ink text-white px-3 py-1 text-[10px] font-black transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            مزامنة الآن
          </button>
        )}
      </div>
    </div>
  );
}
