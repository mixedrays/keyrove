import { describe, it, expect, afterEach } from 'vitest';
import {
  KEYROVE_ATTR_END_KEY,
  KEYROVE_ATTR_HOME_KEY,
  KEYROVE_ATTR_HOME_ROW_KEY,
  KEYROVE_ATTR_PAGE_LENGTH,
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

  describe('custom Home / End keys', () => {
    it('jumps with the configured keys and frees the defaults', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: {
          [KEYROVE_ATTR_HOME_KEY]: 'KeyG',
          [KEYROVE_ATTR_END_KEY]: 'shift+KeyG',
        },
      });
      document.getElementById('b')!.focus();

      pressKey('KeyG');
      expect(activeId()).toBe('a');

      pressKey('KeyG', undefined, { shiftKey: true });
      expect(activeId()).toBe('c');

      const home = pressKey('Home');
      expect(activeId()).toBe('c');
      expect(home.defaultPrevented).toBe(false);
    });

    it('still does not enter the group on a rebound key', () => {
      const container = renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_HOME_KEY]: 'KeyG' },
      });
      container.setAttribute('tabindex', '0');
      container.focus();

      const event = pressKey('KeyG', container);

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(container);
    });

    it('rebinds the row ends and the grid ends independently', () => {
      renderGrid(9, 3, {
        containerAttrs: {
          [KEYROVE_ATTR_HOME_KEY]: 'Home',
          [KEYROVE_ATTR_HOME_ROW_KEY]: 'KeyA',
        },
      });
      document.getElementById('5')!.focus();

      // bare Home is now the whole grid's first cell
      pressKey('Home');
      expect(activeId()).toBe('0');

      document.getElementById('5')!.focus();
      pressKey('KeyA');
      expect(activeId()).toBe('3');

      // the replaced ctrl+Home default went back to the browser
      const ctrlHome = pressKey('Home', undefined, { ctrlKey: true });
      expect(activeId()).toBe('3');
      expect(ctrlHome.defaultPrevented).toBe(false);
    });
  });
});
