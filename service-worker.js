const SHELL_CACHE = "rb-shell-v3";
const MAPS_CACHE = "rb-maps-v1";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== MAPS_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Maps déjà téléchargées (via le bouton "Télécharger", copiées dans
// ./maps/<id>.png par l'appli elle-même) : cache-first, elles doivent
// rester dispo même après des dizaines de mises à jour.
//
// Miniatures du catalogue (map-<id>.png à la racine — affichées pour
// TOUTES les cartes, téléchargées ou non) : réseau uniquement, JAMAIS
// mises en cache ici. Sinon le simple fait de voir une miniature à
// l'écran suffirait à la rendre disponible hors ligne, ce qui contourne
// complètement le bouton "Télécharger".
//
// App shell (index.html, manifest, catalog.json, etc.) : network-first,
// avec le cache seulement comme filet de secours si le réseau est absent.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes("/maps/")) {
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request))
    );
    return;
  }

  if (/\/map-[^/]+\.png$/.test(url.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((hit) => hit || caches.match("./index.html"))
      )
  );
});