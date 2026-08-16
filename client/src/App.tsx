import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OfflineProvider } from "./lib/offline/OfflineContext";

const Home = lazy(() => import("@/pages/Home"));
const Download = lazy(() => import("@/pages/Download"));
const Commercial = lazy(() => import("@/pages/Commercial"));
const Reports = lazy(() => import("@/pages/Reports"));
const Store = lazy(() => import("@/pages/Store"));

function PageSplash() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0d1b1c",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        color: "#f0ebe3",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "#b87945",
          color: "#102a2b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 24,
        }}
      >
        أ
      </div>
      <div style={{ marginTop: 14, fontWeight: 700, fontSize: 15 }}>
        ALHUSAINIA | نظام الحسابات
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: "#8fa3a4" }}>
        مؤسسة الحسينية لخدمات الأعمال — جاري تجهيز المنصة…
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageSplash />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/download"} component={Download} />
        <Route path={"/store"} component={Store} />
        <Route path={"/commercial"} component={Commercial} />
        <Route path={"/reports"} component={Reports} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      let updateInterval: ReturnType<typeof setInterval> | null = null;
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope);
          updateInterval = setInterval(() => reg.update(), 60_000);
        })
        .catch((err) => console.warn("[SW] Registration failed:", err));
      return () => {
        if (updateInterval) clearInterval(updateInterval);
      };
    }
  }, []);

  // Prefetch sibling page chunks after first paint so navigation feels instant.
  useEffect(() => {
    const idle =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 2000));
    const t = idle(() => {
      import("@/pages/Reports").catch(() => {});
      import("@/pages/Commercial").catch(() => {});
      import("@/pages/Download").catch(() => {});
    });
    return () => {
      if (typeof t === "number") clearTimeout(t);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <OfflineProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </OfflineProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;