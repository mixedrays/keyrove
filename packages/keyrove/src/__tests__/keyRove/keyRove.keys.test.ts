import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  KEYROVE_ATTR_END_KEY,
  KEYROVE_ATTR_END_ROW_KEY,
  KEYROVE_ATTR_HOME_KEY,
  KEYROVE_ATTR_HOME_ROW_KEY,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_NEXT_ROW_KEY,
  KEYROVE_ATTR_ORIENTATION,
  KEYROVE_ATTR_PAGE_DOWN_KEY,
  KEYROVE_ATTR_PAGE_LENGTH,
  KEYROVE_ATTR_PAGE_UP_KEY,
  KEYROVE_ATTR_PREV_KEY,
  KEYROVE_ATTR_PREV_ROW_KEY,
} from '../../keyRove';
import type { StrideAction } from '../../types';
import {
  activeId,
  createItem,
  pressKey,
  renderGrid,
  renderList,
  resetTestState,
} from './testUtils';
import type { RoveResult } from './testUtils';

afterEach(resetTestState);

// Every stride with the constant that rebinds it. keyRove derives the
// attribute name from the move instead of listing it, so this pins the two
// spellings together; `satisfies` fails here when a move is added without one.
const KEY_ATTRIBUTES = {
  next: KEYROVE_ATTR_NEXT_KEY,
  prev: KEYROVE_ATTR_PREV_KEY,
  nextRow: KEYROVE_ATTR_NEXT_ROW_KEY,
  prevRow: KEYROVE_ATTR_PREV_ROW_KEY,
  home: KEYROVE_ATTR_HOME_KEY,
  end: KEYROVE_ATTR_END_KEY,
  homeRow: KEYROVE_ATTR_HOME_ROW_KEY,
  endRow: KEYROVE_ATTR_END_ROW_KEY,
  pageUp: KEYROVE_ATTR_PAGE_UP_KEY,
  pageDown: KEYROVE_ATTR_PAGE_DOWN_KEY,
} satisfies Record<StrideAction, string>;

