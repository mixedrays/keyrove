/**
 * The focus contract in a real browser: native Tab order, real focus refusal
 * and real layout, driven by real key presses and clicks. Run with
 * `pnpm test:browser`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
  createTypeahead,
  followFocus,
  initRovingTabindex,
  keyRove,
  rove,
} from '../src/index';
import type { KeyRoveOptions, MoveResult } from '../src/index';
import {
  activeId,
  byId,
  mount,
  named,
  press,
  shiftTab,
  tab,
  tabindexes,
  unmount,
} from './testUtils';

afterEach(unmount);

/**
 * Wires a group as a page does: `keyRove` on keydown and `followFocus` on
 * focusin, on one element. Every keydown's result is kept.
 */
const wire = (root: Element | ShadowRoot, options?: KeyRoveOptions) => {
  const results: (MoveResult | null)[] = [];
  root.addEventListener('keydown', (e) =>
    results.push(keyRove(e as KeyboardEvent, options)),
  );
  root.addEventListener('focusin', (e) => followFocus(e, options));

  return results;
};

const ROVING_LIST = `
  <div id="list">
    <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">A</button>
    <button id="b" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">B</button>
    <button id="c" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">C</button>
  </div>
`;

describe('a roving group in the Tab order', () => {
  it('is entered, left and returned to at its current stop', async () => {
    mount(ROVING_LIST);
    wire(byId('list'));
    byId('before').focus();

    await tab();
    expect(activeId()).toBe('a');

    await press('{ArrowDown}');
    expect(activeId()).toBe('b');

    await tab();
    expect(activeId()).toBe('after');

    await shiftTab();
    expect(activeId()).toBe('b');

    await shiftTab();
    expect(activeId()).toBe('before');

    await tab();
    expect(activeId()).toBe('b');
  });

  it('is one stop however many items it has', async () => {
    mount(ROVING_LIST);
    wire(byId('list'));
    byId('before').focus();

    await tab();
    await press('{End}');
    expect(activeId()).toBe('c');

    await tab();
    expect(activeId()).toBe('after');
  });

  it('gets its stop from initRovingTabindex on bare items', async () => {
    mount(`
      <div id="list">
        <div id="a" data-keyrove-item data-keyrove-roving-tabindex>A</div>
        <div id="b" data-keyrove-item data-keyrove-roving-tabindex>B</div>
      </div>
    `);
    wire(byId('list'));
    initRovingTabindex(byId('list'));
    byId('before').focus();

    await tab();
    expect(activeId()).toBe('a');

    await press('{ArrowDown}');
    expect(activeId()).toBe('b');

    await tab();
    expect(activeId()).toBe('after');
  });
});

describe('focus arriving without a key', () => {
  it('moves the stop to a clicked item', async () => {
    mount(ROVING_LIST);
    wire(byId('list'));

    await userEvent.click(byId('c'));
    expect(activeId()).toBe('c');
    expect(tabindexes(byId('a'), byId('b'), byId('c'))).toEqual([
      '-1',
      '-1',
      '0',
    ]);

    await tab();
    expect(activeId()).toBe('after');

    await shiftTab();
    expect(activeId()).toBe('c');
  });

  it('moves the stop to an item focused from code', async () => {
    mount(ROVING_LIST);
    wire(byId('list'));

    byId('b').focus();
    expect(tabindexes(byId('a'), byId('b'), byId('c'))).toEqual([
      '-1',
      '0',
      '-1',
    ]);

    await tab();
    await shiftTab();
    expect(activeId()).toBe('b');
  });

  it('keeps the stop where rove put it, with focus starting outside', async () => {
    mount(ROVING_LIST);
    wire(byId('list'));
    byId('before').focus();

    expect(named(rove(byId('list'), 'next'))).toEqual({
      action: 'next',
      from: 'a',
      to: 'b',
    });
    expect(activeId()).toBe('b');

    await tab();
    await shiftTab();
    expect(activeId()).toBe('b');
  });

  it('survives a render that replaces the item holding the stop', async () => {
    mount(ROVING_LIST);
    wire(byId('list'));
    byId('before').focus();
    await tab();
    await press('{ArrowDown}');
    await tab();

    // A re-render: B is replaced by a fresh node with no stop.
    const fresh = byId('b').cloneNode(true) as Element;
    fresh.setAttribute('tabindex', '-1');
    byId('b').replaceWith(fresh);
    initRovingTabindex(byId('list'));

    await shiftTab();
    expect(activeId()).toBe('a');
  });
});

