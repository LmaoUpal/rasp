// Держит саму страницу в кеше, чтобы она открывалась без сети.
// Данные расписания сюда не попадают — они живут в localStorage.

const CACHE = 'rasp-shell-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Запросы к сайту расписания и к прокси не трогаем — они должны быть живыми.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/fetch')) return;

  // Отдаём из кеша сразу, а свежую версию подтягиваем в фоне.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
