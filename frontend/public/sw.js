// FlowPocket Service Worker - PWA & Safe Offline Shell
// STRICT SECURITY RULE: NEVER CACHE SENSITIVE API ENDPOINTS

const CACHE_NAME = "flowpocket-v1.0.0";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png"
];

// Install Event - Pre-cache critical static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network-First for dynamic / API routes, Cache-First for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER CACHE API CALLS (Bypass SW cache completely for security & data integrity)
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/health") ||
    url.pathname.includes("/ready") ||
    event.request.method !== "GET"
  ) {
    return; // Let browser handle network request directly
  }

  // 2. Navigation requests: Network First, Fallback to cached shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/");
      })
    );
    return;
  }

  // 3. Static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

