// ===== CONFIGURAÇÃO DO HORÁRIO =====
// 🔵 MUDE AQUI PARA TESTE
const NOTIFICATION_HOUR = 8;      // 8 = 08:00
const NOTIFICATION_MINUTE = 0;    // 0 = 00 minutos
// ====================================

function scheduleDailyNotification() {
  const now = new Date();
  const target = new Date();

  target.setHours(NOTIFICATION_HOUR);
  target.setMinutes(NOTIFICATION_MINUTE);
  target.setSeconds(0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  setTimeout(() => {
    self.registration.showNotification("Quaresma 2026", {
      body: "Hora do seu propósito diário 🙏",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
    });

    scheduleDailyNotification(); // agenda novamente
  }, delay);
}

self.addEventListener("activate", () => {
  scheduleDailyNotification();
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});
const CACHE_NAME = "portal-quaresma-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./quaresma.json",
  "./manifest.webmanifest",
  "./icons/icon-gold-192.png",
  "./icons/icon-gold-512.png",
  "./icons/badge-96.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
