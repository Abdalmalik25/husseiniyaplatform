import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OfflineProvider } from "./lib/offline/OfflineContext";
import { FloatingSupportWidget } from "@/components/FloatingSupportWidget";
import { InstallPrompt } from "@/components/InstallPrompt";
import { BrandMark } from "@/components/BrandLogo";
import { CommandPalette } from "@/components/CommandPalette";
import { RequireAuth } from "@/components/RequireAuth";
import { I18nProvider } from "@/lib/i18n";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const WorkspaceDashboard = lazy(() => import("@/pages/WorkspaceDashboard"));
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Portal = lazy(() => import("@/pages/Portal"));
const Download = lazy(() => import("@/pages/Download"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Contact = lazy(() => import("@/pages/Contact"));
const Commercial = lazy(() => import("@/pages/Commercial"));
const Reports = lazy(() => import("@/pages/Reports"));
const Store = lazy(() => import("@/pages/Store"));
const Settings = lazy(() => import("@/pages/Settings"));
const Integrate = lazy(() => import("@/pages/Integrate"));
const ErpPage = lazy(() => import("@/pages/ErpPage"));

function PageSplash() {
  return (
    <div className="fixed inset-0 bg-[#0d1b1c] flex flex-col items-center justify-center font-system-ui text-[#f0ebe3] z-[9999]">
      <BrandMark size={56} className="rounded-2xl shadow-lg" />
      <div className="mt-3.5 font-bold text-[15px]">
        ALHUSAINIA | منصة الحسينية
      </div>
        <div className="mt-1.5 text-[11px] text-[#8fa3a4]">
          مؤسسة الحسينية لخدمات الأعمال — جاري التحميل…
        </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageSplash />}>
      <Switch>
        {/* ── Public marketing & guest pages (no session required) ── */}
        <Route path={"/"} component={Landing} />
        <Route path={"/login"} component={Login} />
        <Route path={"/about"} component={About} />
        <Route path={"/portal"} component={Portal} />
        <Route path={"/download"} component={Download} />
        <Route path={"/pricing"} component={Pricing} />
        <Route path={"/contact"} component={Contact} />
        <Route path={"/integrate"} component={Integrate} />

        {/* ── Operational pages (login + subscription required) ── */}
        <Route path={"/app"}>
          <RequireAuth>
            <WorkspaceDashboard />
          </RequireAuth>
        </Route>
        <Route path={"/accounting"}>
          <RequireAuth>
            <Home />
          </RequireAuth>
        </Route>
        <Route path={"/commercial"}>
          <RequireAuth>
            <Commercial />
          </RequireAuth>
        </Route>
        <Route path={"/reports"}>
          <RequireAuth>
            <Reports />
          </RequireAuth>
        </Route>
        <Route path={"/settings"}>
          <RequireAuth>
            <Settings />
          </RequireAuth>
        </Route>
        <Route path={"/erp"}>
          <RequireAuth>
            <ErpPage />
          </RequireAuth>
        </Route>
        <Route path={"/store"}>
          <RequireAuth>
            <Store />
          </RequireAuth>
        </Route>
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
        .then(reg => {
          console.log("[SW] Registered:", reg.scope);
          updateInterval = setInterval(() => reg.update(), 300_000);
        })
        .catch(err => console.warn("[SW] Registration failed:", err));
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
    <I18nProvider>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="light">
          <OfflineProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
              <CommandPalette />
              <FloatingSupportWidget />
              <InstallPrompt />
            </TooltipProvider>
          </OfflineProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </I18nProvider>
  );
}

export default App;
