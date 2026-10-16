import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAddresses, twinPath } from '../build/addresses.ts';

test("a page's twin is its path with .md, and the landing page's is /index.md", () => {
  assert.equal(twinPath('docs/api'), '/docs/api.md');
  assert.equal(twinPath('docs/examples/basic'), '/docs/examples/basic.md');
  assert.equal(twinPath(''), '/index.md');
});

test('a site path is requested under the deploy base', () => {
  const atRoot = createAddresses({ base: '/' });
  const underSubpath = createAddresses({ base: '/keyrove/' });

  assert.equal(atRoot.href('/docs/api#followfocus'), '/docs/api#followfocus');
  assert.equal(atRoot.href('/'), '/');
  assert.equal(
    underSubpath.href('/docs/api#followfocus'),
    '/keyrove/docs/api#followfocus',
  );
  assert.equal(underSubpath.href('/llms.txt'), '/keyrove/llms.txt');
  assert.equal(underSubpath.href('/'), '/keyrove/');
});

test('a page and its twin have absolute URLs on the site, under the base', () => {
  const addresses = createAddresses({
    base: '/keyrove/',
    siteUrl: 'https://example.github.io',
  });

  assert.equal(
    addresses.pageUrl('docs/api'),
    'https://example.github.io/keyrove/docs/api',
  );
  assert.equal(addresses.pageUrl(''), 'https://example.github.io/keyrove/');
  assert.equal(
    addresses.twinUrl('docs/api'),
    'https://example.github.io/keyrove/docs/api.md',
  );
  assert.equal(
    addresses.twinUrl(''),
    'https://example.github.io/keyrove/index.md',
  );
  assert.equal(
    addresses.url('/sitemap.xml'),
    'https://example.github.io/keyrove/sitemap.xml',
  );
});
