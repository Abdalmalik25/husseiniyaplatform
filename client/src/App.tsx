import { lazy, Suspense } from "react";
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
import { ScrollManager } from "@/components/ScrollManager";
import { PageTitle } from "@/components/PageTitle";
import { OfflineBanner } from "@/components/OfflineBanner";
import { RequireAuth } from "@/components/RequireAuth";
import { I18nProvider } from "@/lib/i18n";
import { useWebVitals } from "@/lib/use-web-vitals";
import { CircularProgress } from "@/components/ui/circular-progress";
import { LoadingProvider } from "@/lib/loading-context";
import { GlobalQuickActions } from "@/components/GlobalQuickActions";
import { WishlistProvider } from "@/lib/wishlist";
import { MarketingLayout } from "@/layouts/MarketingLayout";
import { AppLayout } from "@/layouts/AppLayout";

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
const InteractiveCalculators = lazy(
  () => import("@/pages/InteractiveCalculators")
);
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
const HRPage = lazy(() => import("@/pages/HR"));
const SupportQuality = lazy(() => import("@/pages/SupportQuality"));
const POSPage = lazy(() => import("@/pages/POS"));
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
const SubscriberOnboarding = lazy(() => import("@/pages/SubscriberOnboarding"));
const ClaimSubscription = lazy(() => import("@/pages/ClaimSubscription"));
const CostCenters = lazy(() => import("@/pages/CostCenters"));

const ZatcaIntegration = lazy(() => import("@/pages/ZatcaIntegration"));
const Beneficiaries = lazy(() => import("@/pages/Beneficiaries"));
const FinancialStatements = lazy(() => import("@/pages/FinancialStatements"));
const FiscalPeriods = lazy(() => import("@/pages/FiscalPeriods"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));

/**
 * Unified Route Loader — Single lightweight circular progress for all lazy loads.
 * Replaces PageSplash + RouteLoader with one consistent brand experience.
 */
function RouteLoader() {
  return (
    <output
      className="min-h-[50vh] flex items-center justify-center"
      aria-label="جاري تحميل الصفحة"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <CircularProgress size={48} variant="brand" strokeWidth={3} />
        <p className="text-sm text-muted-foreground font-medium">
          جاري تحميل الصفحة…
        </p>
      </div>
    </output>
  );
}

/**
 * Initial Boot Loader — Only shows on first app load, then never again.
 * Uses sessionStorage to track if user has seen it.
 */
function InitialBootLoader() {
  return <RouteLoader />;
}

