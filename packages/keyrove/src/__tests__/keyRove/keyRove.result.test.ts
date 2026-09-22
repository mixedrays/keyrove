import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  keyRove,
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_ROVING_TABINDEX,
} from '../../keyRove';
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

  describe('a target that does not take focus', () => {
    // A bare `<div>` item: no `tabindex`, so `focus()` does nothing.
    const bareItem = (id: string) => {
      const item = createItem(id);
      item.removeAttribute('tabindex');

      return item;
    };

    const byId = (id: string) => document.getElementById(id)!;

    it('is a consumed no-op: focus stays, onMove stays quiet, to is null', () => {
      const onMove = vi.fn();
      const results: RoveResult[] = [];
      renderList([createItem('a'), bareItem('b')], {
        options: { onMove },
        onResult: (r) => results.push(r),
      });
      byId('a').focus();

      const event = pressKey('ArrowDown');

      expect(activeId()).toBe('a');
      expect(onMove).not.toHaveBeenCalled();
      expect(results).toEqual([{ action: 'next', from: byId('a'), to: null }]);
      expect(event.defaultPrevented).toBe(true);
    });

    it('is the same no-op for a focus key on an element that is not focusable', () => {
      const onMove = vi.fn();
      const results: RoveResult[] = [];
      const container = renderList([createItem('a')], {
        options: { onMove },
        onResult: (r) => results.push(r),
      });
      const panel = document.createElement('section');
      panel.setAttribute(KEYROVE_ATTR_FOCUS_KEY, 'KeyP');
      container.appendChild(panel);
      byId('a').focus();

      pressKey('KeyP');

      expect(activeId()).toBe('a');
      expect(onMove).not.toHaveBeenCalled();
      expect(results).toEqual([{ action: 'focus', from: null, to: null }]);
    });

    it('puts the roving tab stop back where it was', () => {
      const items = ['a', 'b', 'c'].map((id) =>
        createItem(id, { roving: true, tabindex: '-1' }),
      );
      items[0].setAttribute('tabindex', '0');
      items[2].removeAttribute('tabindex');
      renderList(items);
      // Inert or hidden in a browser: focusable by its attributes, and still
      // refusing focus.
      vi.spyOn(items[1], 'focus').mockImplementation(() => {});
      vi.spyOn(items[2], 'focus').mockImplementation(() => {});
      byId('a').focus();

      pressKey('ArrowDown');
      pressKey('End');

      expect(activeId()).toBe('a');
      expect(items.map((item) => item.getAttribute('tabindex'))).toEqual([
        '0',
        '-1',
        null,
      ]);
    });

    it('still moves to a bare item the roving stop makes focusable', () => {
      const onMove = vi.fn();
      const b = bareItem('b');
      b.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'true');
      renderList([createItem('a', { roving: true }), b], {
        options: { onMove },
      });
      byId('a').focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
      expect(b.getAttribute('tabindex')).toBe('0');
      expect(onMove).toHaveBeenCalledTimes(1);
    });

    it('counts focus handed on to a control inside the target as a move', () => {
      const onMove = vi.fn();
      const b = bareItem('b');
      const button = document.createElement('button');
      b.appendChild(button);
      renderList([createItem('a'), b], { options: { onMove } });
      // A composite item that forwards focus to its own control.
      b.focus = () => button.focus();
      byId('a').focus();

      pressKey('ArrowDown');

      expect(document.activeElement).toBe(button);
      expect(onMove).toHaveBeenCalledWith({
        action: 'next',
        from: byId('a'),
        to: b,
      });
    });

    it('counts focus that lands inside a shadow root', () => {
      const onMove = vi.fn();
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const list = document.createElement('div');
      const [a, b] = [createItem('a'), createItem('b')];
      list.append(a, b);
      shadow.appendChild(list);
      list.addEventListener('keydown', (e) => keyRove(e, { onMove }));

      pressKey('ArrowDown', list);

      expect(shadow.activeElement).toBe(a);
      expect(onMove).toHaveBeenCalledWith({
        action: 'next',
        from: null,
        to: a,
      });
    });
  });

  describe('an event already consumed', () => {
    // Two groups' worth of listeners over one list, as a component inside an
    // app shell wires them: both call keyRove on the same bubbling event.
    const renderNested = (onMove = vi.fn()) => {
      const outer = document.createElement('div');
      const inner = document.createElement('div');
      inner.setAttribute('data-keyrove-root', '');
      inner.append(createItem('a'), createItem('b'), createItem('c'));
      outer.appendChild(inner);
      document.body.appendChild(outer);
      const results: RoveResult[] = [];
      for (const listener of [inner, outer]) {
        listener.addEventListener('keydown', (e) =>
          results.push(keyRove(e, { onMove })),
        );
      }

      return { outer, inner, results };
    };

    const byId = (id: string) => document.getElementById(id)!;

    it('moves once when two ancestors call keyRove on the same press', () => {
      const onMove = vi.fn();
      const { results } = renderNested(onMove);
      byId('a').focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
      expect(onMove).toHaveBeenCalledTimes(1);
      expect(results).toEqual([
        { action: 'next', from: byId('a'), to: byId('b') },
        null,
      ]);
    });

    it('leaves a key alone that a handler below canceled', () => {
      const results: RoveResult[] = [];
      renderList([createItem('a'), createItem('b')], {
        onResult: (r) => results.push(r),
      });
      byId('a').addEventListener('keydown', (e) => e.preventDefault());
      byId('a').focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('a');
      expect(results).toEqual([null]);
    });

    it('still lets an ancestor handle a key the handler below left untouched', () => {
      const { outer, results } = renderNested();
      const outside = createItem('outside', { focusKey: 'KeyO' });
      outer.appendChild(outside);
      byId('a').focus();

      // The focus key sits outside the inner listener's element, so only the
      // outer listener reaches it.
      pressKey('KeyO');

      expect(activeId()).toBe('outside');
      expect(results).toEqual([
        null,
        { action: 'focus', from: byId('a'), to: outside },
      ]);
    });

    it('reads a hand-built event without the flag as not consumed', () => {
      const list = renderList([createItem('a'), createItem('b')]);
      byId('a').focus();
      const event = {
        code: 'ArrowDown',
        target: byId('a'),
        currentTarget: list,
        preventDefault: vi.fn(),
      };

      expect(keyRove(event)?.to).toBe(byId('b'));
      expect(
        keyRove({ ...event, target: byId('b'), defaultPrevented: true }),
      ).toBeNull();
      expect(activeId()).toBe('b');
    });
  });
});
