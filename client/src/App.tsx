import { lazy, Suspense, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OfflineProvider } from "./lib/offline/OfflineContext";
import { FloatingSupportWidget } from "@/components/FloatingSupportWidget";
import { AliasAIAssistant } from "@/components/AliasAIAssistant";
import { InstallPrompt } from "@/components/InstallPrompt";
import { CommandPalette } from "@/components/CommandPalette";
import { SWUpdateToast } from "@/components/SWUpdateToast";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollManager } from "@/components/ScrollManager";
import { PageTitle } from "@/components/PageTitle";
import { OfflineBanner } from "@/components/OfflineBanner";
import { RequireAuth } from "@/components/RequireAuth";
import { I18nProvider } from "@/lib/i18n";
import { useWebVitals } from "@/lib/use-web-vitals";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const WorkspaceDashboard = lazy(() => import("@/pages/WorkspaceDashboard"));
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Portal = lazy(() => import("@/pages/Portal"));
const Download = lazy(() => import("@/pages/Download"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Contact = lazy(() => import("@/pages/Contact"));
const KnowledgeHub = lazy(() => import("@/pages/KnowledgeHub"));
const InteractiveCalculators = lazy(() => import("@/pages/InteractiveCalculators"));
const TechSolutions = lazy(() => import("@/pages/TechSolutions"));
const ProjectGovernance = lazy(() => import("@/pages/ProjectGovernance"));
const Commercial = lazy(() => import("@/pages/Commercial"));
const Reports = lazy(() => import("@/pages/Reports"));
const Store = lazy(() => import("@/pages/Store"));
const Settings = lazy(() => import("@/pages/Settings"));
const Integrate = lazy(() => import("@/pages/Integrate"));
const ErpPage = lazy(() => import("@/pages/ErpPage"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Security = lazy(() => import("@/pages/Security"));
const Procurement = lazy(() => import("@/pages/Procurement"));
const ProcurementWorkspace = lazy(() => import("@/pages/ProcurementWorkspace"));
const SupplierAnalytics = lazy(() => import("@/pages/SupplierAnalytics"));
const Projects = lazy(() => import("@/pages/Projects"));
const HR = lazy(() => import("@/pages/HR"));
const SupportQuality = lazy(() => import("@/pages/SupportQuality"));
const POS = lazy(() => import("@/pages/POS"));
const Permissions = lazy(() => import("@/pages/Permissions"));
const BasicData = lazy(() => import("@/pages/BasicData"));
const Journal = lazy(() => import("@/pages/Journal"));
const ManualJournal = lazy(() => import("@/pages/ManualJournal"));
const Customization = lazy(() => import("@/pages/Customization"));
const Branches = lazy(() => import("@/pages/Branches"));
const Audit = lazy(() => import("@/pages/Audit"));
const Requisitions = lazy(() => import("@/pages/Requisitions"));
const Operations = lazy(() => import("@/pages/Operations"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Billing = lazy(() => import("@/pages/Billing"));

/**
 * Full splash — ONLY for the initial application boot.
 * Deliberately single-indicator (one thin line + brand mark): the previous
 * version stacked three progress elements and re-appeared on every route
 * change, which users read as duplicated/broken loading. Route-level chunk
 * loads now use the lightweight <RouteLoader /> below instead.
 */
function PageSplash() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-ink-deep/95 backdrop-blur-md font-display"
      dir="rtl"
      role="status"
      aria-label="جاري التحميل"
    >
      <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] shadow-2xl backdrop-blur-xl max-w-xs w-[88%] text-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-brand/15 border border-brand/40 flex items-center justify-center text-brand-300 font-black text-lg animate-pulse shadow-lg">
            H
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-brand/20 blur-md -z-10 animate-pulse" />
        </div>

        <div>
          <div className="text-sm font-black text-white">مؤسسة الحسينية</div>
          <div className="text-[10px] text-white/50 tracking-wider font-mono mt-0.5">
            UAMEX ERP ECOSYSTEM
          </div>
        </div>

        {/* Single indeterminate progress line */}
        <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden mt-2 relative">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-brand to-amber-300 rounded-full animate-bounce-up" />
        </div>
      </div>
    </div>
  );
}

/**
 * RouteLoader — minimal inline loader for subsequent lazy-route navigations.
 * No full-screen takeover: the previous page stays visible underneath, so
 * navigation feels continuous instead of "loading screen → loading screen".
 */
function RouteLoader() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="status"
      aria-label="جاري تحميل الصفحة"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand/25 border-t-brand animate-spin" />
        <span className="text-[11px] text-muted-foreground font-semibold">
          جاري تحميل الصفحة…
        </span>
      </div>
    </div>
  );
}

function Router() {
  // The heavy splash belongs to the first boot only; every later Suspense
  // suspension (lazy route chunk) gets the light loader.
  const initialBootRef = useRef(true);
  useEffect(() => {
    initialBootRef.current = false;
  }, []);
  const BootFallback = initialBootRef.current ? PageSplash : RouteLoader;

  return (
    <>
      {/* Live document.title per route (SEO + tab readability) + native-style
          scroll restoration (back/forward returns to the exact position). */}
      <PageTitle />
      <ScrollManager />

      {/* #main-content anchors the skip-to-content link at the very top of
          App for keyboard & screen-reader users (WCAG 2.4.1). */}
      <div id="main-content" tabIndex={-1} className="focus:outline-none">
        <Suspense fallback={<BootFallback />}>
      <Switch>
        {/* ── Public marketing & guest pages (no session required) ── */}
        <Route path={"/"} component={Landing} />
        <Route path={"/login"} component={Login} />
        <Route path={"/about"} component={About} />
        <Route path={"/portal"} component={Portal} />
        <Route path={"/download"} component={Download} />
        <Route path={"/pricing"} component={Pricing} />
        <Route path={"/contact"} component={Contact} />
        <Route path={"/insights"} component={KnowledgeHub} />
        <Route path={"/tools"} component={InteractiveCalculators} />
        <Route path={"/solutions"} component={TechSolutions} />
        <Route path={"/governance"} component={ProjectGovernance} />
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
        <Route path={"/inventory"}>
          <RequireAuth>
            <Inventory />
          </RequireAuth>
        </Route>
        <Route path={"/store"}>
          <RequireAuth>
            <Store />
          </RequireAuth>
        </Route>
        <Route path={"/security"}>
          <RequireAuth>
            <Security />
          </RequireAuth>
        </Route>
        <Route path={"/procurement-workspace"}>
          <RequireAuth>
            <ProcurementWorkspace />
          </RequireAuth>
        </Route>
        <Route path={"/supplier-analytics"}>
          <RequireAuth>
            <SupplierAnalytics />
          </RequireAuth>
        </Route>
        <Route path={"/procurement"}>
          <RequireAuth>
            <Procurement />
          </RequireAuth>
        </Route>
        <Route path={"/projects"}>
          <RequireAuth>
            <Projects />
          </RequireAuth>
        </Route>
        <Route path={"/hr"}>
          <RequireAuth>
            <HR />
          </RequireAuth>
        </Route>
        <Route path={"/support"}>
          <RequireAuth>
            <SupportQuality />
          </RequireAuth>
        </Route>
        <Route path={"/pos"}>
          <RequireAuth>
            <POS />
          </RequireAuth>
        </Route>
        <Route path={"/permissions"}>
          <RequireAuth>
            <Permissions />
          </RequireAuth>
        </Route>
        <Route path={"/basic-data"}>
          <RequireAuth>
            <BasicData />
          </RequireAuth>
        </Route>
        <Route path={"/journal"}>
          <RequireAuth>
            <Journal />
          </RequireAuth>
        </Route>
        <Route path={"/manual-journal"}>
          <RequireAuth>
            <ManualJournal />
          </RequireAuth>
        </Route>
        <Route path={"/customization"}>
          <RequireAuth>
            <Customization />
          </RequireAuth>
        </Route>
        <Route path={"/branches"}>
          <RequireAuth>
            <Branches />
          </RequireAuth>
        </Route>
        <Route path={"/audit"}>
          <RequireAuth>
            <Audit />
          </RequireAuth>
        </Route>
        <Route path={"/requisitions"}>
          <RequireAuth>
            <Requisitions />
          </RequireAuth>
        </Route>
        <Route path={"/operations"}>
          <RequireAuth>
            <Operations />
          </RequireAuth>
        </Route>
        <Route path={"/analytics"}>
          <RequireAuth>
            <Analytics />
          </RequireAuth>
        </Route>
        <Route path={"/billing"}>
          <RequireAuth>
            <Billing />
          </RequireAuth>
        </Route>
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
        </Switch>
        </Suspense>
      </div>
    </>
  );
}

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      let updateInterval: ReturnType<typeof setInterval> | null = null;
      navigator.serviceWorker
        .register("/sw.js")
        .then(reg => {
          updateInterval = setInterval(() => reg.update(), 300_000);
        })
        .catch(err => console.warn("[SW] Registration failed:", err));
      return () => {
        if (updateInterval) clearInterval(updateInterval);
      };
    }
  }, []);

  // Prefetch sibling page chunks after first paint — but *politely*:
  //   • Skipped entirely for Save-Data / 2G visitors (their data quota wins).
  //   • Warmed ONE chunk at a time so background traffic never competes with
  //     user-initiated requests on slow links.
  //   • Highest-traffic routes queued first.
  useEffect(() => {
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    if (nav.connection?.saveData) return;
    if (nav.connection?.effectiveType && /^(slow-)?2g$/.test(nav.connection.effectiveType))
      return;

    const chunks: Array<() => Promise<unknown>> = [
      () => import("@/pages/Login"),
      () => import("@/pages/Pricing"),
      () => import("@/pages/Home"),
      () => import("@/pages/WorkspaceDashboard"),
      () => import("@/pages/Reports"),
      () => import("@/pages/Commercial"),
      () => import("@/pages/Download"),
      () => import("@/pages/Journal"),
      () => import("@/pages/Store"),
      () => import("@/pages/Procurement"),
      () => import("@/pages/Projects"),
      () => import("@/pages/HR"),
      () => import("@/pages/SupportQuality"),
      () => import("@/pages/POS"),
      () => import("@/pages/Permissions"),
      () => import("@/pages/BasicData"),
      () => import("@/pages/ManualJournal"),
      () => import("@/pages/Customization"),
      () => import("@/pages/Branches"),
      () => import("@/pages/Audit"),
      () => import("@/pages/Requisitions"),
      () => import("@/pages/Operations"),
      () => import("@/pages/Analytics"),
      () => import("@/pages/Billing"),
      () => import("@/pages/Settings"),
      () => import("@/pages/Inventory"),
      () => import("@/pages/Security"),
      () => import("@/pages/ErpPage"),
      () => import("@/pages/Integrate"),
      () => import("@/pages/Portal"),
    ];

    let i = 0;
    let cancelled = false;
    const pump = () => {
      if (cancelled || i >= chunks.length) return;
      void chunks[i++]()
        .then(() => {
          if (!cancelled) window.setTimeout(pump, 300); // breathe between chunks
        })
        .catch(() => {});
    };

    const idle =
      (window as Window &
        typeof globalThis & {
          requestIdleCallback: (cb: () => void) => number;
        }).requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 2000));
    const t = idle(pump);
    return () => {
      cancelled = true;
      if (typeof t === "number") clearTimeout(t);
    };
  }, []);

  // Collect Core Web Vitals (CLS, INP, LCP) for real-user monitoring.
  useWebVitals({ reportOnce: true });

  return (
    <I18nProvider>
      <ErrorBoundary>
        {/* Keyboard/screen-reader shortcut to jump straight to the page content,
            skipping the header & floating widgets (WCAG 2.4.1 "Bypass Blocks"). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[95] focus:bg-brand focus:text-ink focus:px-4 focus:py-2 focus:rounded-lg focus:font-black focus:text-xs focus:shadow-xl"
        >
          تخطّ إلى المحتوى الرئيسي
        </a>

        <ThemeProvider defaultTheme="light" switchable>
          <OfflineProvider>
            <OfflineBanner />
            <TooltipProvider>
              <Toaster />
              <Router />
              <ScrollProgress />
              <CommandPalette />
              <FloatingSupportWidget />
              <AliasAIAssistant />
              <InstallPrompt />
              <SWUpdateToast />
            </TooltipProvider>
          </OfflineProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </I18nProvider>
  );
}

export default App;
