import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

import { CONTENT_DIR, loadPages } from '../build/content.ts';

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

// The hero isn't stamped from one file like the demos, so this keeps its live
// list and HTML tab in step. Each `<!-- … -->` fold stands for 1+ folders.
test('the hero shows the markup its list runs', async () => {
  const source = await readFile(path.join(CONTENT_DIR, 'index.md'), 'utf8');
  const live = /<ul id="menu"[^>]*data-hero-list>([\s\S]*?)<\/ul>/.exec(
    source,
  )?.[1];
  const shown = /```html[^\n]*\n(<ul id="menu">[\s\S]*?<\/ul>)\n```/.exec(
    source,
  )?.[1];
  assert.ok(live, 'the hero list is missing from content/index.md');
  assert.ok(shown, 'the hero HTML tab is missing from content/index.md');

  const folders = (markup: string) =>
    Array.from(
      markup.matchAll(/<li data-keyrove-item tabindex="0"[^>]*>(.*?)<\/li>/g),
      ([, inner]) => inner.replace(/<[^>]+>/g, '').trim(),
    );

  assert.ok(folders(live).length > 0, 'the hero list has no folders');

  // Folders as `|Inbox|Drafts|…|`, so a fold can match a run of whole names.
  const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = shown
    .split(/<!--\s*(?:…|\.\.\.)\s*-->/)
    .map((part) =>
      folders(part)
        .map((name) => `${escape(name)}\\|`)
        .join(''),
    )
    .join('(?:[^|]+\\|)+');

  assert.match(`|${folders(live).join('|')}|`, new RegExp(`^\\|${pattern}$`));
});

// The overview is hand-written, so nothing else would catch a missing link.
test('the examples overview links to every example', async () => {
  const pages = await loadPages();
  const overview = pages.find((page) => page.route === 'docs/examples');
  assert.ok(overview, 'content/docs/examples/index.md is missing');

  for (const page of pages) {
    if (page.group !== 'Examples' || page === overview) continue;

    assert.ok(
      overview.body.includes(`](/${page.route})`),
      `the examples overview should link to /${page.route}`,
    );
  }
});
