import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { docsContent, listPrerenderPaths } from './vite-plugin-content.ts';

// The source, not `dist`, so `pnpm dev` hot-reloads library edits.
const keyroveSource = fileURLToPath(
  new URL('../../packages/keyrove/src/index.ts', import.meta.url),
);

// Links are absolute to this: relative hrefs resolve inconsistently against
// extensionless URLs.
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
        // `docs/api/index.html` would be served at `/docs/api/`, so every
        // link to `/docs/api` would answer with a 308.
        autoSubfolderIndex: false,
        failOnError: true,
        // Every path is listed below; crawling re-renders per `#section`.
        crawlLinks: false,
      },
      // Discovery skips server routes (twins, llms.txt) and unlinked pages.
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
    // Nothing in the deploy reads one, and it's several times the code's size.
    sourcemap: false,
  },
}));
