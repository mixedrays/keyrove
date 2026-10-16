import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HtmlNode } from '../build/html-tree.ts';
import { renderPage } from '../build/page-render.ts';
import { page } from './page.ts';

/** A tree without the code blocks' contents or the whitespace between tags. */
const outline = (nodes: HtmlNode[]): HtmlNode[] =>
  nodes.flatMap((node): HtmlNode[] => {
    if (typeof node === 'string') return node.trim() ? [node] : [];
    const [tag, props, children] = node;
    return tag === 'pre' ? ['pre'] : [[tag, props, outline(children)]];
  });

// src/components/markdown.tsx reads a group's tabs for their labels and which
// one is selected, and a copy button for its label; Base UI and the button
// component draw the rest. Anything more is markup the reader downloads for
// React to throw away.
test('a code group and a copy button carry only what their components read', async () => {
  const tree = await renderPage(
    page(
      'docs/guide',
      '```html copy\n<p>One</p>\n```\n\n```js selected\none();\n```\n\nThen:\n\n```sh copy\nnpm i\n```',
    ),
    new Map(),
  ).tree();

  const copy: HtmlNode = [
    'button',
    { className: 'code-copy', 'aria-label': 'Copy to clipboard' },
    [],
  ];
  const tab = (selected: boolean, label: string): HtmlNode => [
    'button',
    { role: 'tab', className: 'code-tab', 'aria-selected': String(selected) },
    [label],
  ];
  const panel: HtmlNode = [
    'div',
    { className: 'code-tabs-panel', role: 'tabpanel' },
    ['pre'],
  ];

  assert.deepEqual(outline(tree), [
    [
      'div',
      { className: 'code-tabs code-copyable', 'data-code-tabs': '' },
      [
        copy,
        [
          'div',
          { className: 'code-tabs-bar', role: 'tablist' },
          [tab(false, 'HTML'), tab(true, 'JavaScript')],
        ],
        panel,
        panel,
      ],
    ],
    ['p', {}, ['Then:']],
    ['div', { className: 'code-copyable' }, [copy, 'pre']],
  ]);
});

test('the .md twin shows each demo as its source and drops icons', () => {
  const demos = new Map([
    ['menu', '<ul data-keyrove-root>\n  <li data-keyrove-item>One</li>\n</ul>'],
  ]);
  const { markdown } = renderPage(
    page(
      'docs/guide',
      'Intro <span data-icon="layers" class="size-5"></span>text.\n\n<div data-demo="menu" data-demo-label="menu"></div>\n\n```js\nkeyRove(menu);\n```',
      { title: 'Guide', description: 'How to rove.' },
    ),
    demos,
  );

  assert.equal(
    markdown,
    [
      '# Guide',
      '',
      '> How to rove.',
      '',
      'Intro text.',
      '',
      '```html',
      '<ul data-keyrove-root>',
      '  <li data-keyrove-item>One</li>',
      '</ul>',
      '```',
      '',
      '```js',
      'keyRove(menu);',
      '```',
      '',
    ].join('\n'),
  );
});
