import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    sourcemap: true,
    // A library ships readable code; consumers minify at their own app boundary.
    minify: false,
  },
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/__tests__'],
    }),
  ],
  test: {
    environment: 'jsdom',
  },
});
