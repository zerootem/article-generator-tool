import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { translateUiText } from '../i18n';
import { publicDescription, publicTitle } from './copy';
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8'));
describe('public metadata and application identity', () => {
  it('includes a descriptive title, description, canonical and sharing data before JavaScript runs', () => {
    expect(html).toContain(`<title>${publicTitle}</title>`);
    expect(html).toContain(`<meta name="description" content="${publicDescription}">`);
    expect(html).toContain('rel="canonical" href="https://zerootem.github.io/article-generator-tool/"');
    for (const tag of ['og:title','og:description','og:url','og:image','twitter:card']) expect(html).toContain(tag);
    expect(html).toContain('id="appAccessibleTitle"');
  });
  it('localizes public descriptions but never inserts private article data', () => {
    expect(translateUiText(publicDescription, 'en')).toContain('Arabic or English');
    expect(translateUiText(publicTitle, 'en')).toBe('Article Generator | AI Content Editor and SEO');
  });
  it('provides a stable installation identity and correct GitHub Pages scope', () => {
    expect(manifest.id).toBe('/article-generator-tool/');
    expect(manifest.scope).toBe('/article-generator-tool/');
    expect(manifest.start_url).toBe('/article-generator-tool/?source=pwa');
    expect(manifest.display).toBe('standalone');
    expect(manifest.prefer_related_applications).toBe(false);
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
  });
  it('ships valid PNG app icons with maskable support and a real ICO favicon', () => {
    for (const size of [192,512]) {
      const icon=manifest.icons.find((i: {sizes: string; purpose: string})=>i.sizes===`${size}x${size}`&&i.purpose==='any');
      expect(icon).toBeTruthy();
      const bytes=readFileSync(new URL('../../public/'+icon.src, import.meta.url));
      expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(bytes.readUInt32BE(16)).toBe(size);expect(bytes.readUInt32BE(20)).toBe(size);
    }
    expect(manifest.icons.some((i: {purpose: string})=>i.purpose==='maskable')).toBe(true);
    const ico=readFileSync(new URL('../../public/icons/favicon.ico', import.meta.url));expect(ico.subarray(0,4).toString('hex')).toBe('00000100');
    expect(html).toContain('rel="apple-touch-icon"');
  });
  it('loads HTML sanitization locally rather than a changing CDN alias', () => {
    expect(html).toContain('/vendor/dompurify-3.4.18.min.js');
    expect(html).not.toContain('cdn.jsdelivr.net/npm/dompurify@3/');
    expect(readFileSync(new URL('../../public/vendor/dompurify-3.4.18.min.js', import.meta.url),'utf8')).toContain('DOMPurify 3.4.18');
  });
});
