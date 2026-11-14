import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project sites are served below /<repository>/.
  base: process.env.NODE_ENV === 'production' ? '/article-generator-tool/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: { host: '127.0.0.1' },
});
