import { describe, expect, it, afterEach } from 'vitest';
import {
  initRovingTabindex,
  keyRove,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_SKIP,
} from '../../index';

afterEach(() => {
  document.body.innerHTML = '';
});

type Spec = { tabindex?: string | null; roving?: boolean };

/** A roving item: `tabindex="-1"` unless the spec says otherwise. */
const item = (id: string, { tabindex = '-1', roving = true }: Spec = {}) => {
  const el = document.createElement('button');
  el.id = id;
  el.setAttribute(KEYROVE_ATTR_ITEM, 'true');
  if (roving) el.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'true');
  if (tabindex !== null) el.setAttribute('tabindex', tabindex);

  return el;
};

const group = (...children: Element[]) => {
  const root = document.createElement('div');
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

/** Every element's `tabindex`, by id, for the ids given. */
const tabindexes = (...ids: string[]) =>
  Object.fromEntries(
    ids.map((id) => [
      id,
      document.getElementById(id)!.getAttribute('tabindex'),
    ]),
  );

describe('initRovingTabindex', () => {
  describe('placing the stop', () => {
    it('does nothing without a root', () => {
      expect(initRovingTabindex(null)).toBeNull();
      expect(initRovingTabindex(undefined)).toBeNull();
    });

    it('gives the first navigable roving item the stop in a fresh group', () => {
      const ignored = item('ignored', { tabindex: '0' });
      ignored.setAttribute(KEYROVE_ATTR_ITEM, 'false');
      const skipped = item('skipped');
      skipped.setAttribute(KEYROVE_ATTR_SKIP, 'true');
      const first = item('first');
      first.setAttribute(KEYROVE_ATTR_SKIP, 'false');
      const later = item('later');
      const disabled = item('disabled', { tabindex: '0' });
      disabled.setAttribute('disabled', '');
      const plain = item('plain', { tabindex: '0', roving: false });
      const root = group(ignored, skipped, first, later, disabled, plain);

      expect(initRovingTabindex(root)).toBe(first);
      expect(
        tabindexes('ignored', 'skipped', 'first', 'later', 'disabled', 'plain'),
      ).toEqual({
        ignored: '0',
        skipped: '-1',
        first: '0',
        later: '-1',
        disabled: '-1',
        plain: '0',
      });
    });

    it('gives every roving item -1 and returns null when none is navigable', () => {
      const skipped = item('skipped', { tabindex: '0' });
      skipped.setAttribute(KEYROVE_ATTR_SKIP, '');
      const disabled = item('disabled');
      disabled.setAttribute('disabled', '');
      const root = group(skipped, disabled);

      expect(initRovingTabindex(root)).toBeNull();
      expect(tabindexes('skipped', 'disabled')).toEqual({
        skipped: '-1',
        disabled: '-1',
      });
    });

    it('gives a rendered item without a tabindex its -1', () => {
      const root = group(
        item('a', { tabindex: null }),
        item('b', { tabindex: null }),
      );

      initRovingTabindex(root);

      expect(tabindexes('a', 'b')).toEqual({ a: '0', b: '-1' });
    });
  });

  describe('repairing rather than resetting', () => {
    it('keeps the stop on an item that still holds it', () => {
      const root = group(
        item('a'),
        item('b'),
        item('c', { tabindex: '0' }),
        item('d'),
      );
      // A re-render appends an item.
      root.append(item('e', { tabindex: null }));

      expect(initRovingTabindex(root)).toBe(document.getElementById('c'));
      expect(tabindexes('a', 'b', 'c', 'd', 'e')).toEqual({
        a: '-1',
        b: '-1',
        c: '0',
        d: '-1',
        e: '-1',
      });
    });

    it('moves the stop to the first navigable item when its holder was removed', () => {
      const root = group(item('a'), item('b'), item('c', { tabindex: '0' }));
      document.getElementById('c')!.remove();

      expect(initRovingTabindex(root)).toBe(document.getElementById('a'));
      expect(tabindexes('a', 'b')).toEqual({ a: '0', b: '-1' });
    });

    it('moves the stop off a holder that is now skipped or disabled', () => {
      const skipped = item('skipped', { tabindex: '0' });
      skipped.setAttribute(KEYROVE_ATTR_SKIP, '');
      const disabled = item('disabled', { tabindex: '0' });
      disabled.setAttribute('disabled', '');
      const root = group(skipped, disabled, item('a'), item('b'));

      expect(initRovingTabindex(root)).toBe(document.getElementById('a'));
      expect(tabindexes('skipped', 'disabled', 'a', 'b')).toEqual({
        skipped: '-1',
        disabled: '-1',
        a: '0',
        b: '-1',
      });
    });

    it('collapses several stops to the first navigable one of them', () => {
      const root = group(
        item('a'),
        item('b', { tabindex: '0' }),
        item('c', { tabindex: '0' }),
      );

      expect(initRovingTabindex(root)).toBe(document.getElementById('b'));
      expect(tabindexes('a', 'b', 'c')).toEqual({ a: '-1', b: '0', c: '-1' });
    });

    it('writes nothing to a group that is already whole', () => {
      const root = group(item('a'), item('b', { tabindex: '0' }), item('c'));
      const observer = new MutationObserver(() => {});
      observer.observe(root, { attributes: true, subtree: true });

      initRovingTabindex(root);

      expect(observer.takeRecords()).toEqual([]);
      observer.disconnect();
    });

    it('keeps the stop keyboard moves carried, across a re-render', () => {
      const root = group(item('a', { tabindex: '0' }), item('b'), item('c'));
      root.addEventListener('keydown', (e) => keyRove(e));
      document.getElementById('a')!.focus();
      const down = () =>
        document.activeElement!.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }),
        );

      down();
      down();
      root.append(item('d', { tabindex: null }));
      initRovingTabindex(root);

      expect(tabindexes('a', 'b', 'c', 'd')).toEqual({
        a: '-1',
        b: '-1',
        c: '0',
        d: '-1',
      });
    });
  });

  describe('choosing the item', () => {
    it('gives the stop to initial over the one the group has', () => {
      const root = group(item('a', { tabindex: '0' }), item('b'), item('c'));
      const c = document.getElementById('c');

      expect(initRovingTabindex(root, { initial: c })).toBe(c);
      expect(tabindexes('a', 'b', 'c')).toEqual({ a: '-1', b: '-1', c: '0' });
    });

    it('gives the stop to initial in a group with none', () => {
      const root = group(
        item('a', { tabindex: null }),
        item('b', { tabindex: null }),
      );
      const b = document.getElementById('b');

      expect(initRovingTabindex(root, { initial: b })).toBe(b);
      expect(tabindexes('a', 'b')).toEqual({ a: '-1', b: '0' });
    });

    it('falls back to keep-or-first when initial is nullish', () => {
      const root = group(item('a'), item('b', { tabindex: '0' }));

      expect(initRovingTabindex(root, { initial: null })).toBe(
        document.getElementById('b'),
      );
      expect(initRovingTabindex(root, { initial: undefined })).toBe(
        document.getElementById('b'),
      );
      expect(tabindexes('a', 'b')).toEqual({ a: '-1', b: '0' });
    });

    it('falls back to keep-or-first when initial is not a navigable roving item', () => {
      const skipped = item('skipped');
      skipped.setAttribute(KEYROVE_ATTR_SKIP, '');
      const disabled = item('disabled');
      disabled.setAttribute('disabled', '');
      const plain = item('plain', { roving: false });
      const inside = document.createElement('span');
      const root = group(
        skipped,
        disabled,
        plain,
        item('a'),
        item('b', { tabindex: '0' }),
        nestedRoot(item('n0', { tabindex: '0' })),
      );
      document.getElementById('a')!.append(inside);
      const outside = item('outside');
      document.body.append(outside);

      for (const initial of [
        skipped,
        disabled,
        plain,
        inside,
        document.getElementById('n0'),
        outside,
      ]) {
        expect(initRovingTabindex(root, { initial })).toBe(
          document.getElementById('b'),
        );
      }
      expect(tabindexes('skipped', 'disabled', 'plain', 'a', 'b')).toEqual({
        skipped: '-1',
        disabled: '-1',
        plain: '-1',
        a: '-1',
        b: '0',
      });
      expect(tabindexes('n0', 'outside')).toEqual({ n0: '0', outside: '-1' });
    });

    it('takes initial beside the settings of a group described in options', () => {
      const root = group();
      root.innerHTML = ['a', 'b', 'c']
        .map(
          (id) =>
            `<div id="${id}" role="option" aria-selected="${id === 'b'}">${id}</div>`,
        )
        .join('');

      const stop = initRovingTabindex(root, {
        items: '[role="option"]',
        rovingTabindex: true,
        initial: root.querySelector('[aria-selected="true"]'),
      });

      expect(stop).toBe(document.getElementById('b'));
      expect(tabindexes('a', 'b', 'c')).toEqual({ a: '-1', b: '0', c: '-1' });
    });
  });

  describe('nested groups', () => {
    it("leaves a nested group's stop alone", () => {
      const root = group(
        nestedRoot(item('n0', { tabindex: '0' }), item('n1')),
        item('o0'),
        item('o1'),
      );

      expect(initRovingTabindex(root)).toBe(document.getElementById('o0'));
      expect(tabindexes('n0', 'n1', 'o0', 'o1')).toEqual({
        n0: '0',
        n1: '-1',
        o0: '0',
        o1: '-1',
      });
    });

    it('manages only the nested group when called on it', () => {
      const inner = nestedRoot(item('n0'), item('n1', { tabindex: '0' }));
      group(
        item('o0', { tabindex: '0' }),
        inner,
        item('o1', { tabindex: '0' }),
      );

      expect(initRovingTabindex(inner)).toBe(document.getElementById('n1'));
      expect(tabindexes('o0', 'o1', 'n0', 'n1')).toEqual({
        o0: '0',
        o1: '0',
        n0: '-1',
        n1: '0',
      });
    });

    it('counts an item that is itself a root in the group around it', () => {
      const panel = nestedRoot(item('n0', { tabindex: '0' }), item('n1'));
      panel.id = 'panel';
      panel.setAttribute(KEYROVE_ATTR_ITEM, '');
      panel.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, '');
      panel.setAttribute('tabindex', '-1');
      const root = group(panel, item('o1', { tabindex: '0' }));

      expect(initRovingTabindex(root)).toBe(document.getElementById('o1'));
      expect(initRovingTabindex(panel)).toBe(document.getElementById('n0'));
      expect(tabindexes('panel', 'o1', 'n0', 'n1')).toEqual({
        panel: '-1',
        o1: '0',
        n0: '0',
        n1: '-1',
      });
    });

    it('recognises nested roots by the root option', () => {
      const inner = document.createElement('div');
      inner.className = 'group';
      inner.append(item('n0', { tabindex: '0' }));
      const root = group(inner, item('o0'));

      initRovingTabindex(root, { root: '.group' });

      expect(tabindexes('n0', 'o0')).toEqual({ n0: '0', o0: '0' });
    });
  });

  describe('a group described in options', () => {
    it('reads the items and roving the options name, with no attributes', () => {
      const root = group();
      root.innerHTML = ['a', 'b', 'c']
        .map((id) => `<div id="${id}" role="menuitem" tabindex="0">${id}</div>`)
        .join('');

      const stop = initRovingTabindex(root, {
        items: '[role="menuitem"]',
        rovingTabindex: true,
      });

      expect(stop).toBe(document.getElementById('a'));
      expect(tabindexes('a', 'b', 'c')).toEqual({ a: '0', b: '-1', c: '-1' });
    });

    it('passes over the items the skip option names', () => {
      const heading = item('heading');
      heading.className = 'heading';
      const root = group(heading, item('a'));

      expect(initRovingTabindex(root, { skip: '.heading' })).toBe(
        document.getElementById('a'),
      );
    });

    it('leaves marked-up items alone under rovingTabindex: false', () => {
      const root = group(
        item('a', { tabindex: '0' }),
        item('b', { tabindex: '0' }),
      );

      expect(initRovingTabindex(root, { rovingTabindex: false })).toBeNull();
      expect(tabindexes('a', 'b')).toEqual({ a: '0', b: '0' });
    });
  });
});
