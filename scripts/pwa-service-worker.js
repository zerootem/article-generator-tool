/* Generated at build time. Cache only this release's public application shell. */
const CACHE_NAME = __CACHE_NAME__;
const CACHE_PREFIX = 'article-generator-shell-';
const ROOT = new URL('./', self.location.href);
const INDEX = new URL('index.html', ROOT).href;
const PRECACHE = __PRECACHE__.map(path => new URL(path, ROOT).href);
const allowed = new Set(PRECACHE);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload', credentials: 'same-origin' })));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
    // Do not skipWaiting or reload clients: editors may contain unsaved work.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ROOT.origin || request.headers.has('Authorization')) return;
  const appNavigation = request.mode === 'navigate' && (url.pathname === ROOT.pathname || url.pathname === new URL(INDEX).pathname);
  if (appNavigation) {
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch {
        const cached = await caches.match(INDEX, { cacheName: CACHE_NAME });
        return cached || Response.error();
      }
    })());
    return;
  }
  // Exact release URLs, including JS version parameters. No API, OAuth, query or third-party responses.
  if (!allowed.has(url.href) || url.href === INDEX) return;
  event.respondWith((async () => {
    const cached = await caches.match(request, { cacheName: CACHE_NAME });
    if (cached) return cached;
    return fetch(request);
  })());
});
