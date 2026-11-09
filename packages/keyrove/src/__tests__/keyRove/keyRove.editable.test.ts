import { describe, it, expect, afterEach, vi } from 'vitest';
import { keyRove } from '../../keyRove';
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
  describe('editable targets', () => {
    const renderWithEditable = (editable: HTMLElement) => {
      const host = createItem('host');
      host.appendChild(editable);

      renderList([createItem('a'), host, createItem('b')]);

      return editable;
    };

    it.each([
      ['input', () => document.createElement('input')],
      ['textarea', () => document.createElement('textarea')],
      ['select', () => document.createElement('select')],
      [
        'contenteditable',
        () => {
          const el = document.createElement('div');
          el.setAttribute('contenteditable', 'true');
          return el;
        },
      ],
    ])('leaves every key alone when focus is in a %s', (_, create) => {
      const editable = renderWithEditable(create());
      editable.focus();

      const down = pressKey('ArrowDown');
      const home = pressKey('Home');

      expect(document.activeElement).toBe(editable);
      expect(down.defaultPrevented).toBe(false);
      expect(home.defaultPrevented).toBe(false);
    });

    it('treats a descendant of a contenteditable region as editable', () => {
      const region = document.createElement('div');
      region.setAttribute('contenteditable', 'true');
      const span = document.createElement('span');
      span.setAttribute('tabindex', '0');
      region.appendChild(span);
      renderWithEditable(region);
      span.focus();

      const event = pressKey('ArrowDown');

      expect(document.activeElement).toBe(span);
      expect(event.defaultPrevented).toBe(false);
    });

    it('still navigates from a contenteditable="false" island', () => {
      const island = document.createElement('div');
      island.setAttribute('contenteditable', 'false');
      island.setAttribute('tabindex', '0');
      renderWithEditable(island);
      island.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it('lets a false island opt out even inside an editable region', () => {
      const region = document.createElement('div');
      region.setAttribute('contenteditable', 'true');
      const island = document.createElement('div');
      island.setAttribute('contenteditable', 'false');
      island.setAttribute('tabindex', '0');
      region.appendChild(island);
      renderWithEditable(region);
      island.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it('treats contenteditable="FALSE" as opted out, case-insensitively', () => {
      const island = document.createElement('div');
      island.setAttribute('contenteditable', 'FALSE');
      island.setAttribute('tabindex', '0');
      renderWithEditable(island);
      island.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it.each([['checkbox'], ['button']])(
      'still navigates from a %s input, where the bound keys are inert',
      (type) => {
        const input = document.createElement('input');
        input.type = type;
        renderWithEditable(input);
        input.focus();

        pressKey('ArrowDown');

        expect(activeId()).toBe('b');
      },
    );

    it.each([['radio'], ['range']])(
      'leaves keys alone on a %s input, where arrows act natively',
      (type) => {
        const input = document.createElement('input');
        input.type = type;
        renderWithEditable(input);
        input.focus();

        const event = pressKey('ArrowDown');

        expect(document.activeElement).toBe(input);
        expect(event.defaultPrevented).toBe(false);
      },
    );

    it('still navigates from a non-editable element inside the same item', () => {
      const button = document.createElement('button');
      button.id = 'btn';
      renderWithEditable(button);
      button.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });
  });

  describe('a field inside a shadow root', () => {
    // A web component's form control: its input sits in the host's open
    // shadow root, so a listener on the list sees the press retargeted to the
    // host, inside item `b`.
    const renderShadowField = (
      html = '<input id="inner">',
      item = createItem('b', { tabindex: '-1' }),
    ) => {
      const host = document.createElement('div');
      host.id = 'host';
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = html;
      item.appendChild(host);
      const results: RoveResult[] = [];
      const list = renderList(
        [createItem('a'), item, createItem('c', { focusKey: 'ctrl+KeyC' })],
        { onResult: (result) => results.push(result) },
      );
      const inner = shadow.getElementById('inner')!;
      const named = () =>
        results.map(
          (result) =>
            result && {
              action: result.action,
              from: result.from?.id ?? null,
              to: result.to?.id ?? null,
            },
        );

      return { shadow, host, inner, list, results, named };
    };

    it.each([['ArrowDown'], ['Home']])(
      'leaves %s to an input in the shadow tree',
      (code) => {
        const { shadow, inner, results } = renderShadowField();
        inner.focus();

        const event = pressKey(code, inner, { composed: true });

        expect(results).toEqual([null]);
        expect(event.defaultPrevented).toBe(false);
        expect(shadow.activeElement).toBe(inner);
      },
    );

    it('fires a chorded focus key from the input, as from a light-DOM field', () => {
      const { inner, named } = renderShadowField();
      inner.focus();

      const event = pressKey('KeyC', inner, { composed: true, ctrlKey: true });

      expect(activeId()).toBe('c');
      expect(event.defaultPrevented).toBe(true);
      expect(named()).toEqual([{ action: 'focus', from: 'b', to: 'c' }]);
    });

    it('navigates from a button in the shadow tree', () => {
      const { inner, named } = renderShadowField(
        '<button id="inner">B</button>',
      );
      inner.focus();

      pressKey('ArrowDown', inner, { composed: true });

      expect(activeId()).toBe('c');
      expect(named()).toEqual([{ action: 'next', from: 'b', to: 'c' }]);
    });

    it('keeps a shadow tree inside a contenteditable region guarded', () => {
      const region = createItem('b', { tabindex: '-1' });
      region.setAttribute('contenteditable', 'true');
      const { inner, results } = renderShadowField(
        '<button id="inner">B</button>',
        region,
      );
      inner.focus();

      const event = pressKey('ArrowDown', inner, { composed: true });

      expect(results).toEqual([null]);
      expect(event.defaultPrevented).toBe(false);
    });

    it("guards a React-style event by its native event's path", () => {
      const { shadow, host, inner, list } = renderShadowField();
      inner.focus();
      const preventDefault = vi.fn();

      const result = keyRove({
        code: 'ArrowDown',
        target: host,
        currentTarget: list,
        preventDefault,
        nativeEvent: { composedPath: () => [inner, shadow, host, list] },
      });

      expect(result).toBeNull();
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('reads the target alone on an event with no composed path', () => {
      const { host, inner, list } = renderShadowField();
      inner.focus();

      const result = keyRove({
        code: 'ArrowDown',
        target: host,
        currentTarget: list,
        preventDefault: () => {},
      });

      expect(result?.to?.id).toBe('c');
    });
  });
});