describe('keyRove', () => {
  describe('modifier keys', () => {
    it('leaves modified presses of a bound key alone', () => {
      renderList([createItem('a'), createItem('b')]);
      document.getElementById('a')!.focus();

      const ctrlDown = pressKey('ArrowDown', undefined, { ctrlKey: true });
      const altHome = pressKey('Home', undefined, { altKey: true });
      const shiftEnd = pressKey('End', undefined, { shiftKey: true });

      expect(activeId()).toBe('a');
      expect(ctrlDown.defaultPrevented).toBe(false);
      expect(altHome.defaultPrevented).toBe(false);
      expect(shiftEnd.defaultPrevented).toBe(false);
    });

    it('navigates with a combo declared in the key attribute', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: {
          [KEYROVE_ATTR_NEXT_KEY]: 'ctrl+ArrowRight',
          [KEYROVE_ATTR_PREV_KEY]: 'ctrl+ArrowLeft',
        },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowRight', undefined, { ctrlKey: true });
      expect(activeId()).toBe('b');

      pressKey('ArrowLeft', undefined, { ctrlKey: true });
      expect(activeId()).toBe('a');
    });

    it('does not navigate with the bare code once a combo is declared', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'ctrl+ArrowRight' },
      });
      document.getElementById('a')!.focus();

      const event = pressKey('ArrowRight');

      expect(activeId()).toBe('a');
      expect(event.defaultPrevented).toBe(false);
    });

    it('resolves the mod alias per platform', () => {
      const platform = vi.spyOn(navigator, 'platform', 'get');
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'mod+ArrowDown' },
      });

      platform.mockReturnValue('MacIntel');
      document.getElementById('a')!.focus();
      pressKey('ArrowDown', undefined, { metaKey: true });
      expect(activeId()).toBe('b');

      platform.mockReturnValue('Win32');
      document.getElementById('a')!.focus();
      pressKey('ArrowDown', undefined, { metaKey: true });
      expect(activeId()).toBe('a');

      pressKey('ArrowDown', undefined, { ctrlKey: true });
      expect(activeId()).toBe('b');
    });
  });

  describe('key attributes', () => {
    it.each(Object.entries(KEY_ATTRIBUTES))(
      'binds %s through %s',
      (intent, attribute) => {
        let result: RoveResult = null;
        // a grid has every stride; the middle cell can move in any direction
        renderGrid(9, 3, {
          containerAttrs: { [attribute]: 'KeyJ' },
          onResult: (r) => (result = r),
        });
        document.getElementById('4')!.focus();

        pressKey('KeyJ');

        expect(result).toMatchObject({ action: intent });
      },
    );

    it.each([
      ['an empty', ''],
      ['a blank', '  '],
    ])('treats %s attribute as unset, keeping the default', (_, value) => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: value },
      });
      document.getElementById('a')!.focus();

      // Android's virtual keyboards send keydowns with an empty code.
      const noCode = pressKey('');
      expect(activeId()).toBe('a');
      expect(noCode.defaultPrevented).toBe(false);

      pressKey('ArrowDown');
      expect(activeId()).toBe('b');
    });
  });

  describe('several keys per move', () => {
    it.each([
      [
        'attribute',
        { containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'ArrowDown, KeyJ' } },
      ],
      ['keys option', { options: { keys: { next: 'ArrowDown, KeyJ' } } }],
    ])('moves on every key the %s lists', (_, source) => {
      renderList(
        ['a', 'b', 'c'].map((id) => createItem(id)),
        source,
      );
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');
      expect(activeId()).toBe('b');

      pressKey('KeyJ');
      expect(activeId()).toBe('c');
    });

    it('frees the default a list leaves out', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'KeyJ, ctrl+KeyN' },
      });
      document.getElementById('a')!.focus();

      const freed = pressKey('ArrowDown');
      expect(activeId()).toBe('a');
      expect(freed.defaultPrevented).toBe(false);

      pressKey('KeyN', undefined, { ctrlKey: true });
      expect(activeId()).toBe('b');
    });

    it('treats a list of nothing but commas as unset, keeping the default', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: ' , ' },
        options: { keys: { prev: ',' } },
      });
      document.getElementById('b')!.focus();

      pressKey('ArrowDown');
      expect(activeId()).toBe('c');

      pressKey('ArrowUp');
      expect(activeId()).toBe('b');
    });

    it('reads none inside a list as an entry naming no key', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'KeyJ, none' },
      });
      document.getElementById('a')!.focus();

      const freed = pressKey('ArrowDown');
      expect(activeId()).toBe('a');
      expect(freed.defaultPrevented).toBe(false);

      pressKey('KeyJ');
      expect(activeId()).toBe('b');
    });
  });

  describe('unbinding with none', () => {
    type Press = [code: string, modifiers?: { ctrlKey: boolean }];

    // The default each stride answers to, from a grid's middle cell and from
    // a list's middle item, where every one of them would move focus.
    const GRID_DEFAULTS = {
      next: ['ArrowRight'],
      prev: ['ArrowLeft'],
      nextRow: ['ArrowDown'],
      prevRow: ['ArrowUp'],
      home: ['Home', { ctrlKey: true }],
      end: ['End', { ctrlKey: true }],
      homeRow: ['Home'],
      endRow: ['End'],
      pageUp: ['PageUp'],
      pageDown: ['PageDown'],
    } satisfies Record<StrideAction, Press>;
    const LIST_DEFAULTS = {
      next: ['ArrowDown'],
      prev: ['ArrowUp'],
      home: ['Home'],
      end: ['End'],
      pageUp: ['PageUp'],
      pageDown: ['PageDown'],
    } satisfies Partial<Record<StrideAction, Press>>;

    const SOURCES = ['attribute', 'keys option'] as const;

    // `none` for one move, from the attribute or from the `keys` option.
    const unbinding = (
      intent: StrideAction,
      source: (typeof SOURCES)[number],
    ) =>
      source === 'attribute'
        ? { containerAttrs: { [KEY_ATTRIBUTES[intent]]: 'none' } }
        : { options: { keys: { [intent]: 'none' } } };

    const gridCases = SOURCES.flatMap((source) =>
      Object.entries(GRID_DEFAULTS).map(
        ([intent, press]) => [intent, source, press] as const,
      ),
    );
    const listCases = SOURCES.flatMap((source) =>
      Object.entries(LIST_DEFAULTS).map(
        ([intent, press]) => [intent, source, press] as const,
      ),
    );

    it.each(gridCases)(
      'frees a grid move %s from the %s, handing its key back',
      (intent, source, [code, modifiers]) => {
        const results: RoveResult[] = [];
        const { containerAttrs = {}, options } = unbinding(
          intent as StrideAction,
          source,
        );
        renderGrid(9, 3, {
          containerAttrs,
          options,
          onResult: (r) => results.push(r),
        });
        document.getElementById('4')!.focus();

        const event = pressKey(code, undefined, modifiers);

        expect(activeId()).toBe('4');
        expect(results).toEqual([null]);
        expect(event.defaultPrevented).toBe(false);
      },
    );

    it.each(listCases)(
      'frees a list move %s from the %s, handing its key back',
      (intent, source, [code]) => {
        const results: RoveResult[] = [];
        const { containerAttrs = {}, options } = unbinding(
          intent as StrideAction,
          source,
        );
        renderList(
          ['a', 'b', 'c', 'd', 'e'].map((id) => createItem(id)),
          {
            containerAttrs: {
              [KEYROVE_ATTR_PAGE_LENGTH]: '2',
              ...containerAttrs,
            },
            options,
            onResult: (r) => results.push(r),
          },
        );
        document.getElementById('c')!.focus();

        const event = pressKey(code);

        expect(activeId()).toBe('c');
        expect(results).toEqual([null]);
        expect(event.defaultPrevented).toBe(false);
      },
    );

    it('leaves every other move working', () => {
      renderList(
        ['a', 'b', 'c', 'd', 'e'].map((id) => createItem(id)),
        {
          containerAttrs: {
            [KEYROVE_ATTR_PAGE_LENGTH]: '2',
            [KEYROVE_ATTR_PAGE_DOWN_KEY]: 'none',
          },
        },
      );
      document.getElementById('e')!.focus();

      pressKey('PageUp');
      expect(activeId()).toBe('c');

      pressKey('ArrowDown');
      expect(activeId()).toBe('d');
    });

    it('leaves the other side of an RTL horizontal list on its flipped arrow', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: {
          dir: 'rtl',
          [KEYROVE_ATTR_ORIENTATION]: 'horizontal',
          [KEYROVE_ATTR_NEXT_KEY]: 'none',
        },
      });
      document.getElementById('b')!.focus();

      const freed = pressKey('ArrowLeft');
      expect(activeId()).toBe('b');
      expect(freed.defaultPrevented).toBe(false);

      pressKey('ArrowRight');
      expect(activeId()).toBe('a');
    });

    it('lets the keys option unbind a move the attribute binds', () => {
      renderList(
        ['a', 'b', 'c'].map((id) => createItem(id)),
        {
          containerAttrs: { [KEYROVE_ATTR_PAGE_DOWN_KEY]: 'KeyN' },
          options: { keys: { pageDown: 'none' } },
        },
      );
      document.getElementById('a')!.focus();

      const rebound = pressKey('KeyN');
      const freed = pressKey('PageDown');

      expect(activeId()).toBe('a');
      expect(rebound.defaultPrevented).toBe(false);
      expect(freed.defaultPrevented).toBe(false);
    });
  });

  describe('custom navigation keys', () => {
    it('navigates with the configured next/prev keys', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: {
          [KEYROVE_ATTR_NEXT_KEY]: 'ArrowRight',
          [KEYROVE_ATTR_PREV_KEY]: 'ArrowLeft',
        },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowRight');
      expect(activeId()).toBe('b');

      pressKey('ArrowLeft');
      expect(activeId()).toBe('a');
    });

    it('does not navigate with default keys once they are overridden', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: {
          [KEYROVE_ATTR_NEXT_KEY]: 'ArrowRight',
          [KEYROVE_ATTR_PREV_KEY]: 'ArrowLeft',
        },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('a');
    });

    it('pages with the configured page keys and frees the defaults', () => {
      renderList(
        ['a', 'b', 'c', 'd', 'e'].map((id) => createItem(id)),
        {
          containerAttrs: {
            [KEYROVE_ATTR_PAGE_LENGTH]: '2',
            [KEYROVE_ATTR_PAGE_DOWN_KEY]: 'ctrl+KeyD',
            [KEYROVE_ATTR_PAGE_UP_KEY]: 'ctrl+KeyU',
          },
        },
      );
      document.getElementById('a')!.focus();

      pressKey('KeyD', undefined, { ctrlKey: true });
      expect(activeId()).toBe('c');

      pressKey('KeyD', undefined, { ctrlKey: true });
      expect(activeId()).toBe('e');

      pressKey('KeyU', undefined, { ctrlKey: true });
      expect(activeId()).toBe('c');

      const pageDown = pressKey('PageDown');
      expect(activeId()).toBe('c');
      expect(pageDown.defaultPrevented).toBe(false);
    });
  });
});
