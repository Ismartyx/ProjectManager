const CACHE_NAME = 'mecav-offline-v5';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/pouchdb.min.js',
  '/js/app.js',
  '/js/auth.js',
  '/js/db/adapter-pouch.js',
  '/js/db/db-manager.js',
  '/fonts/Vazirmatn-Regular.woff2',
  '/fonts/Vazirmatn-Bold.woff2',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (evt) => {
  // به درخواست‌های دیتابیس کاری نداریم
  if (evt.request.url.includes('5984')) return;
  
  // بقیه فایل‌ها را برای حالت آفلاین از کش می‌خوانیم
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request);
    })
  );
});
