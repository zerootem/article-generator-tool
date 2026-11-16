import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import type { Plugin } from 'vite';
export function applicationPWA(): Plugin {
  return {
    name: 'article-generator-pwa', apply: 'build', enforce: 'post',
    generateBundle(_options, bundle) {
      const classic = ['10-app-core.js', '20-editor-and-integrations.js'].map(file => {
        const data = readFileSync(new URL(`../public/assets/js/legacy/${file}`, import.meta.url));
        const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
        return `assets/js/legacy/${file}?v=${hash}`;
      });
      const icons = readdirSync(new URL('../public/icons/', import.meta.url)).filter(file => /\.(png|ico)$/.test(file)).map(file => `icons/${file}`);
      const vendor = readdirSync(new URL('../public/vendor/', import.meta.url)).filter(file => file.endsWith('.js')).map(file => `vendor/${file}`);
      const bundled = Object.keys(bundle).filter(path => path.startsWith('assets/') && /\.(js|css|woff2)$/.test(path));
      const paths = ['index.html', 'manifest.webmanifest', ...bundled, ...classic, ...icons, ...vendor];
      const revision = createHash('sha256');
      for (const item of Object.values(bundle)) revision.update(item.type === 'asset' ? item.source : item.code);
      for (const file of ['../public/manifest.webmanifest', ...icons.map(p => '../public/' + p), ...vendor.map(p => '../public/' + p)]) revision.update(readFileSync(new URL(file, import.meta.url)));
      const template = readFileSync(new URL('./pwa-service-worker.js', import.meta.url), 'utf8');
      const source = template.replace('__CACHE_NAME__', JSON.stringify('article-generator-shell-' + revision.digest('hex').slice(0, 16))).replace('__PRECACHE__', JSON.stringify(paths));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
