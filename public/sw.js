/**
 * Call Up service worker — push + notification click.
 * Manual SW (no Serwist / next-pwa). Payload shape aligns with spec §11.5:
 * { title, body, url, event, callupId, callerUserName }
 *
 * Registration is wired in Task 16 (`navigator.serviceWorker.register('/sw.js')`).
 */

self.addEventListener("push", function (event) {
  let data = {
    title: "Kall-UP",
    body: "Tienes un aviso nuevo",
    url: "/",
    event: null,
    callupId: null,
    callerUserName: null,
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const title = data.title || "Kall-UP";  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    data: {
      url: data.url || "/",
      event: data.event || null,
      callupId: data.callupId || null,
      callerUserName: data.callerUserName || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ("focus" in client) {
            if ("navigate" in client) {
              return client.navigate(targetUrl).then(function (c) {
                return c && c.focus ? c.focus() : client.focus();
              });
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      },
    ),
  );
});
