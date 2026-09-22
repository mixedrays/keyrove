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
});
