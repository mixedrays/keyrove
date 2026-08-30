import { describe, it, expect, afterEach } from 'vitest';
import {
  activeId,
  createItem,
  pressKey,
  renderList,
  resetTestState,
} from './testUtils';

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
});
