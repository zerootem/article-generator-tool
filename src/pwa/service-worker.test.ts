import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = 'https://zerootem.github.io/article-generator-tool/';
const code = readFileSync(new URL('../../scripts/pwa-service-worker.js', import.meta.url), 'utf8').replace('__CACHE_NAME__', JSON.stringify('article-generator-shell-test')).replace('__PRECACHE__', JSON.stringify(['index.html','assets/app.css','assets/js/legacy/10-app-core.js?v=current']));
function harness() {
  const events: Record<string,(event: any)=>void> = {};
  const cache = { addAll: vi.fn(async (_requests: Request[]) => {}) };
  const caches = { open: vi.fn(async () => cache), keys: vi.fn(async () => ['other-app-cache','article-generator-shell-old','article-generator-shell-test']), delete: vi.fn(async () => true), match: vi.fn(async () => new Response('public shell')) };
  const fetch = vi.fn(async () => new Response('network'));
  const self = { location: { href: root + 'sw.js' }, clients: { claim: vi.fn(async () => {}) }, addEventListener: (name: string, callback: (event: any)=>void) => { events[name] = callback; } };
  vm.runInNewContext(code, { self, caches, fetch, URL, Request, Response, Set });
  const request = (url: string, method = 'GET', mode = 'cors', headers = new Headers()) => {
    const event = { request: { url, method, mode, headers }, respondWith: vi.fn() }; events.fetch(event); return event;
  };
  return { events, caches, fetch, cache, self, request };
}
describe('public-shell-only service worker', () => {
  it('caches only explicit release assets at installation', async () => {
    const h = harness(); let task!: Promise<void>; h.events.install({ waitUntil: (p: Promise<void>) => { task = p; } }); await task;
    const requests = h.cache.addAll.mock.calls[0][0] as unknown as Request[];
    expect(requests.map(r=>r.url)).toEqual([root+'index.html',root+'assets/app.css',root+'assets/js/legacy/10-app-core.js?v=current']);
  });
  it('ignores OAuth, AI, private headers, POST, foreign hosts and other queries', () => {
    const h = harness();
    for (const e of [h.request(root+'api/generate'),h.request(root+'oauth/token','POST'),h.request('https://api.example.com/generate'),h.request(root+'assets/app.css','GET','cors',new Headers({Authorization:'Bearer synthetic'})),h.request(root+'assets/js/legacy/10-app-core.js?v=other')]) expect(e.respondWith).not.toHaveBeenCalled();
  });
  it('serves allowlisted exact asset URLs without caching arbitrary responses', async () => {
    const h = harness(), e = h.request(root+'assets/app.css'); expect(e.respondWith).toHaveBeenCalledTimes(1);
    const result = await e.respondWith.mock.calls[0][0]; expect(await result.text()).toBe('public shell'); expect(h.fetch).not.toHaveBeenCalled();
  });
  it('uses the network for navigation but never stores visited query strings', async () => {
    const h = harness(), e = h.request(root+'?source=pwa','GET','navigate');
    const result = await e.respondWith.mock.calls[0][0]; expect(await result.text()).toBe('network'); expect(h.caches.open).not.toHaveBeenCalled();
  });
  it('falls back to public index HTML for offline app navigation only', async () => {
    const h = harness(); h.fetch.mockRejectedValue(new Error('offline')); const e = h.request(root+'?release=synthetic','GET','navigate');
    const result = await e.respondWith.mock.calls[0][0]; expect(await result.text()).toBe('public shell');
    expect(h.caches.match).toHaveBeenCalledWith(root+'index.html',{cacheName:'article-generator-shell-test'});
    expect(h.request(root+'private-page','GET','navigate').respondWith).not.toHaveBeenCalled();
  });
  it('cleans its old cache only, leaving other applications untouched', async () => {
    const h = harness(); let task!: Promise<void>; h.events.activate({ waitUntil: (p: Promise<void>) => { task = p; } }); await task;
    expect(h.caches.delete).toHaveBeenCalledTimes(1); expect(h.caches.delete).toHaveBeenCalledWith('article-generator-shell-old');
  });
  it('does not activate new code or reload editors forcibly', () => {
    expect(code).not.toMatch(/self\.skipWaiting\s*\(/); expect(code).not.toMatch(/\.navigate\s*\(/); expect(code).not.toContain('localStorage');
  });
});
