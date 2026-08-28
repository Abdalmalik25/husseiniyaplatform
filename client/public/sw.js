// ALHUSAINIA service worker (v9) — تصميم فاخر ومنهجية 4 أطوار.
// Network-first for navigations (offline → cached app shell), cache-first for
// static assets, and NEVER caches /api/* (avoids stale cross-tenant responses).
const CACHE = "alhusainia-v9";
const SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
    // NOTE: we deliberately do NOT call self.skipWaiting() here. Letting a new
    // worker wait gives the app a chance to notify the user (SWUpdateToast) and
    // apply the update when *they* choose — instead of silently switching to a
    // fresh worker mid-session. SKIP_WAITING is honoured on request below.
  );
});

// Honour the app's "تحديث الآن" request (see client/src/lib/use-sw-update.ts).
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache API responses

  // SPA navigations: try network, fall back to cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/index.html")));
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(res => {
          const isAsset =
            res &&
            res.ok &&
            (url.pathname.startsWith("/assets/") ||
              /\.(png|svg|webmanifest|css|js)$/.test(url.pathname));
          if (isAsset) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
