import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { applicationPWA } from './scripts/pwa-build';

const loaderHash = createHash('sha256').update(readFileSync(new URL('./public/mw-boot-loader.js', import.meta.url))).digest('hex').slice(0, 12);
const versionBootLoader = {
  name: 'version-boot-loader',
  transformIndexHtml: {
    order: 'post' as const,
    handler(html: string) {
      return html.replace(/(src=\"[^\"]*mw-boot-loader\.js)(?:\?v=[^\"]*)?(\")/, `$1?v=${loaderHash}$2`);
    },
  },
};

export default defineConfig({
  // GitHub Pages project sites are served below /<repository>/.
  base: process.env.NODE_ENV === 'production' ? '/article-generator-tool/' : '/',
  plugins: [versionBootLoader, {
    name: 'version-classic-scripts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Keep legacy scripts classic (their globals are used by inline handlers),
        // but never serve an old cached handler alongside the new bundled CSS.
        return html.replace(/src="([^"]*assets\/js\/legacy\/([^"/?]+\.js))"/g, (_match, url: string, file: string) => {
          const content = readFileSync(new URL(`./public/assets/js/legacy/${file}`, import.meta.url));
          const version = createHash('sha256').update(content).digest('hex').slice(0, 12);
          return `src="${url}?v=${version}"`;
        });
      },
    },
  }, applicationPWA()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: { host: '127.0.0.1' },
});
