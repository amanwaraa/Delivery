const CACHE_NAME = "cashier-app-v1.0.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json"
];

/* تثبيت */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* تفعيل */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

/* جلب الملفات */
self.addEventListener("fetch", event => {
  const req = event.request;

  if (req.method !== "GET") return;

  /* صفحات الموقع */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  /* باقي الموارد: cache first ثم network */
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, copy).catch(() => {});
          });
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});