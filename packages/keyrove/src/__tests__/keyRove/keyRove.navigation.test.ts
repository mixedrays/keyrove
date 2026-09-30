import { describe, it, expect, afterEach } from 'vitest';
import {
  keyRove,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_SKIP,
} from '../../keyRove';
import {
  activeId,
  createItem,
  pressKey,
  renderList,
  resetTestState,
} from './testUtils';
import type { RoveResult } from './testUtils';

afterEach(resetTestState);

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

    it('enters the list from the container when no item has focus', () => {
      const container = renderList([createItem('a'), createItem('b')]);
      container.setAttribute('tabindex', '0');
      container.focus();

      const event = pressKey('ArrowDown', container);

      // unlike Home/End, an arrow is a way *into* a group
      expect(activeId()).toBe('a');
      expect(event.defaultPrevented).toBe(true);
    });

    it('leaves the key unhandled when the group has no items at all', () => {
      const container = renderList([]);
      container.setAttribute('tabindex', '0');
      container.focus();

      const event = pressKey('ArrowDown', container);

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(container);
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

    it('keeps an item navigable when its skip attribute is false', () => {
      const skipped = createItem('b');
      skipped.setAttribute(KEYROVE_ATTR_SKIP, 'false');
      renderList([createItem('a'), skipped, createItem('c')]);
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    describe('when every item is skipped', () => {
      // The same group skipped two ways: by attribute, and by the `skip`
      // option over otherwise plain items.
      const render = (
        via: 'attribute' | 'option',
        containerAttrs: Record<string, string> = {},
      ) => {
        const results: RoveResult[] = [];
        const container = renderList(
          ['a', 'b', 'c'].map((id) =>
            createItem(id, { skip: via === 'attribute' }),
          ),
          {
            containerAttrs,
            options: via === 'option' ? { skip: () => true } : undefined,
            onResult: (r) => results.push(r),
          },
        );

        return { container, results };
      };

      describe.each(['attribute', 'option'] as const)('by %s', (via) => {
        it.each(['ArrowDown', 'ArrowUp'])(
          'leaves %s untouched from outside the group',
          (code) => {
            const { container, results } = render(via);
            container.setAttribute('tabindex', '0');
            container.focus();

            const event = pressKey(code, container);

            expect(document.activeElement).toBe(container);
            expect(event.defaultPrevented).toBe(false);
            expect(results).toEqual([null]);
          },
        );

        it('leaves entry untouched in a looping list too', () => {
          const { container, results } = render(via, {
            'data-keyrove-loop': '',
          });
          container.setAttribute('tabindex', '0');
          container.focus();

          const event = pressKey('ArrowUp', container);

          expect(event.defaultPrevented).toBe(false);
          expect(results).toEqual([null]);
        });

        it.each([
          ['a list', {}],
          ['a looping list', { 'data-keyrove-loop': '' }],
        ])(
          'consumes every move from a focused item in %s without moving',
          (_, containerAttrs) => {
            const { results } = render(via, containerAttrs);
            const b = document.getElementById('b')!;
            b.focus();

            for (const code of [
              'ArrowDown',
              'ArrowUp',
              'Home',
              'End',
              'PageDown',
              'PageUp',
            ]) {
              const event = pressKey(code);

              expect(activeId(), code).toBe('b');
              expect(event.defaultPrevented, code).toBe(true);
            }
            expect(results).toEqual(
              Array.from({ length: 6 }, (_, i) => ({
                action: ['next', 'prev', 'home', 'end', 'pageDown', 'pageUp'][
                  i
                ],
                from: b,
                to: null,
              })),
            );
          },
        );

        it('consumes every move from a focused cell in a grid without moving', () => {
          render(via, { 'data-keyrove-cols': '2' });
          document.getElementById('a')!.focus();

          for (const [code, modifiers] of [
            ['ArrowRight'],
            ['ArrowDown'],
            ['End'],
            ['End', { ctrlKey: true }],
            ['PageDown'],
          ] as const) {
            const event = pressKey(code, undefined, modifiers);

            expect(activeId(), code).toBe('a');
            expect(event.defaultPrevented, code).toBe(true);
          }
        });
      });
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

    it('takes no position from a disabled item, so Home keeps its default', () => {
      renderList([
        createItem('a'),
        createItem('b', { disabled: true }),
        createItem('c'),
      ]);
      document.getElementById('b')!.focus();

      const event = pressKey('Home');

      expect(event.defaultPrevented).toBe(false);
      expect(activeId()).toBe('b');
    });

    it('enters at the first item from a disabled one, reporting no origin', () => {
      const results: RoveResult[] = [];
      renderList(
        [createItem('a'), createItem('b', { disabled: true }), createItem('c')],
        { onResult: (result) => results.push(result) },
      );
      document.getElementById('b')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('a');
      expect(results[results.length - 1]).toMatchObject({
        action: 'next',
        from: null,
      });
    });
  });

  describe('position within an item', () => {
    it('navigates from the item holding focus in a descendant', () => {
      const wrapper = createItem('a');
      const button = document.createElement('button');
      button.id = 'inner';
      wrapper.appendChild(button);
      renderList([wrapper, createItem('b')]);
      button.focus();

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

    it('ignores an inner root whose attribute is false', () => {
      const inner = document.createElement('div');
      inner.setAttribute(KEYROVE_ATTR_ROOT, 'false');
      inner.append(createItem('a'), createItem('b'));

      const outer = document.createElement('div');
      outer.setAttribute(KEYROVE_ATTR_ROOT, 'true');
      outer.append(inner, createItem('c'));
      document.body.appendChild(outer);
      outer.addEventListener('keydown', (e) => keyRove(e));

      document.getElementById('b')!.focus();
      pressKey('ArrowDown');

      expect(activeId()).toBe('c');
    });

    it('ignores items whose item attribute is false', () => {
      const ignored = createItem('b');
      ignored.setAttribute(KEYROVE_ATTR_ITEM, 'false');
      renderList([createItem('a'), ignored, createItem('c')]);
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('c');
    });
  });

  describe('listener placement', () => {
    it.each([
      ['document', () => document],
      ['window', () => window],
    ])(
      'navigates under a listener on the %s, with no root in the tree',
      (_, node) => {
        const list = document.createElement('div');
        list.append(createItem('a'), createItem('b'));
        document.body.appendChild(list);
        const listen = (e: Event) => keyRove(e as KeyboardEvent);
        node().addEventListener('keydown', listen);

        document.getElementById('a')!.focus();
        pressKey('ArrowDown');
        node().removeEventListener('keydown', listen);

        expect(activeId()).toBe('b');
      },
    );

    // A form exposes each named control as a property of its own. jsdom does
    // not, so the property a browser would add is defined by hand.
    const formWithControl = (name: string, ...children: Element[]) => {
      const form = document.createElement('form');
      const control = document.createElement('input');
      control.type = 'hidden';
      control.name = name;
      form.append(control, ...children);
      Object.defineProperty(form, name, { value: control, configurable: true });
      document.body.appendChild(form);
      form.addEventListener('keydown', (e) => keyRove(e));

      return form;
    };

    it.each(['document', 'documentElement', 'nodeType', 'window'])(
      'navigates under a form listener with a control named %s',
      (name) => {
        formWithControl(name, createItem('a'), createItem('b'));
        document.getElementById('a')!.focus();

        pressKey('ArrowDown');

        expect(activeId()).toBe('b');
      },
    );

    it('reaches focus keys anywhere under such a form, past an inner root', () => {
      const inner = document.createElement('div');
      inner.setAttribute(KEYROVE_ATTR_ROOT, '');
      inner.append(createItem('a'), createItem('b'));
      const outside = createItem('outside', { focusKey: 'ctrl+KeyO' });
      formWithControl('document', inner, outside);
      document.getElementById('a')!.focus();

      pressKey('KeyO', undefined, { ctrlKey: true });

      expect(activeId()).toBe('outside');
    });
  });

  describe('inside a shadow root', () => {
    // A list and its listener inside an open shadow root, as a web component
    // wires them. The document sees only the host as focused.
    const renderShadow = (html: string) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<div id="list">${html}</div>`;
      const results: RoveResult[] = [];
      shadow
        .getElementById('list')!
        .addEventListener('keydown', (e) => results.push(keyRove(e)));

      const byId = (id: string) => shadow.getElementById(id)!;
      const press = (code: string) => pressKey(code, shadow.activeElement!);
      const named = () =>
        results.map(
          (result) =>
            result && {
              action: result.action,
              from: result.from?.id ?? null,
              to: result.to?.id ?? null,
            },
        );

      return { shadow, byId, press, named };
    };

    const ITEMS = `
      <button id="a" data-keyrove-item>A</button>
      <button id="b" data-keyrove-item>B</button>
      <button id="c" data-keyrove-item>C</button>
    `;

    it('moves from the focused item, and back', () => {
      const { shadow, byId, press, named } = renderShadow(ITEMS);
      byId('a').focus();

      press('ArrowDown');
      expect(shadow.activeElement?.id).toBe('b');

      press('ArrowDown');
      expect(shadow.activeElement?.id).toBe('c');

      press('ArrowUp');
      expect(shadow.activeElement?.id).toBe('b');
      expect(named()).toEqual([
        { action: 'next', from: 'a', to: 'b' },
        { action: 'next', from: 'b', to: 'c' },
        { action: 'prev', from: 'c', to: 'b' },
      ]);
    });

    it('goes Home and End from the focused item', () => {
      const { shadow, byId, press, named } = renderShadow(ITEMS);
      byId('b').focus();

      press('End');
      expect(shadow.activeElement?.id).toBe('c');

      press('End');
      expect(shadow.activeElement?.id).toBe('c');

      press('Home');
      expect(shadow.activeElement?.id).toBe('a');
      expect(named()).toEqual([
        { action: 'end', from: 'b', to: 'c' },
        { action: 'end', from: 'c', to: null },
        { action: 'home', from: 'c', to: 'a' },
      ]);
    });

    it('navigates from the item holding focus in a descendant', () => {
      const { shadow, byId, press, named } = renderShadow(`
        <div id="a" data-keyrove-item tabindex="-1"><button id="control">A</button></div>
        <button id="b" data-keyrove-item>B</button>
      `);
      byId('control').focus();

      press('ArrowDown');

      expect(shadow.activeElement?.id).toBe('b');
      expect(named()).toEqual([{ action: 'next', from: 'a', to: 'b' }]);
    });

    it('leaves exit alone on a focused root that is an item of the group around it', () => {
      const { byId, press, named } = renderShadow(`
        <div id="panel" data-keyrove-item data-keyrove-root data-keyrove-exit-key="Escape" tabindex="0">
          <button id="p0" data-keyrove-item>p0</button>
        </div>
        <button id="b" data-keyrove-item>B</button>
      `);
      byId('panel').focus();

      expect(press('Escape').defaultPrevented).toBe(false);
      expect(named()).toEqual([null]);
    });
  });

  describe('with the listener on a shadow root', () => {
    // The shadow-DOM counterpart of a `document` listener: a web component
    // listening on its own shadow root, whose top-level children are the
    // items. The root falls back to the shadow root itself, a fragment with
    // no attributes.
    const renderShadow = (
      html: string,
      options?: Parameters<typeof keyRove>[1],
    ) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = html;
      const results: RoveResult[] = [];
      shadow.addEventListener('keydown', (e) =>
        results.push(keyRove(e as KeyboardEvent, options)),
      );

      const byId = (id: string) => shadow.getElementById(id)!;
      const press = (code: string) => pressKey(code, shadow.activeElement!);
      const named = () =>
        results.map(
          (result) =>
            result && {
              action: result.action,
              from: result.from?.id ?? null,
              to: result.to?.id ?? null,
            },
        );

      return { host, shadow, byId, press, named };
    };

    const ITEMS = `
      <button id="a" data-keyrove-item>A</button>
      <button id="b" data-keyrove-item>B</button>
      <button id="c" data-keyrove-item>C</button>
      <button id="d" data-keyrove-item>D</button>
    `;

    it('navigates its top-level items', () => {
      const { shadow, byId, press, named } = renderShadow(ITEMS);
      byId('a').focus();

      expect(press('ArrowDown').defaultPrevented).toBe(true);
      expect(shadow.activeElement?.id).toBe('b');

      press('End');
      press('ArrowDown');
      press('Home');
      expect(shadow.activeElement?.id).toBe('a');
      expect(named()).toEqual([
        { action: 'next', from: 'a', to: 'b' },
        { action: 'end', from: 'b', to: 'd' },
        { action: 'next', from: 'd', to: null },
        { action: 'home', from: 'd', to: 'a' },
      ]);
    });

    it('takes its settings from options, having no attributes', () => {
      const { shadow, byId, press, named } = renderShadow(ITEMS, {
        orientation: 'horizontal',
        loop: true,
        keys: { end: 'KeyG' },
      });
      byId('a').focus();

      press('ArrowLeft');
      expect(shadow.activeElement?.id).toBe('d');

      press('ArrowRight');
      press('KeyG');
      expect(named()).toEqual([
        { action: 'prev', from: 'a', to: 'd' },
        { action: 'next', from: 'd', to: 'a' },
        { action: 'end', from: 'a', to: 'd' },
      ]);
    });

    it('is a grid where options count its columns', () => {
      const { shadow, byId, press } = renderShadow(ITEMS, { cols: 2 });
      byId('a').focus();

      press('ArrowDown');
      expect(shadow.activeElement?.id).toBe('c');

      press('ArrowRight');
      expect(shadow.activeElement?.id).toBe('d');
    });

    it('reads automatic columns and direction off its host', () => {
      const { host, shadow, byId, press } = renderShadow(ITEMS, {
        cols: 'auto',
        orientation: 'horizontal',
      });
      host.setAttribute('dir', 'rtl');
      byId('a').focus();

      // Nothing is laid out in jsdom, so `auto` counts one column: a list.
      press('ArrowLeft');
      expect(shadow.activeElement?.id).toBe('b');

      press('ArrowRight');
      expect(shadow.activeElement?.id).toBe('a');
    });

    it('finds its items by selector, and leaves a root selector unmatched', () => {
      const { shadow, byId, press, named } = renderShadow(
        `
          <button id="a">A</button>
          <button id="b">B</button>
        `,
        { items: 'button', root: '.group' },
      );
      byId('a').focus();

      press('ArrowDown');

      expect(shadow.activeElement?.id).toBe('b');
      expect(named()).toEqual([{ action: 'next', from: 'a', to: 'b' }]);
    });

    it('leaves a marked root inside it to its own attributes', () => {
      const { shadow, byId, press, named } = renderShadow(`
        <div data-keyrove-root data-keyrove-loop>
          <button id="a" data-keyrove-item>A</button>
          <button id="b" data-keyrove-item>B</button>
        </div>
      `);
      byId('b').focus();

      press('ArrowDown');

      expect(shadow.activeElement?.id).toBe('a');
      expect(named()).toEqual([{ action: 'next', from: 'b', to: 'a' }]);
    });

    it('hears a focus key across the shadow tree', () => {
      const { shadow, byId, press, named } = renderShadow(`
        <button id="a" data-keyrove-item>A</button>
        <button id="b" data-keyrove-item data-keyrove-focus-key="alt+KeyB">B</button>
      `);
      byId('a').focus();

      pressKey('KeyB', shadow.activeElement!, { altKey: true });

      expect(shadow.activeElement?.id).toBe('b');
      expect(named()).toEqual([{ action: 'focus', from: 'a', to: 'b' }]);
      expect(press('ArrowUp').defaultPrevented).toBe(true);
    });

    it('is the group a nested root exits to', () => {
      const { shadow, byId, press, named } = renderShadow(`
        <div id="cell" data-keyrove-item tabindex="-1">
          <div data-keyrove-root data-keyrove-exit-key="Escape">
            <button id="inner" data-keyrove-item>inner</button>
          </div>
        </div>
        <button id="b" data-keyrove-item>B</button>
      `);
      byId('inner').focus();

      press('Escape');

      expect(shadow.activeElement?.id).toBe('cell');
      expect(named()).toEqual([{ action: 'exit', from: 'inner', to: 'cell' }]);
    });

    it('carries the roving stop', () => {
      const { byId, press } = renderShadow(
        `
          <button id="a" data-keyrove-item tabindex="0">A</button>
          <button id="b" data-keyrove-item tabindex="-1">B</button>
        `,
        { rovingTabindex: true },
      );
      byId('a').focus();

      press('ArrowDown');

      expect(byId('a').getAttribute('tabindex')).toBe('-1');
      expect(byId('b').getAttribute('tabindex')).toBe('0');
    });

    it('leaves a key alone with focus on no item', () => {
      const { byId, press, named } = renderShadow(`
        <button id="outside">outside</button>
        <button id="a" data-keyrove-item>A</button>
      `);
      byId('outside').focus();

      expect(press('Home').defaultPrevented).toBe(false);
      expect(named()).toEqual([null]);
    });
  });
});
