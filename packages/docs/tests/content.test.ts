import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { loadPages } from '../build/content.ts';

// The production origin, not META.siteUrl: a preview build overrides that, and
// the comment is read on GitHub, where only the real site is worth linking to.
const SITE = 'https://keyrove.pages.dev';

test('every indexed page links from its source to its live page', async () => {
  const pages = await loadPages();
  for (const page of pages.filter((page) => !page.noindex)) {
    const source = await readFile(page.file, 'utf8');
    const expected = `---\n# Live page: ${SITE}/${page.route}\n`;
    assert.ok(
      source.startsWith(expected),
      `${page.file} should open with:\n${expected}`,
    );
  }
});
