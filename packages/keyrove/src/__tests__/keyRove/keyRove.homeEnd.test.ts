import { describe, it, expect, afterEach } from 'vitest';
import { KEYROVE_ATTR_PAGE_LENGTH } from '../../keyRove';
import {
  activeId,
  createItem,
  pressKey,
  renderList,
  resetTestState,
} from './testUtils';

afterEach(resetTestState);

describe('keyRove', () => {
  describe('Home / End', () => {
    it('moves focus to the first item on Home and the last item on End', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')]);
      document.getElementById('b')!.focus();

      pressKey('End');
      expect(activeId()).toBe('c');

      pressKey('Home');
      expect(activeId()).toBe('a');
    });

    it('ignores the page length, jumping to the true first and last item', () => {
      renderList(
        [createItem('a'), createItem('b'), createItem('c'), createItem('d')],
        { containerAttrs: { [KEYROVE_ATTR_PAGE_LENGTH]: '2' } },
      );
      document.getElementById('a')!.focus();

      pressKey('End');
      expect(activeId()).toBe('d');

      pressKey('Home');
      expect(activeId()).toBe('a');
    });

    it('lands on the first and last non-skipped item', () => {
      renderList([
        createItem('a', { skip: true }),
        createItem('b'),
        createItem('c'),
        createItem('d', { skip: true }),
      ]);
      document.getElementById('b')!.focus();

      pressKey('End');
      expect(activeId()).toBe('c');

      pressKey('Home');
      expect(activeId()).toBe('b');
    });

    it('leaves the key unhandled when no item has focus', () => {
      const container = renderList([createItem('a'), createItem('b')]);
      container.setAttribute('tabindex', '0');
      container.focus();

      const event = pressKey('Home', container);

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(container);
    });
  });
});
