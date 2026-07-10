// PackFlow service worker
// - App shell en cache (stale-while-revalidate) pour un chargement instantané
//   et une utilisation basique hors-ligne (consultation).
// - Les appels Supabase (API) ne sont jamais mis en cache : network-only.
// - Gère l'affichage des notifications push envoyées par la Edge Function
//   de rappel de tâches.

const CACHE_NAME = "packflow-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/tokens.css",
  "./css/base.css",
  "./css/components.css",
  "./css/landing.css",
  "./js/app.js",
  "./js/config.js",
  "./js/supabaseClient.js",
  "./js/state.js",
  "./js/theme.js",
  "./js/toast.js",
  "./js/router.js",
  "./js/nav.js",
  "./js/modal.js",
  "./js/qr.js",
  "./js/qrgen.js",
  "./js/pwa.js",
  "./js/data.js",
  "./js/utils.js",
  "./js/screens/auth.js",
  "./js/screens/dashboard.js",
  "./js/screens/boxes.js",
  "./js/screens/scanner.js",
  "./js/screens/todo.js",
  "./js/screens/volume.js",
  "./js/screens/settings.js",
  "./js/screens/moverView.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Jamais de cache pour l'API Supabase (données toujours fraîches, RLS applicable)
  if (url.hostname.includes("supabase.co")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok && url.origin === location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "PackFlow", body: "Une tâche approche de son échéance." };
  try { payload = event.data.json(); } catch { /* payload texte simple */ }
  event.waitUntil(
    self.registration.showNotification(payload.title || "PackFlow", {
      body: payload.body,
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-96.png",
      data: { url: payload.url || "./index.html#/todo" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "./index.html#/todo";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
