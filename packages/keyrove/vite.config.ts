import { configDefaults, defineConfig } from 'vitest/config';
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
    // The browser suite has a config and a command of its own.
    exclude: [...configDefaults.exclude, 'browser/**'],
  },
});
