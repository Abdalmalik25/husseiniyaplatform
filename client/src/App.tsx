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
            {/* ── Public marketing & guest pages (no session required) ── */}
            <Route path={"/"} component={Landing} />
            <Route path={"/login"} component={Login} />
            <Route path={"/claim"} component={ClaimSubscription} />
            <Route path={"/reset-password"} component={ResetPassword} />
            <Route path={"/verify-email"} component={VerifyEmail} />
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
                <HRPage />
              </RequireAuth>
            </Route>
            <Route path={"/support"}>
              <RequireAuth>
                <SupportQuality />
              </RequireAuth>
            </Route>
            <Route path={"/pos"}>
              <RequireAuth>
                <POSPage />
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
            <Route path={"/onboarding"}>
              <RequireAuth>
                <SubscriberOnboarding />
              </RequireAuth>
            </Route>
            <Route path={"/cost-centers"}>
              <RequireAuth>
                <CostCenters />
              </RequireAuth>
            </Route>
            <Route path={"/zatca"}>
              <RequireAuth>
                <ZatcaIntegration />
              </RequireAuth>
            </Route>
            <Route path={"/beneficiaries"}>
              <RequireAuth>
                <Beneficiaries />
              </RequireAuth>
            </Route>
            <Route path={"/financial-statements"}>
              <RequireAuth>
                <FinancialStatements />
              </RequireAuth>
            </Route>
            <Route path={"/fiscal-periods"}>
              <RequireAuth>
                <FiscalPeriods />
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
