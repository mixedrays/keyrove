import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEMO_DEFINITIONS } from '../build/demo-definitions.ts';
import { expandDemos, loadDemos } from '../build/demos.ts';

const demos = await loadDemos();

test('a placeholder expands whatever the order of its attributes', () => {
  const html = expandDemos(
    '<div data-demo-label="countries" data-demo="list"></div>',
    demos,
    'html',
  );

  assert.match(html, /<div class="demo-panel" data-demo="list">/);
  assert.match(html, /Live · countries/);
});

// Each of these used to ship as an empty <div> with no warning.
test('a malformed placeholder fails the build', () => {
  for (const placeholder of [
    '<div data-demo="list" data-demo-labl="countries"></div>',
    '<div data-demo="list" data-demo-label="countries">',
    "<div data-demo='list' data-demo-label='countries'></div>",
    '<div data-demo-label="countries"></div>',
    '<div data-demo="list" data-demo="loop" data-demo-label="x"></div>',
    // Every demo is a panel, and the label is what names it.
    '<div data-demo="list"></div>',
  ]) {
    assert.throws(
      () => expandDemos(placeholder, demos, 'html'),
      /\[docs\]/,
      placeholder,
    );
  }
});

test('each demo under content/_demos has one definition', () => {
  assert.deepEqual(Object.keys(DEMO_DEFINITIONS).sort(), [...demos.keys()]);
});

test('a demo’s live items wear the icons its definition names', () => {
  const panel = (name: string) =>
    expandDemos(
      `<div data-demo="${name}" data-demo-label="${name}"></div>`,
      demos,
      'html',
    );

  assert.match(
    panel('menu'),
    /role="menuitem" tabindex="0"><svg class="demo-item-icon [^>]*>.*?<\/svg>Copy link</,
  );

  // A folder carries both of its glyphs; a file, the one for its type.
  assert.match(
    panel('tree'),
    /aria-owns="files-src"\s+tabindex="0"\s*><svg class="demo-item-icon demo-item-icon--closed [^>]*>.*?<\/svg><svg class="demo-item-icon demo-item-icon--open /,
  );
  assert.match(
    panel('tree'),
    /tabindex="-1"><svg class="demo-item-icon [^>]*>.*?<\/svg>package\.json</,
  );

  // Only the live preview: the source block stays the fragment as written.
  assert.equal(panel('menu').match(/demo-item-icon/g)?.length, 5);
  assert.doesNotMatch(panel('list'), /demo-item-icon/);
});

// The hero's markup is written into the landing page rather than stamped, but
// its readout is the panels' own, so the two cannot open differently.
test('the hero’s readout placeholder opens as the panels’ readout does', () => {
  const panel = expandDemos(
    '<div data-demo="list" data-demo-label="countries"></div>',
    demos,
    'html',
  );

  for (const target of ['html', 'markdown'] as const) {
    const hero = expandDemos(
      '<span>\n<output data-demo-readout></output>\n</span>',
      demos,
      target,
    );
    const readout = /^<output [^\n]*<\/output>$/m.exec(hero)?.[0];

    assert.ok(readout, `the ${target} readout is missing`);
    assert.match(readout, /data-state="blurred"/);
    assert.ok(panel.includes(`\n${readout}\n`), `${target}: ${readout}`);
  }
});