describe('nested groups', () => {
  const NESTED = `
    <div id="outer">
      <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">A</button>
      <div id="inner" data-keyrove-root>
        <button id="i1" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">I1</button>
        <button id="i2" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">I2</button>
      </div>
      <button id="b" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">B</button>
    </div>
  `;

  it('are a tab stop each, kept apart', async () => {
    mount(NESTED);
    wire(byId('outer'));
    byId('before').focus();

    await tab();
    expect(activeId()).toBe('a');

    await tab();
    expect(activeId()).toBe('i1');

    await press('{ArrowDown}');
    expect(activeId()).toBe('i2');
    expect(tabindexes(byId('a'), byId('b'))).toEqual(['0', '-1']);

    await shiftTab();
    expect(activeId()).toBe('a');

    await tab();
    expect(activeId()).toBe('i2');

    await tab();
    expect(activeId()).toBe('after');
  });

  it("keep their stops when the outer order runs through the inner group's items", async () => {
    mount(NESTED);
    wire(byId('outer'));
    byId('i1').focus();
    await press('{ArrowDown}');
    byId('a').focus();

    // A's next item in the outer order is I1. The move lands in the inner
    // group, so it is the inner stop that is carried, from I2; the outer one
    // stays on A.
    await press('{ArrowDown}');
    expect(activeId()).toBe('i1');
    expect(tabindexes(byId('a'), byId('i1'), byId('i2'), byId('b'))).toEqual([
      '0',
      '0',
      '-1',
      '-1',
    ]);

    // A move within the outer group carries the outer stop alone.
    byId('a').focus();
    await press('{End}');
    expect(activeId()).toBe('b');
    expect(tabindexes(byId('a'), byId('i1'), byId('i2'), byId('b'))).toEqual([
      '-1',
      '0',
      '-1',
      '0',
    ]);

    await shiftTab();
    expect(activeId()).toBe('i1');
  });

  it('move once for a press two nested listeners both hear', async () => {
    mount(NESTED);
    const inner = wire(byId('inner'));
    const outer = wire(byId('outer'));
    byId('i1').focus();

    await press('{ArrowDown}');

    expect(activeId()).toBe('i2');
    expect(inner.map(named)).toEqual([
      { action: 'next', from: 'i1', to: 'i2' },
    ]);
    expect(outer).toEqual([null]);
  });
});

describe('inside a shadow root', () => {
  const ITEMS = `
    <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">A</button>
    <button id="b" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">B</button>
    <button id="c" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">C</button>
  `;

  /** A host between `#before` and `#after`, its shadow tree filled with `html`. */
  const mountShadow = (html: string) => {
    mount('<div id="host"></div>');
    const shadow = byId('host').attachShadow({ mode: 'open' });
    shadow.innerHTML = html;

    return shadow;
  };

  const REPEATED = [
    { action: 'next', from: 'a', to: 'b' },
    { action: 'next', from: 'b', to: 'c' },
    { action: 'next', from: 'c', to: null },
    { action: 'prev', from: 'c', to: 'b' },
    { action: 'home', from: 'b', to: 'a' },
  ];

  const navigate = async () => {
    await press('{ArrowDown}');
    await press('{ArrowDown}');
    await press('{ArrowDown}');
    await press('{ArrowUp}');
    await press('{Home}');
  };

  it('advances on repeated presses, with the listener on an element', async () => {
    const shadow = mountShadow(`<div id="list">${ITEMS}</div>`);
    const results = wire(shadow.getElementById('list')!);
    byId('before').focus();

    await tab();
    expect(activeId()).toBe('a');

    await navigate();
    expect(results.map(named)).toEqual(REPEATED);
    expect(activeId()).toBe('a');
  });

  it('advances on repeated presses, with the listener on the shadow root', async () => {
    const shadow = mountShadow(ITEMS);
    const results = wire(shadow);
    byId('before').focus();

    await tab();
    await navigate();
    expect(results.map(named)).toEqual(REPEATED);

    await press('{End}');
    await tab();
    expect(activeId()).toBe('after');

    await shiftTab();
    expect(activeId()).toBe('c');
  });

  it('follows a click to its item', async () => {
    const shadow = mountShadow(ITEMS);
    wire(shadow);

    await userEvent.click(shadow.getElementById('b')!);

    expect(activeId()).toBe('b');
    expect(
      tabindexes(...['a', 'b', 'c'].map((id) => shadow.getElementById(id)!)),
    ).toEqual(['-1', '0', '-1']);
  });

  it('counts automatic columns on the host', async () => {
    const shadow = mountShadow(
      ['a', 'b', 'c', 'd', 'e', 'f']
        .map((id) => `<button id="${id}" data-keyrove-item>${id}</button>`)
        .join(''),
    );
    byId('host').style.cssText =
      'display: grid; grid-template-columns: repeat(3, 40px)';
    const results = wire(shadow, { cols: 'auto' });
    shadow.getElementById('b')!.focus();

    await press('{ArrowDown}');
    expect(activeId()).toBe('e');

    await press('{Home}');
    expect(activeId()).toBe('d');
    expect(results.map(named)).toEqual([
      { action: 'nextRow', from: 'b', to: 'e' },
      { action: 'homeRow', from: 'e', to: 'd' },
    ]);
  });
});

