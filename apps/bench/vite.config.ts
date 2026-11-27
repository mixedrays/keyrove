import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import { describeWorkingTree } from './scripts/library.ts';
import { expandIcons } from './src/icons.ts';

// Cross-origin isolation gives `performance.now()` finer resolution; sent by
// both servers so every way of running times with the same clock.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

const icons = (): Plugin => ({
  name: 'bench-icons',
  transformIndexHtml: (html) => expandIcons(html),
});

export default defineConfig({
  plugins: [tailwindcss(), icons()],
  define: { __BENCH_LIBRARY__: JSON.stringify(describeWorkingTree()) },
  server: { headers: isolation, open: true },
  preview: { headers: isolation },
  build: {
    // keyrove ships unminified, and the benchmark times the code as shipped.
    minify: false,
    rolldownOptions: {
      input: { index: 'index.html', harness: 'harness.html' },
    },
  },
});
