import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project sites are served below /<repository>/.
  base: process.env.NODE_ENV === 'production' ? '/article-generator-tool/' : '/',
  plugins: [{
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
  }],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: { host: '127.0.0.1' },
});
