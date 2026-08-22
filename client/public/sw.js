/**
 * Service Worker for ALHUSAINIA Accounting PWA.
 *
 * Strategy:
 * - Static assets: Cache-first (App Shell)
 * - API calls: stale-while-revalidate with 30s freshness window
 * - HTML pages: Network-first with offline fallback
 * - Background sync for deferred operations
 *
 * Versioning: v1 → v2 on update triggers clean install
 */

const CACHE_NAME = "alhusainia-v2";
const STATIC_CACHE = "alhusainia-static-v2";
const API_CACHE = "alhusainia-api-v2";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/sw.js",
];

// Install: Pre-cache static assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches and claim clients
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  // Claim all clients immediately so the SW controls the page right away
  self.clients.claim();
});

// Fetch: Handle all requests
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip requests for non-http(s) schemes (chrome-extension://, moz-extension://,
  // browser://, etc.) — the Cache API only accepts http(s) and the service worker
  // must not intercept extension or internal browser requests.
  if (!/^https?:$/.test(url.protocol)) return;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip tRPC mutations (POST) - let them go to server
  if (request.method === "POST") return;

  // API requests (tRPC): stale-while-revalidate with freshness window
  if (url.pathname.startsWith("/api/trpc")) {
    event.respondWith(staleWhileRevalidateFresh(request, API_CACHE, 30_000));
    return;
  }

  // Static assets: Cache-first
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ttf") ||
    url.pathname.endsWith(".eot")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages: Network-first with offline fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Default: Network-first with cache fallback
  event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
});

// ─── Strategies ───────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      let cacheable = true;
      try {
        cacheable = /^https?:$/.test(new URL(request.url).protocol);
      } catch {
        cacheable = false;
      }
      if (cacheable) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    return null;
  }
}

async function staleWhileRevalidateFresh(request, cacheName, freshWindowMs) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async response => {
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    const cachedAt =
      new Date(cached.headers.get("date") || Date.now()).getTime() ||
      Date.now();
    const isFresh = Date.now() - cachedAt < freshWindowMs;
    if (isFresh) {
      // Serve instantly and let the network refresh run in the background.
      network
        .then(r => r && cachePutIfOk(request, r, cacheName))
        .catch(() => {});
      return cached;
    }
  }

  // No cache, or stale cache: wait for the network response (network-first).
  const fresh = await network;
  if (fresh) return fresh;
  if (cached) return cached;
  return new Response(
    JSON.stringify({ error: "offline", message: "الجهاز غير متصل بالإنترنت" }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}

async function cachePutIfOk(request, response, cacheName) {
  if (!response.ok) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({
        error: "offline",
        message: "الجهاز غير متصل بالإنترنت",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Serve offline page
    const offlineCached = await caches.match(OFFLINE_URL);
    if (offlineCached) return offlineCached;
    return new Response("Offline - يرجى التحقق من اتصال الإنترنت", {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

// ─── Background Sync ──────────────────────────────────────────────

self.addEventListener("sync", event => {
  if (event.tag === "alhusainia-sync") {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: "SYNC_TRIGGERED" });
        });
      })
    );
  }
});

// ─── Periodic Cache Management ──────────────────────────────────

// Periodic sweep to remove stale API cache entries
self.addEventListener("periodicsync", event => {
  if (event.tag === "cache-sweep") {
    event.waitUntil(
      caches.open(API_CACHE).then(cache => {
        return cache.keys().then(keys => {
          const now = Date.now();
          return Promise.all(
            keys.map(key => {
              const cachedResponse = cache.get(key);
              if (!cachedResponse) return cache.delete(key);
              const date = cachedResponse.headers.get("date");
              const age = now - (date ? new Date(date).getTime() : now);
              if (age > 24 * 60 * 60 * 1000) {
                // Remove entries older than 24 hours
                return cache.delete(key);
              }
            })
          ).then(() => cache.clear());
        });
      })
    );
  }
});

// Force update check on mount - can be called from app runtime
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
