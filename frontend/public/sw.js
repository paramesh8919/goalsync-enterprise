// Minimal service worker — its only job is to exist and control the page,
// which is what Chrome/Android require before showing the "Install app"
// prompt. It deliberately does NOT cache API responses (goals/tasks/chat
// need to always be fresh), just a couple of static shell assets so the
// app shell loads instantly on repeat visits.
const CACHE_NAME = "goalsync-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Never intercept API or socket.io traffic — always go to the network.
  if (event.request.url.includes("/api/") || event.request.url.includes("/socket.io/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
