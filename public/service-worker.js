importScripts("./ngsw-worker.js");

self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push Received.", event);

  if (!event.data) {
    console.log("[ServiceWorker] Push event but no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("[ServiceWorker] Push data:", data);

    // Support both flattened and nested (Angular-style) structures
    const notif = data.notification || data;
    const title = notif.title || "ClimBeast";

    const options = {
      body: notif.body || "",
      icon: notif.icon || "/logo/android-chrome-192x192.png",
      badge: notif.badge || "/logo/favicon-32x32.png",
      vibrate: notif.vibrate || [200, 100, 200],
      tag: notif.tag || "cb-notif",
      renotify: notif.renotify !== false,
      data: {
        url: notif.data?.url || "/home",
        ...notif.data,
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[ServiceWorker] Error parsing push data:", err);
  }
});

// VAPID public key (misma que src/environments/environment.ts). Es pública por
// definición: solo sirve para identificar a este origin como suscriptor.
const VAPID_PUBLIC_KEY =
  "BAbghnk2dciFxebiXegH_omgxn82SbkuZWMF1ZLFbmwrqgDqpvhImShb9fWxDa4_xvdizhCGR_VTPhZH0tlThl0";

// El navegador rota la suscripción (expiración del endpoint, cambio de perfil
// de Android...). Hay que re-suscribirse desde el SW; el cliente vuelve a
// guardarla en el backend la próxima vez que arranque la app.
self.addEventListener("pushsubscriptionchange", (event) => {
  const applicationServerKey =
    (event.newSubscription &&
      event.newSubscription.options.applicationServerKey) ||
    (event.oldSubscription &&
      event.oldSubscription.options.applicationServerKey) ||
    VAPID_PUBLIC_KEY;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .catch((err) => {
        console.error("[ServiceWorker] Resubscribe failed:", err);
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log(
    "[ServiceWorker] Notification click Received.",
    event.notification.data,
  );

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/home";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Check if there is already a window open with this URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // Use URL object for safer comparison
          try {
            const clientUrl = new URL(client.url);
            if (
              clientUrl.pathname === urlToOpen ||
              client.url.includes(urlToOpen)
            ) {
              if ("focus" in client) return client.focus();
            }
          } catch (e) {
            if (client.url.includes(urlToOpen) && "focus" in client) {
              return client.focus();
            }
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
