import { describe, it, expect, afterEach, vi } from 'vitest';
import { followFocus } from '../../followFocus';
import { keyRove, KEYROVE_ATTR_ROVING_TABINDEX } from '../../keyRove';
import type { Options } from '../../types';
import {
  activeId,
  createItem,
  pressKey,
  renderList,
  resetTestState,
} from './testUtils';

afterEach(resetTestState);

describe('keyRove', () => {
  describe('roving tabindex', () => {
    it('moves the tab stop from the old item to the new item', () => {
      const first = createItem('a', { roving: true, tabindex: '0' });
      const second = createItem('b', { roving: true, tabindex: '-1' });
      renderList([first, second]);
      first.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
      expect(first.getAttribute('tabindex')).toBe('-1');
      expect(second.getAttribute('tabindex')).toBe('0');
    });

    it('works with the bare attribute spelling, without a value', () => {
      const first = createItem('a', { tabindex: '0' });
      const second = createItem('b', { tabindex: '-1' });
      first.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, '');
      second.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, '');
      renderList([first, second]);
      first.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
      expect(first.getAttribute('tabindex')).toBe('-1');
      expect(second.getAttribute('tabindex')).toBe('0');
    });

    it('does not move the tab stop when the attribute is false', () => {
      const first = createItem('a', { tabindex: '0' });
      const second = createItem('b', { tabindex: '-1' });
      first.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'false');
      second.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'false');
      renderList([first, second]);
      first.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
      expect(first.getAttribute('tabindex')).toBe('0');
      expect(second.getAttribute('tabindex')).toBe('-1');
    });

    describe('across nested groups', () => {
      // Two roving groups under one delegated listener: the outer group's a
      // and d, around a nested group of b and c. The outer order runs a, b, c,
      // d, and each group keeps a stop of its own.
      const NESTED = ({ outer = 'a', inner = 'b', focusKey = '' } = {}) => `
        <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="${outer === 'a' ? 0 : -1}">A</button>
        <div id="inner" data-keyrove-root>
          <button id="b" data-keyrove-item data-keyrove-roving-tabindex tabindex="${inner === 'b' ? 0 : -1}">B</button>
          <button id="c" data-keyrove-item data-keyrove-roving-tabindex tabindex="${inner === 'c' ? 0 : -1}">C</button>
        </div>
        <button id="d" data-keyrove-item data-keyrove-roving-tabindex tabindex="${outer === 'd' ? 0 : -1}" ${focusKey}>D</button>
      `;

      const render = (
        html: string,
        {
          follow = false,
          options,
        }: { follow?: boolean; options?: Options } = {},
      ) => {
        const outer = document.createElement('div');
        outer.id = 'outer';
        outer.innerHTML = html;
        document.body.appendChild(outer);
        outer.addEventListener('keydown', (e) => keyRove(e, options));
        if (follow) {
          outer.addEventListener('focusin', (e) => followFocus(e, options));
        }

        return outer;
      };

      const byId = (id: string) => document.getElementById(id)!;

      /** Every item's `tabindex`, by id. */
      const tabindexes = (outer: Element) =>
        Object.fromEntries(
          Array.from(outer.querySelectorAll('[tabindex]')).map((el) => [
            el.id,
            el.getAttribute('tabindex'),
          ]),
        );

      describe.each([
        ['without', false],
        ['with', true],
      ])('%s a followFocus listener', (_, follow) => {
        it("keeps the outer group's stop when an arrow enters the nested group", () => {
          const outer = render(NESTED(), { follow });
          byId('a').focus();

          pressKey('ArrowDown');

          expect(activeId()).toBe('b');
          expect(tabindexes(outer)).toEqual({
            a: '0',
            b: '0',
            c: '-1',
            d: '-1',
          });
        });

        it("moves the nested group's own stop to an item other than it", () => {
          const outer = render(NESTED({ inner: 'c' }), { follow });
          byId('a').focus();

          pressKey('ArrowDown');

          expect(activeId()).toBe('b');
          expect(tabindexes(outer)).toEqual({
            a: '0',
            b: '0',
            c: '-1',
            d: '-1',
          });
        });

        it('enters the nested group backwards the same way', () => {
          const outer = render(NESTED({ outer: 'd' }), { follow });
          byId('d').focus();

          pressKey('ArrowUp');

          expect(activeId()).toBe('c');
          expect(tabindexes(outer)).toEqual({
            a: '-1',
            b: '-1',
            c: '0',
            d: '0',
          });
        });

        it("keeps the nested group's stop when a focus key leaves it", () => {
          const outer = render(
            NESTED({ focusKey: 'data-keyrove-focus-key="alt+KeyD"' }),
            { follow },
          );
          byId('b').focus();

          pressKey('KeyD', document.activeElement!, { altKey: true });

          expect(activeId()).toBe('d');
          expect(tabindexes(outer)).toEqual({
            a: '-1',
            b: '0',
            c: '-1',
            d: '0',
          });
        });
      });

      it('reads the groups through root and item selectors the same way', () => {
        const options: Options = {
          root: '.group',
          items: '.item',
          rovingTabindex: true,
        };
        const outer = render(
          `
            <button id="a" class="item" tabindex="0">A</button>
            <div id="inner" class="group">
              <button id="b" class="item" tabindex="-1">B</button>
              <button id="c" class="item" tabindex="0">C</button>
            </div>
            <button id="d" class="item" tabindex="-1">D</button>
          `,
          { follow: true, options },
        );
        byId('a').focus();

        pressKey('ArrowDown');

        expect(activeId()).toBe('b');
        expect(tabindexes(outer)).toEqual({ a: '0', b: '0', c: '-1', d: '-1' });
      });

      it('counts an item that is itself a root in the group above it', () => {
        const outer = render(`
          <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">A</button>
          <div id="panel" data-keyrove-item data-keyrove-roving-tabindex data-keyrove-root tabindex="-1">
            <button id="p0" data-keyrove-item data-keyrove-roving-tabindex tabindex="0">P0</button>
            <button id="p1" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">P1</button>
          </div>
        `);
        byId('a').focus();

        pressKey('ArrowDown');

        expect(activeId()).toBe('panel');
        expect(tabindexes(outer)).toEqual({
          a: '-1',
          panel: '0',
          p0: '0',
          p1: '-1',
        });
      });

      it('puts every changed tab stop back when the nested item refuses focus', () => {
        const outer = render(NESTED({ inner: 'c' }));
        // Inert or hidden in a browser: focusable by its attributes, and still
        // refusing focus.
        vi.spyOn(byId('b'), 'focus').mockImplementation(() => {});
        byId('a').focus();

        pressKey('ArrowDown');

        expect(activeId()).toBe('a');
        expect(tabindexes(outer)).toEqual({ a: '0', b: '-1', c: '0', d: '-1' });
      });
    });
  });
});
