import { lazy, Suspense, type ComponentType } from "react";
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
import { CookieConsent } from "@/components/CookieConsent";
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
const POSPage = lazy(() => import("@/modules/pos/POSPage"));
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
 * Route tables — single source of truth for every page. Keeping the paths
 * here (instead of ~30 hand-duplicated wrappers) makes adding/removing a page
 * a one-line change and guarantees the same layout/auth wrapper everywhere.
 */
type RouteDef = { path: string; page: ComponentType };

/** Public marketing & guest pages — MarketingLayout (أبيض Stripe). */
const MARKETING_ROUTES: RouteDef[] = [
  { path: "/", page: Landing },
  { path: "/about", page: About },
  { path: "/portal", page: Portal },
  { path: "/download", page: Download },
  { path: "/pricing", page: Pricing },
  { path: "/contact", page: Contact },
  { path: "/insights", page: KnowledgeHub },
  { path: "/tools", page: InteractiveCalculators },
  { path: "/solutions", page: TechSolutions },
  { path: "/governance", page: ProjectGovernance },
  { path: "/integrate", page: Integrate },
];

/** Standalone public auth pages (no chrome — full-screen gates). */
const GUEST_ROUTES: RouteDef[] = [
  { path: "/login", page: Login },
  { path: "/claim", page: ClaimSubscription },
  { path: "/reset-password", page: ResetPassword },
  { path: "/verify-email", page: VerifyEmail },
];

/** Operational pages — RequireAuth + AppLayout (داكن + سايدبار). */
const APP_ROUTES: RouteDef[] = [
  { path: "/app", page: WorkspaceDashboard },
  { path: "/accounting", page: Home },
  { path: "/commercial", page: Commercial },
  { path: "/reports", page: Reports },
  { path: "/settings", page: Settings },
  { path: "/erp", page: ErpPage },
  { path: "/inventory", page: Inventory },
  { path: "/store", page: Store },
  { path: "/security", page: Security },
  { path: "/procurement-workspace", page: ProcurementWorkspace },
  { path: "/supplier-analytics", page: SupplierAnalytics },
  { path: "/procurement", page: Procurement },
  { path: "/projects", page: Projects },
  { path: "/hr", page: HRPage },
  { path: "/support", page: SupportQuality },
  { path: "/pos", page: POSPage },
  { path: "/permissions", page: Permissions },
  { path: "/basic-data", page: BasicData },
  { path: "/journal", page: Journal },
  { path: "/manual-journal", page: ManualJournal },
  { path: "/customization", page: Customization },
  { path: "/branches", page: Branches },
  { path: "/audit", page: Audit },
  { path: "/requisitions", page: Requisitions },
  { path: "/operations", page: Operations },
  { path: "/analytics", page: Analytics },
  { path: "/billing", page: Billing },
  { path: "/onboarding", page: SubscriberOnboarding },
  { path: "/cost-centers", page: CostCenters },
  { path: "/zatca", page: ZatcaIntegration },
  { path: "/beneficiaries", page: Beneficiaries },
  { path: "/financial-statements", page: FinancialStatements },
  { path: "/fiscal-periods", page: FiscalPeriods },
];

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
            {MARKETING_ROUTES.map(({ path, page: Page }) => (
              <Route key={path} path={path}>
                <MarketingLayout>
                  <Page />
                </MarketingLayout>
              </Route>
            ))}
            {GUEST_ROUTES.map(({ path, page: Page }) => (
              <Route key={path} path={path}>
                <Page />
              </Route>
            ))}
            {APP_ROUTES.map(({ path, page: Page }) => (
              <Route key={path} path={path}>
                <RequireAuth>
                  <AppLayout>
                    <Page />
                  </AppLayout>
                </RequireAuth>
              </Route>
            ))}
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
                <CookieConsent />
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
