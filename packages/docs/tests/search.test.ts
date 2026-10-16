import assert from 'node:assert/strict';
import { test } from 'node:test';
import MiniSearch from 'minisearch';

import { loadPages } from '../build/content.ts';
import { loadDemos } from '../build/demos.ts';
import type { HtmlNode } from '../build/html-tree.ts';
import { renderPage } from '../build/page-render.ts';
import { toSearchIndex } from '../build/search.ts';
import { searchOptions, type SearchDocument } from '../src/search-model.ts';
import { page } from './page.ts';

test('section text preserves prose, inline code and fenced examples', () => {
  const { sections } = renderPage(
    page(
      'docs/guide',
      'Intro.\n\n## `followFocus()`\n\nFollow\nfocus with **bold** text and [links](/docs/api).\n\n```ts\nfollowFocus(event);\n```\n\n## `followFocus()`\n\nAnother section.',
    ),
    new Map(),
  );
  assert.equal(sections[0].text, 'Intro.');
  assert.equal(sections[1].id, 'followfocus');
  assert.equal(
    sections[1].text,
    'Follow focus with bold text and links. followFocus(event);',
  );
  assert.equal(sections[2].id, 'followfocus-2');
});

/** The ids of the h2 and h3 elements in a rendered tree, in document order. */
const headingIds = (nodes: HtmlNode[]): string[] =>
  nodes.flatMap((node) => {
    if (typeof node === 'string') return [];
    const [tag, props, children] = node;
    const own = /^h[23]$/.test(tag) && typeof props.id === 'string';
    return [...(own ? [props.id as string] : []), ...headingIds(children)];
  });

test('every indexed section links to a rendered heading, including demos', async () => {
  const pages = await loadPages();
  const demos = await loadDemos();
  for (const page of pages.filter(
    (page) => page.layout === 'docs' && !page.noindex,
  )) {
    const rendered = renderPage(page, demos);
    const linked = rendered.sections.slice(1);
    assert.deepEqual(
      linked.map(({ id, heading }) => ({ id, text: heading })),
      rendered.headings.map(({ id, text }) => ({ id, text })),
      page.route,
    );

    const anchors = new Set(headingIds(await rendered.tree()));
    for (const { id } of linked) {
      assert.ok(anchors.has(id), `/${page.route}#${id} has no heading`);
    }
  }
});

test('serialized index supports API names, prefixes and typos and omits non-doc pages', async () => {
  const demos = await loadDemos();
  const index = await MiniSearch.loadJSONAsync<SearchDocument>(
    toSearchIndex((await loadPages()).map((page) => renderPage(page, demos))),
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
  const index = MiniSearch.loadJSON<SearchDocument>(
    toSearchIndex(
      [
        page('docs/mention', 'This mentions navigation.'),
        page('docs/reference', '## Navigation\n\nMove through a list.'),
        page('docs/private', '## Hiddenword', { noindex: true }),
      ].map((page) => renderPage(page, new Map())),
    ),
    searchOptions,
  );
  assert.equal(index.search('navigation')[0].url, '/docs/reference#navigation');
  assert.equal(index.search('hiddenword').length, 0);
});
