/* Service worker de Curva.
   Guarda solo el armazón de la app para que abra sin conexión.
   Las llamadas a Google nunca se cachean: los datos viven en el calendario. */

const CACHE = "curva-v5";
const ARMAZON = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icono-192.png",
  "./icono-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARMAZON))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // nunca interceptar Google: ni la API ni la librería de identidad
  if (url.hostname.endsWith("googleapis.com") ||
      url.hostname.endsWith("google.com") ||
      url.hostname.endsWith("gstatic.com")) return;

  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // la red manda; el caché es el respaldo cuando no hay conexión
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.ok) {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        }
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
