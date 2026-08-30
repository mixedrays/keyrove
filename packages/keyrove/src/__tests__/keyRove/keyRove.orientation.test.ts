import { describe, it, expect, afterEach } from 'vitest';
import { KEYROVE_ATTR_NEXT_KEY, KEYROVE_ATTR_ORIENTATION } from '../../keyRove';
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
  describe('orientation', () => {
    it('maps next/prev to ArrowRight/ArrowLeft when horizontal', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: { [KEYROVE_ATTR_ORIENTATION]: 'horizontal' },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowRight');
      expect(activeId()).toBe('b');

      pressKey('ArrowLeft');
      expect(activeId()).toBe('a');
    });

    it('frees ArrowDown/ArrowUp to their browser defaults when horizontal', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_ORIENTATION]: 'horizontal' },
      });
      document.getElementById('a')!.focus();

      const down = pressKey('ArrowDown');
      const up = pressKey('ArrowUp');

      expect(activeId()).toBe('a');
      expect(down.defaultPrevented).toBe(false);
      expect(up.defaultPrevented).toBe(false);
    });

    it('keeps the vertical defaults for any other value', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_ORIENTATION]: 'vertical' },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it('is ignored in a grid, whose arrows keep their grid meaning', () => {
      renderGrid(9, 3, {
        containerAttrs: { [KEYROVE_ATTR_ORIENTATION]: 'horizontal' },
      });
      document.getElementById('4')!.focus();

      pressKey('ArrowRight');
      expect(activeId()).toBe('5');

      pressKey('ArrowDown');
      expect(activeId()).toBe('8');
    });

    it('flips the arrows under dir="rtl" on the root', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: {
          [KEYROVE_ATTR_ORIENTATION]: 'horizontal',
          dir: 'rtl',
        },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowLeft');
      expect(activeId()).toBe('b');

      pressKey('ArrowRight');
      expect(activeId()).toBe('a');
    });

    it('flips the arrows under dir="rtl" on an ancestor', () => {
      const container = renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_ORIENTATION]: 'horizontal' },
      });
      const wrapper = document.createElement('div');
      wrapper.setAttribute('dir', 'rtl');
      document.body.appendChild(wrapper);
      wrapper.appendChild(container);
      document.getElementById('a')!.focus();

      pressKey('ArrowLeft');

      expect(activeId()).toBe('b');
    });

    it('lets an explicit key attribute win over orientation', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: {
          [KEYROVE_ATTR_ORIENTATION]: 'horizontal',
          [KEYROVE_ATTR_NEXT_KEY]: 'KeyJ',
        },
      });
      document.getElementById('a')!.focus();

      const event = pressKey('ArrowRight');
      expect(activeId()).toBe('a');
      expect(event.defaultPrevented).toBe(false);

      pressKey('KeyJ');
      expect(activeId()).toBe('b');

      // the prev side is untouched by the override, so orientation still maps it
      pressKey('ArrowLeft');
      expect(activeId()).toBe('a');
    });
  });
});
