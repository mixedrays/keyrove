import { describe, it, expect, afterEach, vi } from 'vitest';
import { KEYROVE_ATTR_COLS_LENGTH, KEYROVE_ATTR_PREV_KEY } from '../../keyRove';
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

    it('moves one cell within the row on ArrowRight/ArrowLeft', () => {
      renderGrid(9, 3);
      document.getElementById('4')!.focus();

      pressKey('ArrowRight');
      expect(activeId()).toBe('5');

      pressKey('ArrowLeft');
      expect(activeId()).toBe('4');
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
        containerAttrs: { [KEYROVE_ATTR_COLS_LENGTH]: '3' },
      });
      document.getElementById('1')!.focus();

      pressKey('ArrowDown');

      // 1 -> 4 (skipped) -> 7, still in the middle column
      expect(activeId()).toBe('7');
    });

    it('fires onMove with the grid target', () => {
      const onMove = vi.fn();
      renderGrid(9, 3, { options: { onMove } });
      document.getElementById('4')!.focus();

      pressKey('ArrowDown');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'next',
        from: document.getElementById('4'),
        to: document.getElementById('7'),
      });

      document.getElementById('4')!.focus();
      pressKey('ArrowUp');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'prev',
        from: document.getElementById('4'),
        to: document.getElementById('1'),
      });
    });

    it('moves the roving tab stop to the grid target', () => {
      const items = Array.from({ length: 9 }, (_, i) =>
        createItem(`${i}`, { roving: true, tabindex: i === 0 ? '0' : '-1' }),
      );
      renderList(items, {
        containerAttrs: { [KEYROVE_ATTR_COLS_LENGTH]: '3' },
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
        containerAttrs: { [KEYROVE_ATTR_COLS_LENGTH]: '3' },
      });
      const from = document.getElementById('7')!;
      from.focus();

      pressKey('ArrowDown'); // no row below -> no-op

      expect(activeId()).toBe('7');
      // the tab stop must not be lost when the move is a no-op
      expect(from.getAttribute('tabindex')).toBe('0');
    });

    it('leaves the key unhandled when no item has focus', () => {
      const container = renderGrid(9, 3);
      container.setAttribute('tabindex', '0');
      container.focus();

      const event = pressKey('ArrowDown', container);

      // a grid cell move has nothing to resolve from outside the grid, so the
      // key keeps its browser default rather than being swallowed
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(container);
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

    it('still consumes a cell move at the end of a row', () => {
      renderGrid(9, 3);
      document.getElementById('8')!.focus();

      const event = pressKey('ArrowRight');

      expect(activeId()).toBe('8');
      expect(event.defaultPrevented).toBe(true);
    });

    it('never fires both the row and the cell move for one keypress, however the binding is spelled', () => {
      const onMove = vi.fn();
      renderGrid(9, 3, {
        containerAttrs: {
          // whitespace-padded spelling of the bare code
          [KEYROVE_ATTR_PREV_KEY]: ' ArrowLeft ',
        },
        options: { onMove },
      });
      document.getElementById('4')!.focus();

      pressKey('ArrowLeft');

      // the binding claims the key, so it moves a row up — and only that
      expect(activeId()).toBe('1');
      expect(onMove).toHaveBeenCalledTimes(1);
    });

    it('falls back to linear navigation when columns is 1', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: { [KEYROVE_ATTR_COLS_LENGTH]: '1' },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });
  });
});
