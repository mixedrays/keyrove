import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAddresses } from '../build/addresses.ts';
import { toLlmsTxt } from '../build/plaintext.ts';
import { page } from './page.ts';

// llms.txt is read away from the site, so a root-relative path in it has
// nothing to resolve against.
test('every link in llms.txt is an absolute URL under the base', () => {
  const addresses = createAddresses({
    base: '/keyrove/',
    siteUrl: 'https://example.github.io',
  });
  const api = page('docs/api', '', {
    title: 'API reference',
    description: 'Every export.',
  });

  const body = toLlmsTxt(
    page('', '', { description: 'Keyboard navigation.', layout: 'landing' }),
    [{ label: 'Guide', pages: [api], links: [] }],
    addresses,
  );

  const urls = body.match(/(?:https?:\/\/|(?<![\w.])\/)[^\s)]+/g) ?? [];
  assert.ok(urls.length > 0);
  for (const url of urls) {
    assert.match(url, /^https:\/\/example\.github\.io\/keyrove\//, url);
  }
  assert.ok(body.includes('https://example.github.io/keyrove/docs/api.md'));
});
