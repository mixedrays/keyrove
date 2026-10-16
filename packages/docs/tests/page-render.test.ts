import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderPage } from '../build/page-render.ts';
import { page } from './page.ts';

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
