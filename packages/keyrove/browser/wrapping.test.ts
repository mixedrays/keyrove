/**
 * `cols: 'auto'` on layouts that wrap without grid tracks — flex-wrap rows and
 * inline-block items — where the column count is the items on the first line.
 * It needs real layout, which jsdom has none of. Run with `pnpm test:browser`.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { keyRove, rove } from '../src/index';
import type { KeyRoveOptions, MoveResult } from '../src/index';
import { activeId, byId, mount, named, press, unmount } from './testUtils';

afterEach(unmount);

/** Listens for keys on `root`, keeping every keydown's result. */
const listen = (root: Element, options?: KeyRoveOptions) => {
  const results: (MoveResult | null)[] = [];
  root.addEventListener('keydown', (e) =>
    results.push(keyRove(e as KeyboardEvent, options)),
  );

  return results;
};

/** `count` items `i0`, `i1`, …, each with the given inline style. */
const items = (count: number, style = '') =>
  Array.from(
    { length: count },
    (_, i) =>
      `<button id="i${i}" data-keyrove-item style="${style}">${i}</button>`,
  ).join('');

// Nine 90px items in a 300px row: three to a line.
const FLEX_WRAP = `
  <div id="root" data-keyrove-cols="auto"
    style="display: flex; flex-wrap: wrap; width: 300px">
    ${items(9, 'width: 90px; margin: 0; padding: 4px')}
  </div>
`;

describe("cols: 'auto' on a wrapping layout", () => {
  it('folds a flex-wrap row by the items on its first line', async () => {
    mount(FLEX_WRAP);
    const results = listen(byId('root'));
    byId('i0').focus();

    await press('{ArrowRight}');
    expect(activeId()).toBe('i1');

    await press('{ArrowLeft}');
    await press('{ArrowDown}');
    expect(activeId()).toBe('i3');
    expect(results.map(named)).toEqual([
      { action: 'next', from: 'i0', to: 'i1' },
      { action: 'prev', from: 'i1', to: 'i0' },
      { action: 'nextRow', from: 'i0', to: 'i3' },
    ]);
  });

  it('counts again on the next press after the layout reflows', async () => {
    mount(FLEX_WRAP);
    listen(byId('root'));
    byId('i0').focus();

    await press('{ArrowDown}');
    expect(activeId()).toBe('i3');

    // Two to a line: i3 is now in the second row's second column.
    byId('root').style.width = '200px';
    await press('{ArrowDown}');
    expect(activeId()).toBe('i5');
  });

  it('counts items of mixed heights centred on one line as that line', async () => {
    mount(`
      <div id="root" data-keyrove-cols="auto"
        style="display: flex; flex-wrap: wrap; align-items: center; width: 300px">
        ${items(9, 'width: 90px; margin: 0; height: 30px')}
      </div>
    `);
    // The first item is the shortest on its line, and the next one the
    // tallest: both start above the first item's bottom only because they
    // share its line.
    byId('i0').style.height = '20px';
    byId('i1').style.height = '60px';
    listen(byId('root'));
    byId('i0').focus();

    await press('{ArrowDown}');

    expect(activeId()).toBe('i3');
  });

  it('folds inline-block items in a block root the same way', async () => {
    mount(`
      <div id="root" data-keyrove-cols="auto" style="width: 300px">
        ${items(9, 'display: inline-block; width: 90px; margin: 0')}
      </div>
    `);
    listen(byId('root'));
    byId('i0').focus();

    await press('{ArrowDown}');
    expect(activeId()).toBe('i3');

    await press('{ArrowRight}');
    expect(activeId()).toBe('i4');
  });

  it('makes a single-line flex row a one-row grid of all its items', async () => {
    mount(`
      <div id="root" style="display: flex">${items(4)}</div>
    `);
    const results = listen(byId('root'), { cols: 'auto' });
    byId('i0').focus();

    await press('{ArrowRight}');
    expect(activeId()).toBe('i1');

    // A grid's row move, with no row below to go to: a consumed no-op.
    await press('{ArrowDown}');
    expect(activeId()).toBe('i1');

    await press('{End}');
    expect(activeId()).toBe('i3');
    expect(results.map(named)).toEqual([
      { action: 'next', from: 'i0', to: 'i1' },
      { action: 'nextRow', from: 'i1', to: null },
      { action: 'endRow', from: 'i1', to: 'i3' },
    ]);
  });

  it('leaves a flex column a list', async () => {
    mount(`
      <div id="root" data-keyrove-cols="auto"
        style="display: flex; flex-direction: column">${items(4)}</div>
    `);
    const results = listen(byId('root'));
    byId('i0').focus();

    await press('{ArrowDown}');
    expect(activeId()).toBe('i1');

    await press('{ArrowRight}');
    expect(activeId()).toBe('i1');
    expect(results.map(named)).toEqual([
      { action: 'next', from: 'i0', to: 'i1' },
      null,
    ]);
  });

  it('ends the first line at an item with no box', async () => {
    mount(FLEX_WRAP);
    // Hidden, i1 takes no slot on screen; the line is counted up to it.
    byId('i1').style.display = 'none';
    const results = listen(byId('root'));
    byId('i0').focus();

    await press('{ArrowRight}');

    expect(results.map(named)).toEqual([null]);
    expect(activeId()).toBe('i0');
  });

  it('folds a move made from code the same way', () => {
    mount(FLEX_WRAP);
    byId('i1').focus();

    expect(named(rove(byId('root'), 'nextRow'))).toEqual({
      action: 'nextRow',
      from: 'i1',
      to: 'i4',
    });
    expect(activeId()).toBe('i4');
  });
});
