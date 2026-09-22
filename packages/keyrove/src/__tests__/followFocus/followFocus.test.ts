import { describe, expect, it, afterEach } from 'vitest';
import {
  followFocus,
  keyRove,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_SKIP,
} from '../../index';
import type { RovingTabindexOptions } from '../../index';

afterEach(() => {
  document.body.innerHTML = '';
});

type Spec = { tabindex?: string; roving?: boolean };

/** A roving item: `tabindex="-1"` unless the spec says otherwise. */
const item = (id: string, { tabindex = '-1', roving = true }: Spec = {}) => {
  const el = document.createElement('button');
  el.id = id;
  el.setAttribute(KEYROVE_ATTR_ITEM, 'true');
  if (roving) el.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'true');
  el.setAttribute('tabindex', tabindex);

  return el;
};

const nestedRoot = (...children: Element[]) => {
  const root = document.createElement('div');
  root.setAttribute(KEYROVE_ATTR_ROOT, '');
  root.append(...children);

  return root;
};

/**
 * A group listening for focusin, as a page wires it: one listener on the
 * group's element, nested roots included. Every result is kept.
 */
const listen = (children: Element[], options?: RovingTabindexOptions) => {
  const root = document.createElement('div');
  root.append(...children);
  document.body.appendChild(root);
  const results: (Element | null)[] = [];
  root.addEventListener('focusin', (e) =>
    results.push(followFocus(e, options)),
  );

  return { root, results };
};

const byId = (id: string) => document.getElementById(id)!;

const tabindexes = (...ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, byId(id).getAttribute('tabindex')]));

describe('followFocus', () => {
  it('moves the stop to an item focused without a key: a click, or .focus()', () => {
    const { results } = listen([
      item('a', { tabindex: '0' }),
      item('b'),
      item('c'),
    ]);

    byId('c').focus();

    expect(results).toEqual([byId('c')]);
    expect(tabindexes('a', 'b', 'c')).toEqual({ a: '-1', b: '-1', c: '0' });
  });

  it('moves the stop to the item around a focused control', () => {
    const b = item('b');
    const input = document.createElement('input');
    b.append(input);
    const { results } = listen([item('a', { tabindex: '0' }), b]);

    input.focus();

    expect(results).toEqual([b]);
    expect(tabindexes('a', 'b')).toEqual({ a: '-1', b: '0' });
  });

  it("never touches a nested group's stop from the outer group", () => {
    listen([
      item('o0', { tabindex: '0' }),
      nestedRoot(item('n0', { tabindex: '0' }), item('n1')),
      item('o1'),
    ]);

    byId('o1').focus();

    expect(tabindexes('o0', 'o1', 'n0', 'n1')).toEqual({
      o0: '-1',
      o1: '0',
      n0: '0',
      n1: '-1',
    });
  });

  it("moves only the nested group's stop for focus inside it", () => {
    listen([
      item('o0', { tabindex: '0' }),
      nestedRoot(item('n0', { tabindex: '0' }), item('n1')),
      item('o1'),
    ]);

    byId('n1').focus();

    expect(tabindexes('o0', 'o1', 'n0', 'n1')).toEqual({
      o0: '0',
      o1: '-1',
      n0: '-1',
      n1: '0',
    });
  });

  it('gives the stop to a panel that is a root and an item of the group around it', () => {
    const panel = nestedRoot(item('n0', { tabindex: '0' }), item('n1'));
    panel.id = 'panel';
    panel.setAttribute(KEYROVE_ATTR_ITEM, '');
    panel.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, '');
    panel.setAttribute('tabindex', '-1');
    const { results } = listen([item('o0', { tabindex: '0' }), panel]);

    panel.focus();

    expect(results).toEqual([panel]);
    expect(tabindexes('o0', 'panel', 'n0', 'n1')).toEqual({
      o0: '-1',
      panel: '0',
      n0: '0',
      n1: '-1',
    });
  });

  it("gives the stop to an outer item around a nested root's own control", () => {
    const control = document.createElement('input');
    control.id = 'control';
    const message = item('message');
    message.append(nestedRoot(control, item('n0', { tabindex: '0' })));
    const { results } = listen([item('o0', { tabindex: '0' }), message]);

    control.focus();

    expect(results).toEqual([message]);
    expect(tabindexes('o0', 'message', 'n0')).toEqual({
      o0: '-1',
      message: '0',
      n0: '0',
    });
  });

  it('is a no-op for an item that does not carry the stop', () => {
    const { results } = listen([
      item('a', { tabindex: '0' }),
      item('plain', { tabindex: '0', roving: false }),
    ]);

    byId('plain').focus();

    expect(results).toEqual([null]);
    expect(tabindexes('a', 'plain')).toEqual({ a: '0', plain: '0' });
  });

  it('is a no-op for a skipped item, which never holds the stop', () => {
    const skipped = item('skipped');
    skipped.setAttribute(KEYROVE_ATTR_SKIP, '');
    const { results } = listen([item('a', { tabindex: '0' }), skipped]);

    skipped.focus();

    expect(results).toEqual([null]);
    expect(tabindexes('a', 'skipped')).toEqual({ a: '0', skipped: '-1' });
  });

  it('is a no-op for focus outside every item', () => {
    const outside = document.createElement('button');
    const { results } = listen([item('a', { tabindex: '0' }), outside]);

    outside.focus();

    expect(results).toEqual([null]);
    expect(tabindexes('a')).toEqual({ a: '0' });
  });

  it('reads a group described in options as it reads the attribute form', () => {
    const menu = ['a', 'b', 'c'].map((id) => {
      const el = document.createElement('div');
      el.id = id;
      el.setAttribute('role', 'menuitem');
      el.setAttribute('tabindex', id === 'a' ? '0' : '-1');

      return el;
    });
    const { results } = listen(menu, {
      items: '[role="menuitem"]',
      rovingTabindex: true,
    });

    byId('b').focus();

    expect(results).toEqual([byId('b')]);
    expect(tabindexes('a', 'b', 'c')).toEqual({ a: '-1', b: '0', c: '-1' });
  });

  it('moves the stop to an item focused inside a shadow root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const list = document.createElement('div');
    const items = [item('a', { tabindex: '0' }), item('b'), item('c')];
    list.append(...items);
    shadow.appendChild(list);
    const results: (Element | null)[] = [];
    list.addEventListener('focusin', (e) => results.push(followFocus(e)));

    items[1].focus();

    expect(results).toEqual([items[1]]);
    expect(items.map((each) => each.getAttribute('tabindex'))).toEqual([
      '-1',
      '0',
      '-1',
    ]);
  });

  it('agrees with keyRove, writing nothing after a move it already carried', () => {
    const { root, results } = listen([item('a', { tabindex: '0' }), item('b')]);
    root.addEventListener('keydown', (e) => keyRove(e));
    byId('a').focus();
    const observer = new MutationObserver(() => {});
    observer.observe(root, { attributes: true, subtree: true });

    byId('a').dispatchEvent(
      new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }),
    );

    // keyRove's own toggle, and nothing from followFocus after it.
    expect(observer.takeRecords()).toHaveLength(2);
    expect(results).toEqual([byId('a'), byId('b')]);
    expect(tabindexes('a', 'b')).toEqual({ a: '-1', b: '0' });
    observer.disconnect();
  });
});