describe('a target that refuses focus', () => {
  // Each is focusable by its attributes and still takes no focus: the cases
  // the unit suite can only stand in for with a mocked `focus()`.
  const REFUSALS = {
    inert: 'inert',
    hidden: 'hidden',
    'display: none': 'style="display: none"',
    'visibility: hidden': 'style="visibility: hidden"',
  };

  for (const [name, attribute] of Object.entries(REFUSALS)) {
    it(`leaves focus, the stop and onMove alone: ${name}`, async () => {
      mount(`
        <div id="list">
          <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">Alpha</button>
          <button id="b" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1" ${attribute}>Bravo</button>
        </div>
      `);
      const onMove = vi.fn();
      const typeahead = createTypeahead({ onMove });
      const results: unknown[] = [];
      byId('list').addEventListener('keydown', (e) =>
        results.push(named(keyRove(e, { onMove }) || typeahead(e))),
      );
      byId('list').addEventListener('focusin', (e) => followFocus(e));
      byId('a').focus();

      await press('{ArrowDown}');
      await press('{End}');
      await press('b');

      expect(activeId()).toBe('a');
      expect(results).toEqual([
        { action: 'next', from: 'a', to: null },
        { action: 'end', from: 'a', to: null },
        { action: 'typeahead', from: 'a', to: null },
      ]);
      expect(onMove).not.toHaveBeenCalled();
      expect(tabindexes(byId('a'), byId('b'))).toEqual(['0', '-1']);

      await tab();
      expect(activeId()).toBe('after');

      await shiftTab();
      expect(activeId()).toBe('a');
    });
  }

  it('moves again once the target takes focus', async () => {
    mount(`
      <div id="list">
        <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">A</button>
        <button id="b" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1" inert>B</button>
      </div>
    `);
    const results = wire(byId('list'));
    byId('a').focus();

    await press('{ArrowDown}');
    byId('b').inert = false;
    await press('{ArrowDown}');

    expect(activeId()).toBe('b');
    expect(results.map(named)).toEqual([
      { action: 'next', from: 'a', to: null },
      { action: 'next', from: 'a', to: 'b' },
    ]);
    expect(tabindexes(byId('a'), byId('b'))).toEqual(['-1', '0']);
  });
});

describe('layout read from the page', () => {
  const cells = (count: number) =>
    Array.from(
      { length: count },
      (_, i) => `<button id="c${i}" data-keyrove-item>${i}</button>`,
    ).join('');

  it('counts the tracks of a CSS grid, and again after it reflows', async () => {
    mount(`
      <div id="grid" data-keyrove-cols="auto"
        style="display: grid; width: 200px; grid-template-columns: repeat(auto-fill, 50px)">
        ${cells(8)}
      </div>
    `);
    wire(byId('grid'));
    byId('c0').focus();

    await press('{ArrowDown}');
    expect(activeId()).toBe('c4');

    byId('grid').style.width = '100px';
    await press('{ArrowUp}');
    expect(activeId()).toBe('c2');
  });

  it('flips a horizontal list in an inherited right-to-left direction', async () => {
    mount(`
      <div style="direction: rtl">
        <div id="list" data-keyrove-orientation="horizontal">${cells(3)}</div>
      </div>
    `);
    wire(byId('list'));
    byId('c0').focus();

    await press('{ArrowLeft}');
    expect(activeId()).toBe('c1');

    await press('{ArrowRight}');
    expect(activeId()).toBe('c0');
  });
});
