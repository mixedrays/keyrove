import { describe, it, expect, afterEach } from 'vitest';
import { KEYROVE_ATTR_PAGE_LENGTH } from '../../keyRove';
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
  describe('Page Up / Page Down', () => {
    const sixItems = () =>
      ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => createItem(id));

    it('moves by the page length', () => {
      // page length 2 → pages [a, b] [c, d] [e, f]
      renderList(sixItems(), {
        containerAttrs: { [KEYROVE_ATTR_PAGE_LENGTH]: '2' },
      });
      document.getElementById('a')!.focus();

      pressKey('PageDown');
      expect(activeId()).toBe('c');

      pressKey('PageDown');
      expect(activeId()).toBe('e');

      pressKey('PageUp');
      expect(activeId()).toBe('c');
    });

    it('defaults to a page length of 10', () => {
      renderList(Array.from({ length: 12 }, (_, i) => createItem(`i${i}`)));
      document.getElementById('i0')!.focus();

      pressKey('PageDown');

      expect(activeId()).toBe('i10');
    });

    it('clamps to the last item when the jump overshoots the end', () => {
      renderList(
        [createItem('a'), createItem('b'), createItem('c'), createItem('d')],
        { containerAttrs: { [KEYROVE_ATTR_PAGE_LENGTH]: '3' } },
      );
      document.getElementById('b')!.focus();

      pressKey('PageDown');

      expect(activeId()).toBe('d');
    });

    it('clamps to the first item when the jump overshoots the start', () => {
      renderList(
        [createItem('a'), createItem('b'), createItem('c'), createItem('d')],
        { containerAttrs: { [KEYROVE_ATTR_PAGE_LENGTH]: '3' } },
      );
      document.getElementById('c')!.focus();

      pressKey('PageUp');

      expect(activeId()).toBe('a');
    });

    it('steps over a skipped item it would have landed on', () => {
      renderList(
        [
          createItem('a'),
          createItem('b'),
          createItem('c', { skip: true }),
          createItem('d'),
        ],
        { containerAttrs: { [KEYROVE_ATTR_PAGE_LENGTH]: '2' } },
      );
      document.getElementById('a')!.focus();

      pressKey('PageDown');

      expect(activeId()).toBe('d');
    });

    it('moves by whole rows in grid mode, keeping the column', () => {
      // 3 columns, page length 2 → stride of 6 items (2 rows)
      renderGrid(9, 3, {
        containerAttrs: { [KEYROVE_ATTR_PAGE_LENGTH]: '2' },
      });
      document.getElementById('1')!.focus();

      pressKey('PageDown');

      expect(activeId()).toBe('7');
    });

    it('leaves the key unhandled when no item has focus', () => {
      const container = renderList([createItem('a'), createItem('b')]);
      container.setAttribute('tabindex', '0');
      container.focus();

      const event = pressKey('PageDown', container);

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(container);
    });
  });
});
