import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OfflineProvider } from "./lib/offline/OfflineContext";
import Home from "./pages/Home";
import Download from "./pages/Download";
import Commercial from "./pages/Commercial";
import Reports from "./pages/Reports";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/download"} component={Download} />
      <Route path={"/commercial"} component={Commercial} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
