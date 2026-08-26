import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { shikiCodeBlocks } from './vite-plugin-shiki.ts';

// The site resolves keyrove to its TypeScript source rather than its build
// output, so `pnpm dev` hot-reloads library edits without a build step in
// between. The published package still ships `dist` — see its `exports`.
const keyroveSource = fileURLToPath(
  new URL('../keyrove/src/index.ts', import.meta.url),
);

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), shikiCodeBlocks()],
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
