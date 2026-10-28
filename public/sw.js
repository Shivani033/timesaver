/**
 * Cadence Service Worker (sw.js)
 * Enables Background Notifications & Action Redirection on Android, Windows, and iOS
 */

const CACHE_NAME = 'cadence-sentinel-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Notification Clicks on Android, Windows & macOS
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  const action = event.action;

  event.waitUntil(
    (async () => {
      // If user tapped "Open Website" or tapped the notification body
      if (!action || action === 'open') {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        
        // Open the target website directly in a new window/tab on Android/desktop
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }
    })()
  );
});
