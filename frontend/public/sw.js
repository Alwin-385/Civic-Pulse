self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A dummy fetch listener is strictly required by PWABuilder 
  // to pass the offline readiness audit.
  event.respondWith(fetch(event.request).catch(() => new Response("Offline")));
});
