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
