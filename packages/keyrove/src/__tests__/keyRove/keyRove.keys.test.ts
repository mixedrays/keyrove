import { describe, it, expect, afterEach, vi } from 'vitest';
import { KEYROVE_ATTR_NEXT_KEY, KEYROVE_ATTR_PREV_KEY } from '../../keyRove';
import {
  activeId,
  createItem,
  pressKey,
  renderList,
  resetTestState,
} from './testUtils';

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
  });
});
