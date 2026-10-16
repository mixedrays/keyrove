import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadPages } from '../build/content.ts';
import { loadDemos } from '../build/demos.ts';
import type { HtmlElement, HtmlNode } from '../build/html-tree.ts';
import { renderPage } from '../build/page-render.ts';
import {
  PLACEHOLDERS,
  placeholderOf,
  type PlaceholderName,
} from '../build/placeholders.ts';

/** Every element of a tree, in document order. */
const elementsOf = (nodes: HtmlNode[]): HtmlElement[] =>
  nodes.flatMap((node) =>
    typeof node === 'string' ? [] : [node, ...elementsOf(node[2])],
  );

/** The placeholder an element of the tree is, read as markdown.tsx reads it. */
const placeholder = ([tag, props]: HtmlElement) =>
  placeholderOf(
    tag,
    typeof props.className === 'string' ? props.className : '',
    (attribute) => attribute in props,
  );

const demos = await loadDemos();
const pages = await Promise.all(
  (await loadPages()).map(async (page) => ({
    route: page.route,
    elements: elementsOf(await renderPage(page, demos).tree()),
  })),
);

// A marker no page writes any more is a widget renamed in its producer and
// left behind here — or one that is gone, and whose component is dead code.
test('every placeholder in the registry is written on some page', () => {
  const written = new Set<PlaceholderName>();
  for (const { elements } of pages) {
    for (const element of elements) {
      const name = placeholder(element);
      if (name) written.add(name);
    }
  }

  assert.deepEqual([...written].sort(), Object.keys(PLACEHOLDERS).sort());
});

/**
 * The `data-*` hooks pages carry that are not placeholders, and what reads
 * each: nothing swaps them, and nothing needs to. `data-keyrove-*` is
 * keyrove's own, and left out.
 */
const NOT_PLACEHOLDERS: Record<string, string> = {
  'data-lang': "a highlighted block's language, from build/markdown.ts",
  'data-state': "the readout's state, for demo-panel.css",
  'data-hero-list': "the hero's list, for src/hero.ts",
  'data-count': "the hero's folder counts, for style.css",
  'data-split': "the landing page's split columns, for style.css",
};

const MARKERS = new Set<string>(
  Object.values(PLACEHOLDERS).flatMap((entry) =>
    'attribute' in entry ? [entry.attribute] : [],
  ),
);

// A widget a producer marks with a hook of its own, and nothing in the
// registry: React would draw it as a plain element, and say nothing.
test('every data-* hook a page carries is a placeholder’s marker, or named as not one', () => {
  for (const { route, elements } of pages) {
    for (const element of elements) {
      const [tag, props] = element;
      for (const attribute of Object.keys(props)) {
        if (!attribute.startsWith('data-')) continue;
        if (attribute.startsWith('data-keyrove-')) continue;

        if (MARKERS.has(attribute)) {
          assert.ok(
            placeholder(element),
            `/${route}: <${tag} ${attribute}> carries a marker on an element the registry does not take for its placeholder`,
          );
        } else {
          assert.ok(
            attribute in NOT_PLACEHOLDERS,
            `/${route}: <${tag} ${attribute}> is neither a placeholder in build/placeholders.ts nor in NOT_PLACEHOLDERS`,
          );
        }
      }
    }
  }
});
