import assert from 'node:assert/strict';
import { test } from 'node:test';
import MiniSearch from 'minisearch';

import { loadPages, type Page } from '../build/content.ts';
import { expandDemos, loadDemos } from '../build/demos.ts';
import { collectSearchSections, renderMarkdown } from '../build/markdown.ts';
import { expandMeta } from '../build/meta.ts';
import { toSearchIndex } from '../build/search.ts';
import { searchOptions, type SearchDocument } from '../src/search-model.ts';

test('section text preserves prose, inline code and fenced examples', () => {
  const sections = collectSearchSections(
    'Intro.\n\n## `followFocus()`\n\nFollow\nfocus with **bold** text and [links](/docs/api).\n\n```ts\nfollowFocus(event);\n```\n\n## `followFocus()`\n\nAnother section.',
  );
  assert.equal(sections[0].text, 'Intro.');
  assert.equal(sections[1].id, 'followfocus');
  assert.equal(
    sections[1].text,
    'Follow focus with bold text and links. followFocus(event);',
  );
  assert.equal(sections[2].id, 'followfocus-2');
});

test('every indexed section links to the rendered heading, including demos', async () => {
  const pages = await loadPages();
  const demos = await loadDemos();
  for (const page of pages.filter(
    (page) => page.layout === 'docs' && !page.noindex,
  )) {
    const sections = collectSearchSections(
      expandMeta(expandDemos(page.body, demos, 'markdown')),
    );
    const rendered = await renderMarkdown(
      expandMeta(expandDemos(page.body, demos, 'html')),
      { resolveHref: (href) => href },
    );
    assert.deepEqual(
      sections.slice(1).map(({ id, heading }) => ({ id, text: heading })),
      rendered.headings.map(({ id, text }) => ({ id, text })),
      page.route,
    );
  }
});

test('serialized index supports API names, prefixes and typos and omits non-doc pages', async () => {
  const index = await MiniSearch.loadJSONAsync<SearchDocument>(
    toSearchIndex(await loadPages(), await loadDemos()),
    searchOptions,
  );
  for (const query of ['followFocus', 'followFoc', 'folowFocus']) {
    const result = index.search(query)[0];
    assert.equal(result.url, '/docs/api#followfocus-event-options', query);
  }
  assert.equal(index.search('zzzznonexistent').length, 0);
  assert.ok(
    index
      .search(MiniSearch.wildcard)
      .every((result) => result.url.startsWith('/docs/')),
  );
});

test('heading matches rank above body mentions and noindex pages stay out', () => {
  const page = (route: string, body: string, noindex = false): Page => ({
    route,
    body,
    noindex,
    title: 'Guide',
    description: '',
    layout: 'docs',
    file: '',
    titleTag: null,
    group: null,
    order: 0,
    lastModified: null,
  });
  const index = MiniSearch.loadJSON<SearchDocument>(
    toSearchIndex(
      [
        page('docs/mention', 'This mentions navigation.'),
        page('docs/reference', '## Navigation\n\nMove through a list.'),
        page('docs/private', '## Hiddenword', true),
      ],
      new Map(),
    ),
    searchOptions,
  );
  assert.equal(index.search('navigation')[0].url, '/docs/reference#navigation');
  assert.equal(index.search('hiddenword').length, 0);
});
