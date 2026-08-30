import { describe, it, expect, afterEach, vi } from 'vitest';
import { KEYROVE_ATTR_LOOP } from '../../keyRove';
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
  describe('loop', () => {
    it('wraps from the last item to the first and vice versa', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: { [KEYROVE_ATTR_LOOP]: 'true' },
      });
      document.getElementById('c')!.focus();

      pressKey('ArrowDown');
      expect(activeId()).toBe('a');

      pressKey('ArrowUp');
      expect(activeId()).toBe('c');
    });

    it('works with the bare attribute spelling, without a value', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_LOOP]: '' },
      });
      document.getElementById('b')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('a');
    });

    it('wraps to the first and last non-skipped item', () => {
      renderList(
        [
          createItem('a', { skip: true }),
          createItem('b'),
          createItem('c'),
          createItem('d', { skip: true }),
        ],
        {
          containerAttrs: { [KEYROVE_ATTR_LOOP]: 'true' },
        },
      );
      document.getElementById('c')!.focus();

      pressKey('ArrowDown');
      expect(activeId()).toBe('b');

      pressKey('ArrowUp');
      expect(activeId()).toBe('c');
    });

    it('is ignored in a grid, where the edge stays a consumed no-op', () => {
      renderGrid(9, 3, { containerAttrs: { [KEYROVE_ATTR_LOOP]: 'true' } });
      document.getElementById('7')!.focus();

      const event = pressKey('ArrowDown');

      expect(activeId()).toBe('7');
      expect(event.defaultPrevented).toBe(true);
    });

    it('enters the group at the last item on the prev key', () => {
      const container = renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_LOOP]: 'true' },
      });
      container.setAttribute('tabindex', '0');
      container.focus();

      // a looping group is a circle: "before the first" is the last, matching
      // the APG menu-button convention (Down enters first, Up enters last)
      pressKey('ArrowUp', container);

      expect(activeId()).toBe('b');
    });

    it('is a consumed no-op on a single item, and onMove stays silent', () => {
      const onMove = vi.fn();
      const results: RoveResult[] = [];
      renderList([createItem('a')], {
        containerAttrs: { [KEYROVE_ATTR_LOOP]: 'true' },
        options: { onMove },
        onResult: (r) => results.push(r),
      });
      const item = document.getElementById('a')!;
      item.focus();

      const event = pressKey('ArrowDown');

      expect(activeId()).toBe('a');
      expect(event.defaultPrevented).toBe(true);
      expect(onMove).not.toHaveBeenCalled();
      expect(results).toEqual([{ action: 'next', from: item, to: null }]);
    });
  });
});
