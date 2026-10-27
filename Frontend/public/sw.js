self.addEventListener("install", (event) => {
  console.log("[sw] installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[sw] activated");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "BAI Finance";
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
