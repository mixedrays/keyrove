import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// The browser suite: the library's focus contract against real focus, real
// Tab order and real layout, none of which jsdom has. The unit suite in
// `vite.config.ts` stays the place for everything else.
export default defineConfig({
  test: {
    include: ['browser/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      screenshotFailures: false,
    },
  },
});