function Router() {
  return (
    <>
      {/* Live document.title per route (SEO + tab readability) + native-style
          scroll restoration (back/forward returns to the exact position). */}
      <PageTitle />
      <ScrollManager />

      {/* #main-content anchors the skip-to-content link at the very top of
          App for keyboard & screen-reader users (WCAG 2.4.1). */}
      <div id="main-content" tabIndex={-1} className="focus:outline-none">
        <Suspense fallback={<InitialBootLoader />}>
          <Switch>
            {/* ── Public marketing & guest pages — MarketingLayout (أبيض Stripe) ── */}
            <Route path={"/"}>
              <MarketingLayout><Landing /></MarketingLayout>
            </Route>
            <Route path={"/login"} component={Login} />
            <Route path={"/claim"} component={ClaimSubscription} />
            <Route path={"/reset-password"} component={ResetPassword} />
            <Route path={"/verify-email"} component={VerifyEmail} />
            <Route path={"/about"}>
              <MarketingLayout><About /></MarketingLayout>
            </Route>
            <Route path={"/portal"}>
              <MarketingLayout><Portal /></MarketingLayout>
            </Route>
            <Route path={"/download"}>
              <MarketingLayout><Download /></MarketingLayout>
            </Route>
            <Route path={"/pricing"}>
              <MarketingLayout><Pricing /></MarketingLayout>
            </Route>
            <Route path={"/contact"}>
              <MarketingLayout><Contact /></MarketingLayout>
            </Route>
            <Route path={"/insights"}>
              <MarketingLayout><KnowledgeHub /></MarketingLayout>
            </Route>
            <Route path={"/tools"}>
              <MarketingLayout><InteractiveCalculators /></MarketingLayout>
            </Route>
            <Route path={"/solutions"}>
              <MarketingLayout><TechSolutions /></MarketingLayout>
            </Route>
            <Route path={"/governance"}>
              <MarketingLayout><ProjectGovernance /></MarketingLayout>
            </Route>
            <Route path={"/integrate"}>
              <MarketingLayout><Integrate /></MarketingLayout>
            </Route>

            {/* ── Operational pages — AppLayout (داكن + سايدبار) — يبدأ من /app بعد تسجيل الدخول ── */}
            <Route path={"/app"}>
              <RequireAuth><AppLayout><WorkspaceDashboard /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/accounting"}>
              <RequireAuth><AppLayout><Home /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/commercial"}>
              <RequireAuth><AppLayout><Commercial /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/reports"}>
              <RequireAuth><AppLayout><Reports /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/settings"}>
              <RequireAuth><AppLayout><Settings /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/erp"}>
              <RequireAuth><AppLayout><ErpPage /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/inventory"}>
              <RequireAuth><AppLayout><Inventory /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/store"}>
              <RequireAuth><AppLayout><Store /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/security"}>
              <RequireAuth><AppLayout><Security /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/procurement-workspace"}>
              <RequireAuth><AppLayout><ProcurementWorkspace /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/supplier-analytics"}>
              <RequireAuth><AppLayout><SupplierAnalytics /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/procurement"}>
              <RequireAuth><AppLayout><Procurement /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/projects"}>
              <RequireAuth><AppLayout><Projects /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/hr"}>
              <RequireAuth><AppLayout><HRPage /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/support"}>
              <RequireAuth><AppLayout><SupportQuality /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/pos"}>
              <RequireAuth><AppLayout><POSPage /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/permissions"}>
              <RequireAuth><AppLayout><Permissions /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/basic-data"}>
              <RequireAuth><AppLayout><BasicData /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/journal"}>
              <RequireAuth><AppLayout><Journal /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/manual-journal"}>
              <RequireAuth><AppLayout><ManualJournal /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/customization"}>
              <RequireAuth><AppLayout><Customization /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/branches"}>
              <RequireAuth><AppLayout><Branches /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/audit"}>
              <RequireAuth><AppLayout><Audit /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/requisitions"}>
              <RequireAuth><AppLayout><Requisitions /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/operations"}>
              <RequireAuth><AppLayout><Operations /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/analytics"}>
              <RequireAuth><AppLayout><Analytics /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/billing"}>
              <RequireAuth><AppLayout><Billing /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/onboarding"}>
              <RequireAuth><AppLayout><SubscriberOnboarding /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/cost-centers"}>
              <RequireAuth><AppLayout><CostCenters /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/zatca"}>
              <RequireAuth><AppLayout><ZatcaIntegration /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/beneficiaries"}>
              <RequireAuth><AppLayout><Beneficiaries /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/financial-statements"}>
              <RequireAuth><AppLayout><FinancialStatements /></AppLayout></RequireAuth>
            </Route>
            <Route path={"/fiscal-periods"}>
              <RequireAuth><AppLayout><FiscalPeriods /></AppLayout></RequireAuth>
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
  // Collect Core Web Vitals (CLS, INP, LCP) for real-user monitoring.
  useWebVitals({ reportOnce: true });

  return (
    <I18nProvider>
      <ErrorBoundary>
        {/* Keyboard/screen-reader shortcut to jump straight to the page content,
            skipping the header & floating widgets (WCAG 2.4.1 "Bypass Blocks"). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[95] focus:bg-brand focus:text-ink-deep focus:px-4 focus:py-2 focus:rounded-lg focus:font-black focus:text-xs focus:shadow-xl"
        >
          تخطّ إلى المحتوى الرئيسي
        </a>

        <ThemeProvider defaultTheme="light" switchable>
          <LoadingProvider>
            <WishlistProvider>
              <OfflineProvider>
                <OfflineBanner />
                <TooltipProvider>
                  <Toaster />
                  <Router />
                  <CommandPalette />
                  <GlobalQuickActions />
                  <FloatingSupportWidget />
                  <AliasAIAssistant />
                  <InstallPrompt />
                  <SWUpdateToast />
                </TooltipProvider>
              </OfflineProvider>
            </WishlistProvider>
          </LoadingProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </I18nProvider>
  );
}

export default App;
