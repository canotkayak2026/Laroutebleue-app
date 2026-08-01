const SHELL_CACHE = "rb-shell-v2";
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

// Maps (téléchargées par l'utilisateur pour le hors-ligne) : cache-first,
// elles doivent rester disponibles même après des dizaines de mises à jour.
// App shell (index.html, CSS/JS inline, manifest) : network-first, pour que
// chaque modification que Jeff pousse sur GitHub apparaisse tout de suite,
// avec le cache seulement comme filet de secours si le réseau est absent.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes("/maps/")) {
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request))
    );
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
