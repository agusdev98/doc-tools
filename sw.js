const CACHE_NAME = "useful-tools-v23";
const EMOJI_DATA_PATH = "/vendor/emoji-picker-data/en/emojibase/data.json";

const CACHE_FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "logo.png",
  "favicon/favicon.ico",
  "favicon/favicon-16x16.png",
  "favicon/favicon-32x32.png",
  "favicon/apple-touch-icon.png",
  "favicon/android-chrome-192x192.png",
  "favicon/android-chrome-512x512.png",
  "styles/index.css",
  "js/index.js",
  "vendor/bootstrap/bootstrap.min.css",
  "vendor/bootstrap/bootstrap.bundle.min.js",
  "vendor/bootstrap-icons/bootstrap-icons.css",
  "vendor/bootstrap-icons/fonts/bootstrap-icons.woff",
  "vendor/bootstrap-icons/fonts/bootstrap-icons.woff2",
  "vendor/jszip/jszip.min.js",
  "vendor/xlsx/xlsx.full.min.js",
  "vendor/sortable/Sortable.min.js",
  "vendor/emoji-picker/index.js",
  "vendor/emoji-picker/picker.js",
  "vendor/emoji-picker/database.js",
  "vendor/emoji-picker/i18n/en.js",
  "vendor/emoji-picker/i18n/es.js",
  "vendor/emoji-picker-data/en/emojibase/data.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (event.request.method === "HEAD" && url.pathname.endsWith(EMOJI_DATA_PATH)) {
    event.respondWith(new Response(null, {
      status: 200,
      headers: {
        "ETag": CACHE_NAME,
      },
    }));
    return;
  }

  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      });
    })
  );
});
