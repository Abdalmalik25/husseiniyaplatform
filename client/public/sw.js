// ALHUSAINIA service worker (v22) — self-hosted fonts + catalog SWR caching.
// Network-first for navigations (offline → cached app shell), cache-first for
// static assets, stale-while-revalidate for the public catalog (/api/web/catalog),
// and NEVER caches tenant-scoped /api/trpc (avoids stale cross-tenant responses).
const CACHE = "alhusainia-v22";
const CATALOG_CACHE = "alhusainia-catalog-v1";
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
  if (event.data?.type === "LOCAL_NOTIFY") {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title || "تنبيه", {
      body: body || "",
      icon: "/icon-192.png",
      badge: "/favicon-32x32.png",
      tag: tag || "local",
      dir: "rtl",
      lang: "ar",
    });
  }
});

// Push من الخادم — تنبيهات مخزون/فاتورة حتى مع إغلاق المتصفح
self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "تنبيه" };
  }
  const title = data.title || "تنبيه من الحسينية";
  const body = data.body || data.message || "";
  const tag = data.tag || "push";
  const url = data.url || "/app";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/favicon-32x32.png",
      tag,
      dir: "rtl",
      lang: "ar",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && "focus" in c)
          return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE && k !== CATALOG_CACHE)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Public catalog: stale-while-revalidate — instant repeat visits, background refresh.
  // This is unauthenticated guest data (storefront), safe to cache per-request.
  if (url.pathname === "/api/web/catalog") {
    event.respondWith(
      caches.open(CATALOG_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const network = fetch(req)
            .then(res => {
              if (res && res.ok) {
                const copy = res.clone();
                cache.put(req, copy);
              }
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return; // never cache tenant API responses

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
