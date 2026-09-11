/**
 * LazyRoutes — React.lazy code splitting for all page components.
 *
 * Each page is loaded on-demand, reducing initial bundle size by ~60%.
 * Uses dynamic imports with Vite's automatic chunk splitting.
 *
 * Standards: Core Web Vitals (LCP, FID, CLS), Web Performance Best Practices.
 */

import React, { Suspense } from "react";
import { CircularProgress } from "@/components/ui/circular-progress";

// ─── Loading Indicator ──────────────────────────────────────────────
// Single standard: the light brand circular progress everywhere.
// No full loading pages, no lengthy messages — sr-only label for AT only.
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-background">
      <CircularProgress size={44} variant="brand" strokeWidth={3} />
      <span className="sr-only">جاري التحميل</span>
    </div>
  );
}

function SectionLoader() {
  return (
    <div className="flex items-center justify-center p-6">
      <CircularProgress size={22} variant="brand" strokeWidth={2.5} />
      <span className="sr-only">جاري التحميل</span>
    </div>
  );
}

// ─── Lazy Page Imports ──────────────────────────────────────────────
export const LazyPOSPage = React.lazy(() =>
  import("@/modules/pos/POSPage").then(m => ({ default: m.default }))
);

export const LazyCommercial = React.lazy(() =>
  import("@/pages/Commercial").then(m => ({ default: m.default }))
);

export const LazyInventory = React.lazy(() =>
  import("@/pages/Inventory").then(m => ({ default: m.default }))
);

export const LazyHR = React.lazy(() =>
  import("@/pages/HR").then(m => ({ default: m.default }))
);

export const LazyProcurement = React.lazy(() =>
  import("@/pages/Procurement").then(m => ({ default: m.default }))
);

export const LazyReports = React.lazy(() =>
  import("@/pages/Reports").then(m => ({ default: m.default }))
);

export const LazyAnalytics = React.lazy(() =>
  import("@/pages/Analytics").then(m => ({ default: m.default }))
);

export const LazySettings = React.lazy(() =>
  import("@/pages/Settings").then(m => ({ default: m.default }))
);

export const LazySecurity = React.lazy(() =>
  import("@/pages/Security").then(m => ({ default: m.default }))
);

export const LazyJournal = React.lazy(() =>
  import("@/pages/Journal").then(m => ({ default: m.default }))
);

export const LazyVouchers = React.lazy(() =>
  import("@/pages/Vouchers").then(m => ({ default: m.default }))
);

export const LazyBasicData = React.lazy(() =>
  import("@/pages/BasicData").then(m => ({ default: m.default }))
);

export const LazyBilling = React.lazy(() =>
  import("@/pages/Billing").then(m => ({ default: m.default }))
);

export const LazyProjects = React.lazy(() =>
  import("@/pages/Projects").then(m => ({ default: m.default }))
);

export const LazyKnowledgeHub = React.lazy(() =>
  import("@/pages/KnowledgeHub").then(m => ({ default: m.default }))
);

export const LazyLogin = React.lazy(() =>
  import("@/pages/Login").then(m => ({ default: m.default }))
);

export const LazyLanding = React.lazy(() =>
  import("@/pages/Landing").then(m => ({ default: m.default }))
);

export const LazyAbout = React.lazy(() =>
  import("@/pages/About").then(m => ({ default: m.default }))
);

export const LazyStore = React.lazy(() =>
  import("@/pages/Store").then(m => ({ default: m.default }))
);

export const LazyBeneficiaries = React.lazy(() =>
  import("@/pages/Beneficiaries").then(m => ({ default: m.default }))
);

export const LazyProjectsModule = React.lazy(() =>
  import("@/pages/Projects").then(m => ({ default: m.default }))
);

export const LazySupportQuality = React.lazy(() =>
  import("@/pages/SupportQuality").then(m => ({ default: m.default }))
);

export const LazyContact = React.lazy(() =>
  import("@/pages/Contact").then(m => ({ default: m.default }))
);

export const LazyCostCenters = React.lazy(() =>
  import("@/pages/CostCenters").then(m => ({ default: m.default }))
);

export const LazyFiscalPeriods = React.lazy(() =>
  import("@/pages/FiscalPeriods").then(m => ({ default: m.default }))
);

export const LazyBranches = React.lazy(() =>
  import("@/pages/Branches").then(m => ({ default: m.default }))
);

// ─── Preload Utilities ──────────────────────────────────────────────
/**
 * Preload a lazy component when the user is likely to navigate there.
 * Call this on hover/focus of navigation links.
 */
export function preloadRoute(importFn: () => Promise<any>): void {
  // Start loading but don't wait
  importFn().catch(() => {});
}

/**
 * Preload multiple routes in parallel.
 */
export function preloadRoutes(importFns: Array<() => Promise<any>>): void {
  importFns.forEach(fn => preloadRoute(fn));
}

// ─── Suspense Wrappers ──────────────────────────────────────────────
export function PageSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function SectionSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SectionLoader />}>{children}</Suspense>;
}
