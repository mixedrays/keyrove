import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { keyroveDocs } from './vite-plugin-docs.ts';

// The site resolves keyrove to its TypeScript source rather than its build
// output, so `pnpm dev` hot-reloads library edits without a build step in
// between. The published package still ships `dist` — see its `exports`.
const keyroveSource = fileURLToPath(
  new URL('../keyrove/src/index.ts', import.meta.url),
);

/**
 * Where the site is deployed, e.g. `/keyrove/` for a GitHub Pages project site.
 *
 * Pages are served at extensionless URLs — `/docs/api`, so that `/docs/api.md`
 * lands on the markdown beside it — and relative hrefs cannot be resolved
 * consistently against a URL with no trailing slash. So links are absolute, and
 * this is what they are absolute to.
 */
const base = (process.env.DOCS_BASE ?? '/').replace(/\/?$/, '/');

export default defineConfig({
  base,
  // Every page is generated, so there is no index.html to fall back to: the
  // SPA fallback would answer an unknown URL with the unfilled shell instead
  // of a 404.
  appType: 'mpa',
  plugins: [tailwindcss(), keyroveDocs()],
  resolve: {
    alias: {
      '@mixedrays/keyrove': keyroveSource,
    },
  },
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
