import { afterEach, describe, expect, it, vi } from 'vitest';
import { readGroups } from '../../group';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** Renders markup into the document. */
const render = (html: string) => {
  document.body.innerHTML = html;
};

const byId = (id: string) => document.getElementById(id)!;

/** Every element's `tabindex`, by id, for the ids given. */
const tabindexes = (...names: string[]) =>
  Object.fromEntries(
    names.map((id) => [id, byId(id).getAttribute('tabindex')]),
  );

const ids = (elements: readonly (Element | null | undefined)[]) =>
  elements.map((element) => element?.id ?? null);

/** A shadow root on a fresh host, holding `html`. */
const shadowOf = (html: string) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = html;

  return shadow;
};

describe('readGroups', () => {
  describe('resolving a group', () => {
    it('reads the group of the nearest root at or above the target', () => {
      render(`
        <div id="outer" data-keyrove-root>
          <div id="inner" data-keyrove-root>
            <button id="a" data-keyrove-item></button>
          </div>
        </div>
      `);
      const groups = readGroups({});

      expect(groups.at(byId('a'), document.body)?.root).toBe(byId('inner'));
      expect(groups.at(byId('inner'), document.body)?.root).toBe(byId('inner'));
    });

    it("falls back to the listener's element, the document's for a document or window", () => {
      render(`<ul id="list"><li id="a" data-keyrove-item></li></ul>`);
      const groups = readGroups({});

      expect(groups.at(byId('a'), byId('list'))?.root).toBe(byId('list'));
      expect(groups.at(byId('a'), document)?.root).toBe(
        document.documentElement,
      );
      expect(groups.at(byId('a'), window)?.root).toBe(document.documentElement);
      expect(groups.at(null, null)).toBeNull();
    });

    it('passes over a root whose attribute is false', () => {
      render(`
        <div id="outer" data-keyrove-root>
          <div data-keyrove-root="false">
            <button id="a" data-keyrove-item></button>
          </div>
        </div>
      `);

      expect(readGroups({}).at(byId('a'), null)?.root).toBe(byId('outer'));
    });

    it('finds roots by the root option, in place of the attribute', () => {
      render(`
        <div id="marked" data-keyrove-root>
          <div id="named" class="group">
            <button id="a" data-keyrove-item></button>
          </div>
        </div>
      `);

      expect(readGroups({ root: '.group' }).at(byId('a'), null)?.root).toBe(
        byId('named'),
      );
    });

    it('reads a shadow root it listens on as a root with no attributes', () => {
      const shadow = shadowOf(`
        <button id="a" data-keyrove-item></button>
        <button id="b" data-keyrove-item></button>
      `);
      const group = readGroups({}).at(shadow.getElementById('a'), shadow);

      expect(group?.root).toBe(shadow);
      expect(ids(group!.items)).toEqual(['a', 'b']);
    });

    it("reads the group around a root, within the listener's reach, by the root option", () => {
      render(`
        <div id="listener">
          <div id="outer" class="group">
            <div data-keyrove-root>
              <div id="inner" class="group"></div>
            </div>
          </div>
        </div>
      `);
      const groups = readGroups({ root: '.group' });

      expect(groups.around(byId('inner'), byId('listener'))?.root).toBe(
        byId('outer'),
      );
      expect(groups.around(byId('outer'), byId('listener'))?.root).toBe(
        byId('listener'),
      );
      expect(groups.around(byId('listener'), byId('listener'))).toBeNull();
    });

    it('reads the group nested in an item by the root option', () => {
      render(`
        <div id="item">
          <div data-keyrove-root>
            <div id="inner" class="group"></div>
          </div>
        </div>
      `);
      const groups = readGroups({ root: '.group' });

      expect(groups.inside(byId('item'))?.root).toBe(byId('inner'));
      expect(groups.inside(byId('inner'))).toBeNull();
    });

    it('matches no root selector on a shadow root, and reads its items by selector', () => {
      const shadow = shadowOf(
        `<button id="a"></button><button id="b"></button>`,
      );
      const group = readGroups({ root: '.group', items: 'button' }).at(
        shadow.getElementById('a'),
        shadow,
      );

      expect(group?.root).toBe(shadow);
      expect(ids(group!.items)).toEqual(['a', 'b']);
    });
  });

  describe('items and focus', () => {
    it("keeps skipped items and a nested root's items in the sequence, and leaves disabled ones out", () => {
      render(`
        <div id="root">
          <button id="a" data-keyrove-item></button>
          <button id="b" data-keyrove-item data-keyrove-skip></button>
          <button id="c" data-keyrove-item disabled></button>
          <div data-keyrove-root>
            <button id="d" data-keyrove-item></button>
          </div>
        </div>
      `);

      expect(ids(readGroups({}).of(byId('root')).items)).toEqual([
        'a',
        'b',
        'd',
      ]);
    });

    it('leaves out an element whose item attribute is false', () => {
      render(`
        <div id="root">
          <button id="a" data-keyrove-item></button>
          <button id="b" data-keyrove-item="false"></button>
        </div>
      `);

      expect(ids(readGroups({}).of(byId('root')).items)).toEqual(['a']);
    });

    it('reads the items the items option names, disabled ones aside', () => {
      render(`
        <ul id="root">
          <li id="a" tabindex="-1"></li>
          <li id="b" tabindex="-1" disabled></li>
          <li id="c" tabindex="-1"></li>
        </ul>
      `);

      expect(ids(readGroups({ items: 'li' }).of(byId('root')).items)).toEqual([
        'a',
        'c',
      ]);
      expect(
        ids(
          readGroups({ items: (root) => Array.from(root.children) }).of(
            byId('root'),
          ).items,
        ),
      ).toEqual(['a', 'c']);
    });

    it('counts focus anywhere inside an item, the outermost where items nest', () => {
      render(`
        <div id="root">
          <div id="a" data-keyrove-item>
            <div id="b" data-keyrove-item><input id="field" /></div>
          </div>
        </div>
      `);
      byId('field').focus();

      expect(readGroups({}).of(byId('root')).focused).toBe(byId('a'));
    });

    it('has no focused item with focus outside every item, or on a disabled one', () => {
      render(`
        <div id="root" tabindex="-1">
          <button id="a" data-keyrove-item></button>
          <button id="b" data-keyrove-item disabled tabindex="0"></button>
        </div>
      `);
      const groups = readGroups({});

      byId('root').focus();
      expect(groups.of(byId('root')).focused).toBeNull();

      byId('b').focus();
      expect(groups.of(byId('root')).focused).toBeNull();
    });

    it('finds the item focused inside a shadow root', () => {
      const shadow = shadowOf(`
        <div id="list">
          <button id="a" data-keyrove-item></button>
          <button id="b" data-keyrove-item></button>
        </div>
      `);
      shadow.getElementById('b')!.focus();

      expect(readGroups({}).of(shadow.getElementById('list')!).focused).toBe(
        shadow.getElementById('b'),
      );
      expect(readGroups({}).of(shadow).focused).toBe(
        shadow.getElementById('b'),
      );
    });
  });

  describe('navigable items', () => {
    it('lands on an item neither skipped nor disabled', () => {
      render(`
        <div id="root">
          <button id="a" data-keyrove-item></button>
          <button id="b" data-keyrove-item data-keyrove-skip></button>
          <button id="c" data-keyrove-item data-keyrove-skip="false"></button>
          <button id="d" data-keyrove-item disabled></button>
        </div>
      `);
      const { isNavigable } = readGroups({}).of(byId('root'));

      expect(['a', 'b', 'c', 'd'].map((id) => isNavigable(byId(id)))).toEqual([
        true,
        false,
        true,
        false,
      ]);
    });

    it('passes over what the skip option names, in place of the attribute', () => {
      render(`
        <div id="root">
          <button id="a" data-keyrove-item data-keyrove-skip></button>
          <button id="b" data-keyrove-item class="muted"></button>
        </div>
      `);
      const bySelector = readGroups({ skip: '.muted' }).of(byId('root'));
      const byTest = readGroups({ skip: (item) => item.id === 'b' }).of(
        byId('root'),
      );

      expect(bySelector.isNavigable(byId('a'))).toBe(true);
      expect(bySelector.isNavigable(byId('b'))).toBe(false);
      expect(byTest.isNavigable(byId('b'))).toBe(false);
    });
  });

  describe('own items and the roving stop', () => {
    const nested = `
      <div id="root">
        <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1"></button>
        <button id="b" data-keyrove-item tabindex="0"></button>
        <div id="panel" data-keyrove-root data-keyrove-item data-keyrove-roving-tabindex tabindex="0">
          <button id="c" data-keyrove-item data-keyrove-roving-tabindex tabindex="0"></button>
          <button id="d" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1"></button>
        </div>
        <button id="e" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1" disabled></button>
      </div>
    `;

    it("leaves a nested root's items to it, and counts a root that is an item in the group around it", () => {
      render(nested);
      const groups = readGroups({});

      expect(ids(groups.of(byId('root')).own)).toEqual([
        'a',
        'b',
        'panel',
        'e',
      ]);
      expect(ids(groups.of(byId('panel')).own)).toEqual(['c', 'd']);
    });

    it('tells nested roots apart by the root option, items by the items option', () => {
      render(`
        <div id="root">
          <button id="a" class="item"></button>
          <div id="inner" class="group" data-keyrove-root="false">
            <button id="b" class="item"></button>
          </div>
          <div data-keyrove-root>
            <button id="c" class="item"></button>
          </div>
        </div>
      `);
      const groups = readGroups({ root: '.group', items: '.item' });

      expect(ids(groups.of(byId('root')).own)).toEqual(['a', 'c']);
      expect(ids(groups.of(byId('inner')).own)).toEqual(['b']);
    });

    it('shares the stop across the own items that carry it, disabled ones included', () => {
      render(nested);

      expect(ids(readGroups({}).of(byId('root')).roving)).toEqual([
        'a',
        'panel',
        'e',
      ]);
      expect(
        ids(readGroups({ rovingTabindex: true }).of(byId('root')).roving),
      ).toEqual(['a', 'b', 'panel', 'e']);
      expect(
        readGroups({ rovingTabindex: false }).of(byId('root')).roving,
      ).toEqual([]);
    });

    it("finds each group's own stop, never a nested group's", () => {
      render(nested);
      const groups = readGroups({});

      expect(groups.of(byId('root')).stop).toBe(byId('panel'));
      expect(groups.of(byId('panel')).stop).toBe(byId('c'));
    });

    it('holds the stop on an item that carries it at tabindex 0, disabled ones aside', () => {
      render(`
        <div id="root">
          <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="0" disabled></button>
          <button id="b" data-keyrove-item tabindex="0"></button>
          <button id="c" data-keyrove-item data-keyrove-roving-tabindex tabindex="0"></button>
        </div>
      `);
      const group = readGroups({}).of(byId('root'));

      expect(group.holdsStop(byId('b'))).toBe(false);
      expect(group.holdsStop(byId('c'))).toBe(true);
      expect(group.stop).toBe(byId('c'));
    });

    it('has no stop where no own item holds one', () => {
      render(`
        <div id="root">
          <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1"></button>
          <div data-keyrove-root>
            <button id="b" data-keyrove-item data-keyrove-roving-tabindex tabindex="0"></button>
          </div>
        </div>
      `);

      expect(readGroups({}).of(byId('root')).stop).toBeNull();
    });

    it("places the stop on one roving item, every other at -1, a nested group's alone", () => {
      render(nested);
      const group = readGroups({}).of(byId('root'));

      group.placeStop(byId('a'));

      expect(tabindexes('a', 'b', 'panel', 'c', 'd', 'e')).toEqual({
        a: '0',
        b: '0',
        panel: '-1',
        c: '0',
        d: '-1',
        e: '-1',
      });

      group.placeStop(null);

      expect(tabindexes('a', 'panel', 'e')).toEqual({
        a: '-1',
        panel: '-1',
        e: '-1',
      });
    });

    it('writes nothing to a group whose stop is in place already', () => {
      render(nested);
      const group = readGroups({}).of(byId('root'));
      const observer = new MutationObserver(() => {});
      observer.observe(byId('root'), { attributes: true, subtree: true });

      group.placeStop(byId('panel'));

      expect(observer.takeRecords()).toEqual([]);
      observer.disconnect();
    });
  });

  describe('landing a move', () => {
    const list = `
      <div id="root">
        <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="0"></button>
        <button id="b" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1"></button>
        <button id="c" data-keyrove-item data-keyrove-roving-tabindex></button>
      </div>
    `;

    // Two groups in one order: the outer stop on a, the nested one on c.
    const nested = `
      <div id="root">
        <button id="a" data-keyrove-item data-keyrove-roving-tabindex tabindex="0"></button>
        <div id="inner" data-keyrove-root>
          <button id="b" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1"></button>
          <button id="c" data-keyrove-item data-keyrove-roving-tabindex tabindex="0"></button>
        </div>
        <button id="d" data-keyrove-item data-keyrove-roving-tabindex tabindex="-1"></button>
      </div>
    `;

    it('claims the key, focuses the item, carries the stop and reports the move', () => {
      render(list);
      byId('a').focus();
      const e = { preventDefault: vi.fn() };
      const onMove = vi.fn();
      const move = { action: 'next', from: byId('a'), to: byId('b') };

      const result = readGroups({})
        .of(byId('root'))
        .move({ e, ...move, onMove });

      expect(result).toEqual(move);
      expect(e.preventDefault).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(byId('b'));
      expect(tabindexes('a', 'b')).toEqual({ a: '-1', b: '0' });
      expect(onMove).toHaveBeenCalledWith(move);
    });

    it('is a consumed no-op with nowhere to go, or nowhere new', () => {
      render(list);
      byId('a').focus();
      const e = { preventDefault: vi.fn() };
      const onMove = vi.fn();
      const group = readGroups({}).of(byId('root'));

      expect(
        group.move({ e, action: 'next', from: byId('a'), to: null, onMove }),
      ).toEqual({ action: 'next', from: byId('a'), to: null });
      expect(
        group.move({
          e,
          action: 'home',
          from: byId('a'),
          to: byId('a'),
          onMove,
        }),
      ).toEqual({ action: 'home', from: byId('a'), to: null });
      expect(e.preventDefault).toHaveBeenCalledTimes(2);
      expect(onMove).not.toHaveBeenCalled();
      expect(tabindexes('a', 'b')).toEqual({ a: '0', b: '-1' });
    });

    it('puts every tabindex back, absent included, where the item refuses focus', () => {
      render(list);
      byId('a').focus();
      // Inert or hidden in a browser: focusable by its attributes, and still
      // refusing focus.
      vi.spyOn(byId('c'), 'focus').mockImplementation(() => {});
      const onMove = vi.fn();

      const result = readGroups({})
        .of(byId('root'))
        .move({ action: 'end', from: byId('a'), to: byId('c'), onMove });

      expect(result).toEqual({ action: 'end', from: byId('a'), to: null });
      expect(document.activeElement).toBe(byId('a'));
      expect(tabindexes('a', 'c')).toEqual({ a: '0', c: null });
      expect(onMove).not.toHaveBeenCalled();
    });

    it('carries no stop from an item that does not carry one, or into the group from outside', () => {
      render(list);
      byId('a').focus();

      readGroups({ rovingTabindex: false })
        .of(byId('root'))
        .move({ action: 'next', from: byId('a'), to: byId('b') });

      expect(document.activeElement).toBe(byId('b'));
      expect(tabindexes('a', 'b')).toEqual({ a: '0', b: '-1' });

      readGroups({})
        .of(byId('root'))
        .move({ action: 'end', from: null, to: byId('c') });

      expect(document.activeElement).toBe(byId('c'));
      expect(tabindexes('a', 'b', 'c')).toEqual({ a: '0', b: '-1', c: null });
    });

    it("carries a nested group's own stop into it, and leaves the outer one", () => {
      render(nested);
      byId('a').focus();

      readGroups({})
        .of(byId('root'))
        .move({ action: 'next', from: byId('a'), to: byId('b') });

      expect(document.activeElement).toBe(byId('b'));
      expect(tabindexes('a', 'b', 'c', 'd')).toEqual({
        a: '0',
        b: '0',
        c: '-1',
        d: '-1',
      });
    });

    it("carries the outer group's own stop out of a nested group, and leaves the nested one", () => {
      render(nested);
      byId('c').focus();

      readGroups({})
        .of(byId('root'))
        .move({ action: 'next', from: byId('c'), to: byId('d') });

      expect(document.activeElement).toBe(byId('d'));
      expect(tabindexes('a', 'b', 'c', 'd')).toEqual({
        a: '-1',
        b: '-1',
        c: '0',
        d: '0',
      });
    });

    it('carries the stop within a nested group from the item focus left', () => {
      render(nested);
      byId('c').focus();

      readGroups({})
        .of(byId('root'))
        .move({ action: 'prev', from: byId('c'), to: byId('b') });

      expect(tabindexes('a', 'b', 'c')).toEqual({ a: '0', b: '0', c: '-1' });
    });

    it('lands a move in a shadow root, reading focus off the shadow tree', () => {
      const shadow = shadowOf(list);
      const [a, b] = ['a', 'b'].map((id) => shadow.getElementById(id)!);
      a.focus();
      const onMove = vi.fn();

      readGroups({})
        .of(shadow)
        .move({ action: 'next', from: a, to: b, onMove });

      expect(shadow.activeElement).toBe(b);
      expect([a, b].map((item) => item.getAttribute('tabindex'))).toEqual([
        '-1',
        '0',
      ]);
      expect(onMove).toHaveBeenCalledTimes(1);
    });

    it("carries the group's own stop on a move across a boundary into it, from wherever focus was", () => {
      render(nested);
      const groups = readGroups({});

      // Out of the nested group, to the outer item after it.
      byId('c').focus();
      groups
        .of(byId('root'))
        .cross({ action: 'exit', from: byId('c'), to: byId('d') });

      expect(document.activeElement).toBe(byId('d'));
      expect(tabindexes('a', 'c', 'd')).toEqual({ a: '-1', c: '0', d: '0' });

      // Into it with no item focused: its own stop moves all the same.
      byId('inner').setAttribute('tabindex', '-1');
      byId('inner').focus();
      groups
        .of(byId('inner'))
        .cross({ action: 'enter', from: null, to: byId('b') });

      expect(document.activeElement).toBe(byId('b'));
      expect(tabindexes('b', 'c', 'd')).toEqual({ b: '0', c: '-1', d: '0' });
    });
  });
});
