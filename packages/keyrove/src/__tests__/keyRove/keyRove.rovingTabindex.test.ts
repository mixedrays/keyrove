import { describe, it, expect, afterEach } from 'vitest';
import { KEYROVE_ATTR_ROVING_TABINDEX } from '../../keyRove';
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
  });
});
