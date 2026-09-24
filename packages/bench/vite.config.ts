import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import { describeWorkingTree } from './scripts/library.ts';
import { expandIcons } from './src/icons.ts';

/**
 * Cross-origin isolation, which gives `performance.now()` its finer
 * resolution. Sent by the dev server, and by the preview server that both
 * `pnpm start` and the headless runner use, so every way of running the
 * benchmark times with the same clock.
 */
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

/** Swaps the docs-style `<span data-icon>` placeholders for inline SVG. */
const icons = (): Plugin => ({
  name: 'bench-icons',
  transformIndexHtml: (html) => expandIcons(html),
});

export default defineConfig({
  plugins: [tailwindcss(), icons()],
  // The UI's harness runs the working tree's library, so a run from the
  // page says which one, as a headless run's report does.
  define: { __BENCH_LIBRARY__: JSON.stringify(describeWorkingTree()) },
  server: { headers: isolation, open: true },
  preview: { headers: isolation },
  build: {
    // keyrove ships unminified, and the benchmark times the code as shipped.
    // The page is a local tool, so its own size does not matter either.
    minify: false,
    rolldownOptions: {
      // The UI, and the page it runs the benchmark in.
      input: { index: 'index.html', harness: 'harness.html' },
    },
  },
});
