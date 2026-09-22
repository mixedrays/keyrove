import { describe, expect, it, afterEach } from 'vitest';
import {
  keyRove,
  rove,
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_PAGE_LENGTH,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_SKIP,
} from '../../index';
import type { Move, MoveResult, Options, StrideAction } from '../../index';

afterEach(() => {
  document.body.innerHTML = '';
});

type Spec = {
  tabindex?: string;
  roving?: boolean;
  skip?: boolean;
  disabled?: boolean;
};

/** An item: a roving one at `tabindex="-1"`, unless the spec says otherwise. */
const item = (
  id: string,
  { tabindex = '-1', roving = true, skip, disabled }: Spec = {},
) => {
  const el = document.createElement('button');
  el.id = id;
  el.setAttribute(KEYROVE_ATTR_ITEM, 'true');
  el.setAttribute('tabindex', tabindex);
  if (roving) el.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'true');
  if (skip) el.setAttribute(KEYROVE_ATTR_SKIP, 'true');
  if (disabled) el.setAttribute('disabled', '');

  return el;
};

const group = (children: Element[], attrs: Record<string, string> = {}) => {
  const root = document.createElement('div');
  for (const [name, value] of Object.entries(attrs)) {
    root.setAttribute(name, value);
  }
  root.append(...children);
  document.body.appendChild(root);

  return root;
};

const nestedRoot = (...children: Element[]) => {
  const root = document.createElement('div');
  root.setAttribute(KEYROVE_ATTR_ROOT, '');
  root.append(...children);

  return root;
};

/** A button outside every group, standing for the one that asks for a move. */
const outsideButton = () => {
  const button = document.createElement('button');
  button.id = 'outside';
  document.body.appendChild(button);
  button.focus();

  return button;
};

const byId = (id: string) => document.getElementById(id)!;

const activeId = () => document.activeElement?.id;

/** Every item's `tabindex`, by id. */
const tabindexes = (root: Element) =>
  Object.fromEntries(
    Array.from(root.querySelectorAll(`[${KEYROVE_ATTR_ITEM}]`)).map((el) => [
      el.id,
      el.getAttribute('tabindex'),
    ]),
  );

/** A result with its elements named by id, so it reads in a failure. */
const named = (result: MoveResult | null) =>
  result && {
    action: result.action,
    from: result.from?.id ?? null,
    to: result.to?.id ?? null,
  };

type Key = [code: string, modifiers?: KeyboardEventInit];

/**
 * A group wired to keyRove, with a way to make one move from a given item by
 * its default key or by `rove`, each from the same starting state: focus and
 * the stop on that item. Each run reports the result, where focus went, the
 * stop, and what `onMove` saw.
 */
const twin = (children: Element[], attrs: Record<string, string> = {}) => {
  const root = group(children, attrs);
  const moves: Move[] = [];
  const options: Options = { onMove: (move) => moves.push(move) };
  let keyed: MoveResult | null = null;
  root.addEventListener('keydown', (e) => {
    keyed = keyRove(e, options);
  });

  const run = (start: string, move: () => MoveResult | null) => {
    for (const el of root.querySelectorAll(`[${KEYROVE_ATTR_ITEM}]`)) {
      el.setAttribute('tabindex', el.id === start ? '0' : '-1');
    }
    byId(start).focus();
    moves.length = 0;
    const result = move();

    return {
      result: named(result),
      active: activeId(),
      tabindexes: tabindexes(root),
      moves: moves.map(named),
    };
  };

  return {
    root,
    byKey: (start: string, [code, modifiers]: Key) =>
      run(start, () => {
        keyed = null;
        document.activeElement!.dispatchEvent(
          new KeyboardEvent('keydown', {
            code,
            bubbles: true,
            cancelable: true,
            ...modifiers,
          }),
        );

        return keyed;
      }),
    byRove: (start: string, action: StrideAction) =>
      run(start, () => rove(root, action, options)),
  };
};

const LIST_KEYS: [StrideAction, Key][] = [
  ['next', ['ArrowDown']],
  ['prev', ['ArrowUp']],
  ['home', ['Home']],
  ['end', ['End']],
  ['pageUp', ['PageUp']],
  ['pageDown', ['PageDown']],
];

