const CACHE_NAME = 'mecav-offline-v21';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/pouchdb.min.js',
  '/js/notifications.js',
  '/js/version.js',
  '/js/app.js',
  '/js/auth.js',
  '/js/db/adapter-pouch.js',
  '/js/db/db-manager.js',
  '/fonts/Vazirmatn-Regular.woff2',
  '/fonts/Vazirmatn-Bold.woff2',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.ico'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  // به درخواست‌های دیتابیس یا سرور نوتیفیکیشن کاری نداریم
  if (evt.request.url.includes('5984') || evt.request.url.includes(':8080') || evt.request.method !== 'GET') {
    return;
  }
  
  // بقیه فایل‌ها را برای حالت آفلاین از کش می‌خوانیم
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request);
    })
  );
});

// کلیک روی اعلان ویندوز یا اندروید: پنجره برنامه باز یا فوکوس شود
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.clickUrl) ? event.notification.data.clickUrl : '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
