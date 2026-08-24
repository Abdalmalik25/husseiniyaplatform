import { trpc } from "@/lib/trpc";
import { MotionConfig } from "framer-motion";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { goLogin } from "./const";
import "./index.css";
import { I18nProvider } from "./lib/i18n";
import { getActiveTenantId } from "./lib/activeTenant";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Only redirect on UNAUTHORIZED when we're not already on the login page and we
// haven't redirected during this page session. This prevents redirect loops and
// hijacking the UI during background refetches / mutations. Auth-gated pages that
// need a hard redirect use useAuth({ redirectOnUnauthenticated: true }) instead.
let redirectedThisSession = false;
const maybeRedirectToLogin = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  if (redirectedThisSession) return;
  if (window.location.pathname.startsWith("/login")) return;
  redirectedThisSession = true;
  goLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    maybeRedirectToLogin(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
          // Super-admin tenant switch (owner only): forward active tenant id
          const activeTenant = getActiveTenantId();
          if (activeTenant != null) {
            return { "x-tenant-id": String(activeTenant) };
          }
        } catch {
          // sessionStorage / localStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <MotionConfig reducedMotion="user">
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </MotionConfig>
  </I18nProvider>
);

// Register service worker for installable PWA + offline shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