const GRID_KEYS: [StrideAction, Key][] = [
  ['next', ['ArrowRight']],
  ['prev', ['ArrowLeft']],
  ['nextRow', ['ArrowDown']],
  ['prevRow', ['ArrowUp']],
  ['homeRow', ['Home']],
  ['endRow', ['End']],
  ['home', ['Home', { ctrlKey: true }]],
  ['end', ['End', { ctrlKey: true }]],
  ['pageUp', ['PageUp']],
  ['pageDown', ['PageDown']],
];

describe('rove', () => {
  describe('from a focused item, as its key does', () => {
    it('makes every list move exactly as the key does, from every item', () => {
      const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
      const { byKey, byRove } = twin(
        ids.map((id) => item(id, { skip: id === 'a' || id === 'd' })),
        { [KEYROVE_ATTR_PAGE_LENGTH]: '2' },
      );

      for (const start of ids) {
        for (const [action, key] of LIST_KEYS) {
          expect(byRove(start, action), `${action} from ${start}`).toEqual(
            byKey(start, key),
          );
        }
      }
    });

    it('makes every grid move exactly as the key does, from every cell', () => {
      const ids = Array.from({ length: 9 }, (_, i) => `c${i}`);
      const { byKey, byRove } = twin(
        ids.map((id) => item(id, { skip: id === 'c4' })),
        { [KEYROVE_ATTR_COLS]: '3', [KEYROVE_ATTR_PAGE_LENGTH]: '1' },
      );

      for (const start of ids) {
        for (const [action, key] of GRID_KEYS) {
          expect(byRove(start, action), `${action} from ${start}`).toEqual(
            byKey(start, key),
          );
        }
      }
    });

    it('carries the roving stop and reports the move', () => {
      const root = group([item('a', { tabindex: '0' }), item('b'), item('c')]);
      byId('a').focus();
      const moves: Move[] = [];

      const result = rove(root, 'end', { onMove: (move) => moves.push(move) });

      expect(named(result)).toEqual({ action: 'end', from: 'a', to: 'c' });
      expect(moves.map(named)).toEqual([named(result)]);
      expect(activeId()).toBe('c');
      expect(tabindexes(root)).toEqual({ a: '-1', b: '-1', c: '0' });
    });

    it('reports a move with nowhere to go as to: null, and fires no onMove', () => {
      const root = group([item('a'), item('b', { tabindex: '0' })]);
      byId('b').focus();
      const moves: Move[] = [];

      const result = rove(root, 'next', { onMove: (move) => moves.push(move) });

      expect(named(result)).toEqual({ action: 'next', from: 'b', to: null });
      expect(moves).toEqual([]);
      expect(activeId()).toBe('b');
    });
  });

  describe('keys have no say', () => {
    it('moves next and prev whatever the attribute or keys option binds', () => {
      const root = group([item('a'), item('b', { tabindex: '0' }), item('c')], {
        [KEYROVE_ATTR_NEXT_KEY]: 'KeyJ',
      });
      byId('b').focus();
      const options: Options = { keys: { prev: 'none' } };

      expect(named(rove(root, 'next', options))?.to).toBe('c');
      expect(named(rove(root, 'prev', options))?.to).toBe('b');
    });
  });

  describe('group settings', () => {
    it('reads a group described in options, with no attributes at all', () => {
      const root = group([]);
      root.innerHTML = ['a', 'sep', 'b', 'c']
        .map(
          (id) =>
            `<div id="${id}" role="option" class="${id}" tabindex="${id === 'c' ? 0 : -1}"></div>`,
        )
        .join('');
      byId('c').focus();
      const options: Options = {
        items: '[role="option"]',
        skip: '.sep',
        loop: true,
        rovingTabindex: true,
      };

      expect(named(rove(root, 'next', options))).toEqual({
        action: 'next',
        from: 'c',
        to: 'a',
      });
      expect(named(rove(root, 'next', options))?.to).toBe('b');
      expect(
        Object.fromEntries(
          ['a', 'sep', 'b', 'c'].map((id) => [
            id,
            byId(id).getAttribute('tabindex'),
          ]),
        ),
      ).toEqual({ a: '-1', sep: '-1', b: '0', c: '-1' });
    });

    it('takes cols and pageLength from options', () => {
      const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
      const root = group(ids.map((id) => item(id)));
      byId('a').focus();

      expect(named(rove(root, 'nextRow', { cols: 2 }))?.to).toBe('c');
      expect(named(rove(root, 'pageDown', { pageLength: 3 }))?.to).toBe('f');
    });

    it('does nothing with a row move in a list, where it has no key either', () => {
      const root = group([item('a', { tabindex: '0' }), item('b')]);
      byId('a').focus();

      for (const action of [
        'nextRow',
        'prevRow',
        'homeRow',
        'endRow',
      ] as const) {
        expect(rove(root, action)).toBeNull();
      }
      expect(activeId()).toBe('a');
    });

    it('resolves the root above an element inside it, as a keypress does', () => {
      const inner = nestedRoot(item('a', { tabindex: '0' }), item('b'));
      group([item('o0'), inner, item('o1')]);
      byId('a').focus();

      expect(named(rove(byId('a'), 'end'))).toEqual({
        action: 'end',
        from: 'a',
        to: 'b',
      });
    });
  });

  describe('with no item focused', () => {
    it("starts from a roving group's stop, where the user left off", () => {
      const root = group([
        item('a'),
        item('b', { tabindex: '0' }),
        item('c'),
        item('d'),
      ]);
      outsideButton();

      expect(named(rove(root, 'next'))).toEqual({
        action: 'next',
        from: 'b',
        to: 'c',
      });
      expect(tabindexes(root)).toEqual({ a: '-1', b: '-1', c: '0', d: '-1' });

      // The button takes focus back, and the next press goes on from c.
      outsideButton();
      expect(named(rove(root, 'next'))?.to).toBe('d');
    });

    it.each([
      ['home', 'a'],
      ['next', 'a'],
      ['pageDown', 'a'],
      ['end', 'c'],
      ['prev', 'c'],
      ['pageUp', 'c'],
    ] as const)(
      '%s enters a group with no position at its %s end',
      (action, to) => {
        const root = group(
          [
            item('first', { tabindex: '0', roving: false, skip: true }),
            item('a', { tabindex: '0', roving: false }),
            item('b', { tabindex: '0', roving: false }),
            item('c', { tabindex: '0', roving: false }),
            item('last', { tabindex: '0', roving: false, skip: true }),
          ],
          { [KEYROVE_ATTR_PAGE_LENGTH]: '1' },
        );
        outsideButton();

        expect(named(rove(root, action))).toEqual({ action, from: null, to });
        expect(activeId()).toBe(to);
      },
    );

    it('enters a grid by its row moves, and not by its row ends', () => {
      const root = group(
        ['a', 'b', 'c', 'd'].map((id) => item(id, { roving: false })),
        { [KEYROVE_ATTR_COLS]: '2' },
      );
      outsideButton();

      expect(rove(root, 'homeRow')).toBeNull();
      expect(rove(root, 'endRow')).toBeNull();
      expect(activeId()).toBe('outside');
      expect(named(rove(root, 'prevRow'))?.to).toBe('d');
      outsideButton();
      expect(named(rove(root, 'nextRow'))?.to).toBe('a');
    });

    it('enters rather than starting from a stop on a disabled item', () => {
      const root = group([
        item('a'),
        item('b', { tabindex: '0', disabled: true }),
        item('c'),
      ]);
      outsideButton();

      expect(named(rove(root, 'next'))).toEqual({
        action: 'next',
        from: null,
        to: 'a',
      });
    });

    it("never starts from a nested group's stop", () => {
      const root = group([
        item('o0', { tabindex: '0', roving: false }),
        nestedRoot(item('n0', { tabindex: '0' }), item('n1')),
        item('o1', { tabindex: '0', roving: false }),
      ]);
      outsideButton();

      expect(named(rove(root, 'next'))).toEqual({
        action: 'next',
        from: null,
        to: 'o0',
      });
    });

    it('does nothing in an empty group, or without an element', () => {
      const root = group([]);
      outsideButton();

      expect(rove(root, 'next')).toBeNull();
      expect(rove(root, 'end')).toBeNull();
      expect(rove(null, 'next')).toBeNull();
      expect(rove(undefined, 'home')).toBeNull();
      expect(activeId()).toBe('outside');
    });
  });
});
