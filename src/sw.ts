// Минимальный Service Worker: кэширует только оболочку (HTML, CSS, JS, шрифты, иконки).
// Запросы к MP3 и любые запросы с Range не перехватываются: это ломает перемотку в Safari.
const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = 'shell-v1';
// Пути от папки, где лежит sw.js: сайт может жить не в корне домена.
const ROOT = new URL('./', sw.location.href).href;
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'].map((p) => new URL(p, ROOT).href);

sw.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

function isShell(req: Request): boolean {
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== sw.location.origin) return false;
  if (req.headers.has('range') || url.pathname.endsWith('.mp3')) return false;
  return req.mode === 'navigate' || /\.(js|css|woff2|png|jpg|webmanifest)$/.test(url.pathname);
}

sw.addEventListener('fetch', (e) => {
  if (!isShell(e.request)) return; // браузер обрабатывает запрос сам
  if (e.request.mode === 'navigate') {
    // Страница — сначала из сети, без сети — из кэша.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(ROOT, copy));
          return res;
        })
        .catch(async () => (await caches.match(ROOT)) ?? Response.error()),
    );
    return;
  }
  // Файлы с хешем в имени и статика — из кэша, иначе из сети с записью в кэш.
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ??
        fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        }),
    ),
  );
});
export {};
