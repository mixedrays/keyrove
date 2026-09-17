import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  KEYROVE_ATTR_END_KEY,
  KEYROVE_ATTR_END_ROW_KEY,
  KEYROVE_ATTR_HOME_KEY,
  KEYROVE_ATTR_HOME_ROW_KEY,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_NEXT_ROW_KEY,
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
    // Every stride with the constant that rebinds it. keyRove derives the
    // attribute name from the move instead of listing it, so this pins the two
    // spellings together; `satisfies` fails here when a move is added without
    // one.
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
