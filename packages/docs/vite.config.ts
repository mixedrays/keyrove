import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { docsContent, listPrerenderPaths } from './vite-plugin-content.ts';

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

export default defineConfig(async () => ({
  base,
  plugins: [
    tailwindcss(),
    docsContent(),
    tanstackStart({
      router: { basepath: base },
      prerender: {
        enabled: true,
        // `docs/api.html` rather than `docs/api/index.html`: Pages serves the
        // first at `/docs/api`, the URL every link, canonical tag and sitemap
        // entry names, and redirects `/docs/api/` to it. The second is served
        // at `/docs/api/` instead, so each of those would answer with a 308.
        // Extensionless, too, so appending `.md` lands on the twin beside it.
        autoSubfolderIndex: false,
        failOnError: true,
        // Every path is listed below, so following links would only render
        // each page again once per `#section` something links to.
        crawlLinks: false,
      },
      // Every page, its `.md` twin and the generated files, listed from the
      // content rather than left to the crawler: the twins and llms.txt are
      // server routes, which discovery skips, and a page nothing links to
      // would otherwise never be built.
      pages: (await listPrerenderPaths()).map((path) => ({ path })),
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      '@mixedrays/keyrove': keyroveSource,
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    open: true,
  },
  build: {
    // Nothing in the deploy reads a source map. The bundle is glue over a
    // library whose source is on GitHub, and the map is several times the size
    // of the code it explains. `pnpm dev` serves maps either way; this is the
    // build's setting alone.
    sourcemap: false,
  },
}));
