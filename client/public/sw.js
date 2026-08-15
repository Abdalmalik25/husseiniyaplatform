/**
 * Service Worker for ALHUSAINIA Accounting PWA.
 *
 * Strategy:
 * - Static assets: Cache-first (App Shell)
 * - API calls: Network-first with cache fallback
 * - Offline fallback: Serve cached or offline page
 */

const CACHE_NAME = "alhusainia-v1";
const STATIC_CACHE = "alhusainia-static-v1";
const API_CACHE = "alhusainia-api-v1";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
];

// Install: Pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Handle all requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip tRPC mutations (POST)
  if (request.method === "POST") return;

  // API requests: Network-first with cache fallback
  if (url.pathname.startsWith("/api/trpc")) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
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
    url.pathname.endsWith(".ttf")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages: Network-first
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
});

// ─── Strategies ───────────────────────────────────────────────────

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstWithCache(request: Request, cacheName: string): Promise<Response> {
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
    return new Response(JSON.stringify({ error: "offline", message: "الجهاز غير متصل بالإنترنت" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function networkFirstWithOffline(request: Request): Promise<Response> {
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

self.addEventListener("sync", (event) => {
  if (event.tag === "alhusainia-sync") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SYNC_TRIGGERED" });
        });
      })
    );
  }
});

// ─── Push Notifications ───────────────────────────────────────────

self.addEventListener("push", (event) => {
  const data = event.data?.json() || { title: "ALHUSAINIA", body: "تحديث جديد" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      dir: "rtl",
      lang: "ar",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow("/")
  );
});
