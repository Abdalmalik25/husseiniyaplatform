// ALHUSAINIA service worker (v23) — self-hosted fonts + catalog SWR caching.
// Network-first for navigations (offline → cached app shell), cache-first for
// static assets, stale-while-revalidate for the public catalog (/api/web/catalog),
// and NEVER caches tenant-scoped /api/trpc (avoids stale cross-tenant responses).
const CACHE = "alhusainia-v23";
const CATALOG_CACHE = "alhusainia-catalog-v1";
const SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

// Populated at BUILD time by scripts/build-server.cjs (which scans
// dist/public/assets and injects every emitted JS/CSS chunk here). This makes
// the ENTIRE app — including React.lazy route chunks like Landing.js and the
// ar.js locale, which are NOT referenced from index.html — available offline
// from the very first visit. Without it, a page is served offline but any
// uncached dynamic import() rejects, blowing up the app shell.
const PRECACHE_ASSETS = /*__ASSET_MANIFEST__*/ [];

// Discover the Vite-built entry assets referenced by index.html so the whole
// app shell (HTML + JS/CSS) is precached at install time. Without this, a
// freshly-installed worker only caches the .html and the first offline
// navigation shell-loads but the script chunks fail → blank/unresponsive page
// instead of the app + OfflineBanner.
async function precacheEntryAssets(cache) {
  try {
    const res = await fetch("/index.html");
    if (!res.ok) return;
    const html = await res.text();
    const assetUrls = Array.from(
      html.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g),
      m => m[1]
    );
    if (assetUrls.length > 0) {
      await cache.addAll(assetUrls).catch(() => {});
    }
  } catch {
    // index.html unreachable at install — assets get cached on first fetch.
  }
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(c => c.addAll([...SHELL, ...PRECACHE_ASSETS]).catch(() => {}))
      .then(() => caches.open(CACHE))
      .then(precacheEntryAssets)
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

  // SPA navigations: try network, fall back to cached app shell when offline;
  // if even the shell is missing, serve the static /offline.html last resort.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match("/index.html", { ignoreSearch: true })
            .then(shell => shell || caches.match("/offline.html"))
        )
    );
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
