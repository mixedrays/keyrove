import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  keyRove,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_SKIP,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_PREV_KEY,
  KEYROVE_ATTR_PAGE_LENGTH,
  KEYROVE_ATTR_COLS_LENGTH,
  KEYROVE_ATTR_ROVING_TABINDEX,
} from '../keyRove';

type ItemSpec = {
  skip?: boolean;
  disabled?: boolean;
  roving?: boolean;
  tabindex?: string;
};

const createItem = (id: string, spec: ItemSpec = {}) => {
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute(KEYROVE_ATTR_ITEM, 'true');
  el.setAttribute('tabindex', spec.tabindex ?? '0');

  if (spec.skip) el.setAttribute(KEYROVE_ATTR_SKIP, 'true');
  if (spec.disabled) el.setAttribute('disabled', 'true');
  if (spec.roving) el.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'true');

  return el;
};

type RenderOptions = {
  containerAttrs?: Record<string, string>;
  options?: Parameters<typeof keyRove>[1];
};

/** Builds a list container wired to keyRove and appends it to the document. */
const renderList = (
  items: HTMLElement[],
  { containerAttrs = {}, options }: RenderOptions = {},
) => {
  const container = document.createElement('div');

  Object.entries(containerAttrs).forEach(([key, value]) =>
    container.setAttribute(key, value),
  );
  items.forEach((item) => container.appendChild(item));

  document.body.appendChild(container);
  container.addEventListener('keydown', (e) => keyRove(e, options));

  return container;
};

/** Dispatches a keydown that bubbles up to the list container from a focused element. */
const pressKey = (
  code: string,
  from: Element = document.activeElement as Element,
) => {
  const event = new KeyboardEvent('keydown', {
    code,
    bubbles: true,
    cancelable: true,
  });
  from.dispatchEvent(event);

  return event;
};

const activeId = () => document.activeElement?.id;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('keyRove', () => {
  describe('vertical navigation (default keys)', () => {
    it('moves focus to the next item on ArrowDown', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')]);
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it('moves focus to the previous item on ArrowUp', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')]);
      document.getElementById('c')!.focus();

      pressKey('ArrowUp');

      expect(activeId()).toBe('b');
    });

    it('keeps focus on the last item when pressing ArrowDown at the end', () => {
      renderList([createItem('a'), createItem('b')]);
      document.getElementById('b')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it('keeps focus on the first item when pressing ArrowUp at the start', () => {
      renderList([createItem('a'), createItem('b')]);
      document.getElementById('a')!.focus();

      pressKey('ArrowUp');

      expect(activeId()).toBe('a');
    });

    it('calls preventDefault for handled keys', () => {
      renderList([createItem('a'), createItem('b')]);
      document.getElementById('a')!.focus();

      const event = pressKey('ArrowDown');

      expect(event.defaultPrevented).toBe(true);
    });

    it('ignores unrelated keys and leaves focus untouched', () => {
      renderList([createItem('a'), createItem('b')]);
      document.getElementById('a')!.focus();

      const event = pressKey('KeyA');

      expect(activeId()).toBe('a');
      expect(event.defaultPrevented).toBe(false);
    });

    it('does not treat Enter/Space as navigation (left to the consumer)', () => {
      renderList([createItem('a'), createItem('b')]);
      document.getElementById('a')!.focus();

      const enter = pressKey('Enter');
      const space = pressKey('Space');

      expect(activeId()).toBe('a');
      expect(enter.defaultPrevented).toBe(false);
      expect(space.defaultPrevented).toBe(false);
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

  describe('skipped items', () => {
    it('skips items marked with the skip attribute when moving forward', () => {
      renderList([
        createItem('a'),
        createItem('b', { skip: true }),
        createItem('c'),
      ]);
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('c');
    });

    it('skips items marked with the skip attribute when moving backward', () => {
      renderList([
        createItem('a'),
        createItem('b', { skip: true }),
        createItem('c'),
      ]);
      document.getElementById('c')!.focus();

      pressKey('ArrowUp');

      expect(activeId()).toBe('a');
    });
  });

  describe('disabled items', () => {
    it('excludes disabled items from navigation', () => {
      renderList([
        createItem('a'),
        createItem('b', { disabled: true }),
        createItem('c'),
      ]);
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('c');
    });
  });

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
      renderList(
        Array.from({ length: 12 }, (_, i) => createItem(`i${i}`)),
      );
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
      renderList(
        Array.from({ length: 9 }, (_, i) => createItem(`i${i}`)),
        {
          containerAttrs: {
            [KEYROVE_ATTR_COLS_LENGTH]: '3',
            [KEYROVE_ATTR_PAGE_LENGTH]: '2',
          },
        },
      );
      document.getElementById('i1')!.focus();

      pressKey('PageDown');

      expect(activeId()).toBe('i7');
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

  describe('callbacks', () => {
    it('invokes the next and prev callbacks with the newly focused element', () => {
      const next = vi.fn();
      const prev = vi.fn();
      renderList([createItem('a'), createItem('b')], {
        options: { callbacks: { next, prev } },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');
      expect(next).toHaveBeenCalledWith({
        focused: document.getElementById('b'),
      });

      pressKey('ArrowUp');
      expect(prev).toHaveBeenCalledWith({
        focused: document.getElementById('a'),
      });
    });

    it('invokes the home and end callbacks with the focused element', () => {
      const home = vi.fn();
      const end = vi.fn();
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        options: { callbacks: { home, end } },
      });
      document.getElementById('b')!.focus();

      pressKey('End');
      expect(end).toHaveBeenCalledWith({
        focused: document.getElementById('c'),
      });

      pressKey('Home');
      expect(home).toHaveBeenCalledWith({
        focused: document.getElementById('a'),
      });
    });
  });

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
  });

  describe('grid navigation (columns)', () => {
    // A 3-column grid laid out in DOM order:
    //   0 1 2
    //   3 4 5
    //   6 7 8
    const renderGrid = (
      count: number,
      columns: number,
      options?: RenderOptions['options'],
    ) => {
      const items = Array.from({ length: count }, (_, i) => createItem(`${i}`));

      return renderList(items, {
        containerAttrs: { [KEYROVE_ATTR_COLS_LENGTH]: String(columns) },
        options,
      });
    };

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

    it('fires next/prev callbacks with the grid target', () => {
      const next = vi.fn();
      const prev = vi.fn();
      renderGrid(9, 3, { callbacks: { next, prev } });
      document.getElementById('4')!.focus();

      pressKey('ArrowDown');
      expect(next).toHaveBeenCalledWith({
        focused: document.getElementById('7'),
      });

      document.getElementById('4')!.focus();
      pressKey('ArrowUp');
      expect(prev).toHaveBeenCalledWith({
        focused: document.getElementById('1'),
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

    it('falls back to linear navigation when columns is 1', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        containerAttrs: { [KEYROVE_ATTR_COLS_LENGTH]: '1' },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });
  });

  describe('nested containers', () => {
    it('scopes navigation to the nearest marked container', () => {
      const inner = document.createElement('div');
      inner.setAttribute(KEYROVE_ATTR_ROOT, 'true');
      inner.append(createItem('a'), createItem('b'));

      const outer = document.createElement('div');
      outer.append(inner, createItem('outside'));
      document.body.appendChild(outer);
      outer.addEventListener('keydown', (e) => keyRove(e));

      document.getElementById('a')!.focus();
      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });
  });
});
