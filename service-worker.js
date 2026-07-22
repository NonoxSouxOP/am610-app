// Service worker de AM 610 — cachea el "shell" de la app para que abra
// rápido y funcione offline. El audio en vivo siempre se pide a la red
// (nunca tiene sentido cachear un stream en vivo).
const CACHE_NAME = "am610-shell-v1";
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./logo.png",
  "./logo-full.png",
  "./wallpaper.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca interceptar el stream de audio en vivo: siempre red directa.
  if (url.hostname.includes("ohradio.cc")) {
    return;
  }

  // Nunca cachear la función de configuración: siempre hay que pedir el dato más nuevo.
  if (url.pathname.startsWith("/.netlify/functions/")) {
    return;
  }

  // Resto del shell: cache-first con actualización en segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
