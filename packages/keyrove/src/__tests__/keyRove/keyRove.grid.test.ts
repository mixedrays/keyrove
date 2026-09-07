import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_NEXT_ROW_KEY,
  KEYROVE_ATTR_PREV_KEY,
  KEYROVE_ATTR_PREV_ROW_KEY,
} from '../../keyRove';
import {
  activeId,
  createItem,
  pressKey,
  renderGrid,
  renderList,
  resetTestState,
} from './testUtils';

afterEach(resetTestState);

describe('keyRove', () => {
  describe('grid navigation (columns)', () => {
    it('moves to the item directly below on ArrowDown (by a full row)', () => {
      renderGrid(9, 3);
      document.getElementById('1')!.focus();

      pressKey('ArrowDown');

      // index 1 + 3 columns = index 4, not the next item by DOM order (2)
      expect(activeId()).toBe('4');
    });

    it('moves to the item directly above on ArrowUp (by a full row)', () => {
      renderGrid(9, 3);
      document.getElementById('7')!.focus();

      pressKey('ArrowUp');

      expect(activeId()).toBe('4');
    });

    it('moves one cell on ArrowRight/ArrowLeft', () => {
      renderGrid(9, 3);
      document.getElementById('4')!.focus();

      pressKey('ArrowRight');
      expect(activeId()).toBe('5');

      pressKey('ArrowLeft');
      expect(activeId()).toBe('4');
    });

    it('flows a cell move across the row end, following DOM order', () => {
      renderGrid(9, 3);
      document.getElementById('2')!.focus();

      pressKey('ArrowRight');
      // end of row 1 -> first cell of row 2, like a caret in text
      expect(activeId()).toBe('3');

      pressKey('ArrowLeft');
      expect(activeId()).toBe('2');
    });

    it('keeps focus when there is no row below (bottom edge)', () => {
      renderGrid(9, 3);
      document.getElementById('7')!.focus();

      pressKey('ArrowDown');

      // index 7 + 3 = 10 is out of bounds -> stays put
      expect(activeId()).toBe('7');
    });

    it('keeps focus when there is no row above (top edge)', () => {
      renderGrid(9, 3);
      document.getElementById('1')!.focus();

      pressKey('ArrowUp');

      expect(activeId()).toBe('1');
    });

    it('does not move below when the last row is partially filled', () => {
      // 5 items, 3 columns -> rows: [0 1 2], [3 4]
      renderGrid(5, 3);
      document.getElementById('2')!.focus();

      pressKey('ArrowDown');

      // index 2 + 3 = 5 is out of bounds (column 2 has no second row) -> stays
      expect(activeId()).toBe('2');
    });

    it('steps over skipped cells while staying in the same column', () => {
      // 3 columns, index 4 is skipped:
      //   0 1 2
      //   3 [4] 5
      //   6 7 8
      const items = Array.from({ length: 9 }, (_, i) =>
        createItem(`${i}`, { skip: i === 4 }),
      );
      renderList(items, {
        containerAttrs: { [KEYROVE_ATTR_COLS]: '3' },
      });
      document.getElementById('1')!.focus();

      pressKey('ArrowDown');

      // 1 -> 4 (skipped) -> 7, still in the middle column
      expect(activeId()).toBe('7');
    });

    it('fires onMove naming the row and cell moves apart', () => {
      const onMove = vi.fn();
      renderGrid(9, 3, { options: { onMove } });
      document.getElementById('4')!.focus();

      pressKey('ArrowDown');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'nextRow',
        from: document.getElementById('4'),
        to: document.getElementById('7'),
      });

      document.getElementById('4')!.focus();
      pressKey('ArrowUp');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'prevRow',
        from: document.getElementById('4'),
        to: document.getElementById('1'),
      });

      document.getElementById('4')!.focus();
      pressKey('ArrowRight');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'next',
        from: document.getElementById('4'),
        to: document.getElementById('5'),
      });

      pressKey('ArrowLeft');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'prev',
        from: document.getElementById('5'),
        to: document.getElementById('4'),
      });
    });

    it('moves the roving tab stop to the grid target', () => {
      const items = Array.from({ length: 9 }, (_, i) =>
        createItem(`${i}`, { roving: true, tabindex: i === 0 ? '0' : '-1' }),
      );
      renderList(items, {
        containerAttrs: { [KEYROVE_ATTR_COLS]: '3' },
      });
      const from = document.getElementById('0')!;
      from.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('3');
      expect(from.getAttribute('tabindex')).toBe('-1');
      expect(document.getElementById('3')!.getAttribute('tabindex')).toBe('0');
    });

    it('keeps the roving tab stop when a grid move hits an edge', () => {
      const items = Array.from({ length: 9 }, (_, i) =>
        createItem(`${i}`, { roving: true, tabindex: i === 7 ? '0' : '-1' }),
      );
      renderList(items, {
        containerAttrs: { [KEYROVE_ATTR_COLS]: '3' },
      });
      const from = document.getElementById('7')!;
      from.focus();

      pressKey('ArrowDown'); // no row below -> no-op

      expect(activeId()).toBe('7');
      // the tab stop must not be lost when the move is a no-op
      expect(from.getAttribute('tabindex')).toBe('0');
    });

    it('enters the grid at the first cell when no item has focus', () => {
      const container = renderGrid(9, 3);
      container.setAttribute('tabindex', '0');
      container.focus();

      const event = pressKey('ArrowDown', container);

      // directional keys are a way *into* a group — grids included
      expect(activeId()).toBe('0');
      expect(event.defaultPrevented).toBe(true);
    });

    it('still consumes the key at an edge, where the group owns the move', () => {
      renderGrid(9, 3);
      document.getElementById('7')!.focus();

      const event = pressKey('ArrowDown'); // no row below -> no-op

      expect(activeId()).toBe('7');
      // focus is inside the grid, so the grid owns the key up to its boundary
      // and the page must not scroll instead
      expect(event.defaultPrevented).toBe(true);
    });

    it('still consumes a cell move at the end of the grid', () => {
      renderGrid(9, 3);
      document.getElementById('8')!.focus();

      const event = pressKey('ArrowRight');

      expect(activeId()).toBe('8');
      expect(event.defaultPrevented).toBe(true);
    });

    it('falls back to linear navigation when columns is 1', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: { [KEYROVE_ATTR_COLS]: '1' },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });
  });

  describe('grid key bindings', () => {
    it('rebinds the cell moves with next-key/prev-key, freeing the arrows', () => {
      renderGrid(9, 3, {
        containerAttrs: {
          [KEYROVE_ATTR_NEXT_KEY]: 'KeyL',
          [KEYROVE_ATTR_PREV_KEY]: 'KeyH',
        },
      });
      document.getElementById('4')!.focus();

      pressKey('KeyL');
      expect(activeId()).toBe('5');

      pressKey('KeyH');
      expect(activeId()).toBe('4');

      // the replaced defaults go back to their browser behaviour
      const right = pressKey('ArrowRight');
      expect(activeId()).toBe('4');
      expect(right.defaultPrevented).toBe(false);

      // the row axis is untouched
      pressKey('ArrowDown');
      expect(activeId()).toBe('7');
    });

    it('rebinds the row moves with next-row-key/prev-row-key, freeing the arrows', () => {
      renderGrid(9, 3, {
        containerAttrs: {
          [KEYROVE_ATTR_NEXT_ROW_KEY]: 'KeyJ',
          [KEYROVE_ATTR_PREV_ROW_KEY]: 'KeyK',
        },
      });
      document.getElementById('4')!.focus();

      pressKey('KeyJ');
      expect(activeId()).toBe('7');

      pressKey('KeyK');
      expect(activeId()).toBe('4');

      const down = pressKey('ArrowDown');
      expect(activeId()).toBe('4');
      expect(down.defaultPrevented).toBe(false);

      // the cell axis is untouched
      pressKey('ArrowRight');
      expect(activeId()).toBe('5');
    });

    it('leaves the row-key attributes inert on a list', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_NEXT_ROW_KEY]: 'KeyJ' },
      });
      document.getElementById('a')!.focus();

      const event = pressKey('KeyJ');

      expect(activeId()).toBe('a');
      expect(event.defaultPrevented).toBe(false);
    });

    it('never fires two moves for one keypress, however the binding is spelled', () => {
      const onMove = vi.fn();
      renderGrid(9, 3, {
        containerAttrs: {
          // whitespace-padded spelling of the bare code, colliding with the
          // default cell binding for the same arrow
          [KEYROVE_ATTR_NEXT_ROW_KEY]: ' ArrowRight ',
        },
        options: { onMove },
      });
      document.getElementById('4')!.focus();

      pressKey('ArrowRight');

      // the explicit binding claims the key, so it moves a row — and only that
      expect(activeId()).toBe('7');
      expect(onMove).toHaveBeenCalledTimes(1);
    });

    it('lets an explicit binding win over a default bound to the same key', () => {
      renderGrid(9, 3, {
        containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'ArrowDown' },
      });
      document.getElementById('1')!.focus();

      pressKey('ArrowDown');

      // explicit next (one cell) beats the default row move on the same arrow
      expect(activeId()).toBe('2');
    });
  });

  describe('grid reading direction', () => {
    it('flips the default cell arrows under dir="rtl"', () => {
      renderGrid(9, 3, { containerAttrs: { dir: 'rtl' } });
      document.getElementById('4')!.focus();

      // DOM order renders right-to-left, so ArrowLeft is the forward cell move
      pressKey('ArrowLeft');
      expect(activeId()).toBe('5');

      pressKey('ArrowRight');
      expect(activeId()).toBe('4');
    });

    it('keeps the row arrows unflipped under dir="rtl"', () => {
      renderGrid(9, 3, { containerAttrs: { dir: 'rtl' } });
      document.getElementById('4')!.focus();

      pressKey('ArrowDown');
      expect(activeId()).toBe('7');

      pressKey('ArrowUp');
      expect(activeId()).toBe('4');
    });

    it('never flips an explicit binding', () => {
      renderGrid(9, 3, {
        containerAttrs: {
          dir: 'rtl',
          [KEYROVE_ATTR_NEXT_KEY]: 'ArrowRight',
          [KEYROVE_ATTR_PREV_KEY]: 'ArrowLeft',
        },
      });
      document.getElementById('4')!.focus();

      // explicit bindings are physical and literal, whatever the direction
      pressKey('ArrowRight');
      expect(activeId()).toBe('5');

      pressKey('ArrowLeft');
      expect(activeId()).toBe('4');
    });
  });

  describe('grid Home / End', () => {
    it('moves to the ends of the focused row on bare Home/End', () => {
      renderGrid(9, 3);
      document.getElementById('4')!.focus();

      pressKey('Home');
      expect(activeId()).toBe('3');

      document.getElementById('4')!.focus();
      pressKey('End');
      expect(activeId()).toBe('5');
    });

    it('moves to the ends of the grid on ctrl+Home/ctrl+End', () => {
      renderGrid(9, 3);
      document.getElementById('4')!.focus();

      pressKey('Home', undefined, { ctrlKey: true });
      expect(activeId()).toBe('0');

      document.getElementById('4')!.focus();
      pressKey('End', undefined, { ctrlKey: true });
      expect(activeId()).toBe('8');
    });

    it('lands on the row ends in a ragged last row', () => {
      // 3 columns, 5 items -> rows: [0 1 2], [3 4]
      renderGrid(5, 3);
      document.getElementById('3')!.focus();

      pressKey('End');

      expect(activeId()).toBe('4');
    });

    it('lands on the first and last non-skipped cell of the row', () => {
      //   0  [1] 2
      const items = [
        createItem('0'),
        createItem('1', { skip: true }),
        createItem('2'),
        createItem('3'),
        createItem('4'),
        createItem('5', { skip: true }),
      ];
      renderList(items, { containerAttrs: { [KEYROVE_ATTR_COLS]: '3' } });
      document.getElementById('4')!.focus();

      pressKey('End');
      // 5 is skipped, so the row ends at 4 — a consumed no-op here
      expect(activeId()).toBe('4');

      pressKey('Home');
      expect(activeId()).toBe('3');
    });

    it('reports row and grid jumps apart in onMove', () => {
      const onMove = vi.fn();
      renderGrid(9, 3, { options: { onMove } });
      document.getElementById('4')!.focus();

      pressKey('Home');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'homeRow',
        from: document.getElementById('4'),
        to: document.getElementById('3'),
      });

      pressKey('End', undefined, { ctrlKey: true });
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'end',
        from: document.getElementById('3'),
        to: document.getElementById('8'),
      });
    });

    it('leaves ctrl+Home/ctrl+End alone in a list', () => {
      renderList([createItem('a'), createItem('b')]);
      document.getElementById('b')!.focus();

      const event = pressKey('Home', undefined, { ctrlKey: true });

      expect(activeId()).toBe('b');
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
