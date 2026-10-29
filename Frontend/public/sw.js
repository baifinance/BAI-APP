const CACHE_NAME = "bai-app-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/bai_logo_blue-384.webp",
  "/bai_logo_white-384.webp",
  "/bai_notification_icon.png",
  "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network-first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "BAI APP";
  const options = {
    body: payload.body || "You have a new notification.",
    icon: "/bai_notification_icon.png",
    badge: "/bai_notification_icon.png",
    tag: payload.tag || payload.notification_id || "bai-notification",
    renotify: Boolean(payload.renotify),
    data: {
      url: payload.url || "/",
      notification_id: payload.notification_id || "",
    },
  };

  console.log("[sw] push received", { tag: options.tag, title });

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        console.log("[sw] notification shown", { tag: options.tag });
      })
      .catch((error) => {
        console.error("[sw] showNotification failed", error);
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;

  console.log("[sw] notification clicked", { url: targetUrl });

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      for (const client of clients) {
        if ("navigate" in client && "focus" in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
