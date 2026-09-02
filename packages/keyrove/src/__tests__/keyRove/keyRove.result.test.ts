import { describe, it, expect, afterEach, vi } from 'vitest';
import { KEYROVE_ATTR_NEXT_KEY } from '../../keyRove';
import {
  activeId,
  createItem,
  pressKey,
  renderGrid,
  renderList,
  resetTestState,
} from './testUtils';
import type { RenderOptions, RoveResult } from './testUtils';

afterEach(resetTestState);

describe('keyRove', () => {
  describe('onMove', () => {
    it('fires with the action and both endpoints of the move', () => {
      const onMove = vi.fn();
      renderList([createItem('a'), createItem('b')], { options: { onMove } });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'next',
        from: document.getElementById('a'),
        to: document.getElementById('b'),
      });

      pressKey('ArrowUp');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'prev',
        from: document.getElementById('b'),
        to: document.getElementById('a'),
      });
    });

    it('fires for home and end moves', () => {
      const onMove = vi.fn();
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        options: { onMove },
      });
      document.getElementById('b')!.focus();

      pressKey('End');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'end',
        from: document.getElementById('b'),
        to: document.getElementById('c'),
      });

      pressKey('Home');
      expect(onMove).toHaveBeenLastCalledWith({
        action: 'home',
        from: document.getElementById('c'),
        to: document.getElementById('a'),
      });
    });

    it('reports from as null when the group is entered from outside', () => {
      const onMove = vi.fn();
      const container = renderList([createItem('a')], { options: { onMove } });
      container.setAttribute('tabindex', '0');
      container.focus();

      pressKey('ArrowDown', container);

      expect(onMove).toHaveBeenCalledWith({
        action: 'next',
        from: null,
        to: document.getElementById('a'),
      });
    });

    it('does not fire when the key is consumed at the end of a list', () => {
      const onMove = vi.fn();
      renderList([createItem('a'), createItem('b')], { options: { onMove } });
      document.getElementById('b')!.focus();

      const event = pressKey('ArrowDown');

      // the group owns the key up to its boundary, but nothing moved
      expect(event.defaultPrevented).toBe(true);
      expect(activeId()).toBe('b');
      expect(onMove).not.toHaveBeenCalled();
    });

    it('does not fire at a grid edge', () => {
      const onMove = vi.fn();
      renderGrid(9, 3, { options: { onMove } });
      document.getElementById('7')!.focus();

      pressKey('ArrowDown');

      expect(onMove).not.toHaveBeenCalled();
    });
  });

  describe('return value', () => {
    const renderCapturing = (
      items: HTMLElement[],
      renderOptions: RenderOptions = {},
    ) => {
      const results: RoveResult[] = [];
      renderList(items, { ...renderOptions, onResult: (r) => results.push(r) });

      return results;
    };

    it('returns the move when focus moved', () => {
      const results = renderCapturing([createItem('a'), createItem('b')]);
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(results).toEqual([
        {
          action: 'next',
          from: document.getElementById('a'),
          to: document.getElementById('b'),
        },
      ]);
    });

    it('returns to: null for a consumed no-op at the end of a list', () => {
      const results = renderCapturing([createItem('a'), createItem('b')]);
      document.getElementById('b')!.focus();

      pressKey('ArrowDown');

      expect(results).toEqual([
        { action: 'next', from: document.getElementById('b'), to: null },
      ]);
    });

    it('returns null for an unbound key', () => {
      const results = renderCapturing([createItem('a')]);
      document.getElementById('a')!.focus();

      pressKey('KeyA');

      expect(results).toEqual([null]);
    });

    it('returns null when the group has no items', () => {
      const results: RoveResult[] = [];
      const container = renderList([], { onResult: (r) => results.push(r) });
      container.setAttribute('tabindex', '0');
      container.focus();

      pressKey('ArrowDown', container);

      expect(results).toEqual([null]);
    });

    it("resolves a custom binding over another move's default key", () => {
      const results = renderCapturing(
        [createItem('a'), createItem('b'), createItem('c')],
        { containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'Home' } },
      );
      document.getElementById('a')!.focus();

      pressKey('Home');

      // one keypress, one action: the binding wins and the default stands down
      expect(activeId()).toBe('b');
      expect(results).toEqual([
        {
          action: 'next',
          from: document.getElementById('a'),
          to: document.getElementById('b'),
        },
      ]);
    });
  });
});
