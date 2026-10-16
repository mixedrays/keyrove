import { describe, it, expect, afterEach, vi } from 'vitest';
import { createTypeahead } from '../../createTypeahead';
import { keyRove, KEYROVE_ATTR_TYPEAHEAD } from '../../keyRove';
import { activeId, pressKey, resetTestState } from './testUtils';
import type { TypeaheadOptions } from '../../index';

afterEach(resetTestState);

/** A menu with no keyrove attributes anywhere, wired to a typeahead handler. */
const renderMenu = (html: string, options: TypeaheadOptions) => {
  const typeahead = createTypeahead(options);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  container.addEventListener('keydown', typeahead);

  return container;
};

const menuItems = (...labels: string[]) =>
  labels
    .map(
      (label) =>
        `<div id="${label.toLowerCase()}" role="menuitem" tabindex="0">${label}</div>`,
    )
    .join('');

describe('createTypeahead', () => {
  describe('items named in options', () => {
    it('matches within markup carrying no keyrove attributes', () => {
      renderMenu(menuItems('Drafts', 'Sent'), { items: '[role="menuitem"]' });
      document.getElementById('sent')!.focus();

      pressKey('d');

      expect(activeId()).toBe('drafts');
    });
  });

  describe('label named in options', () => {
    it('matches the text it returns rather than the item text', () => {
      renderMenu(menuItems('Drafts', 'Sent'), {
        items: '[role="menuitem"]',
        label: (item) => (item.id === 'sent' ? 'Archive' : 'Zebra'),
      });
      document.getElementById('drafts')!.focus();

      pressKey('a');

      expect(activeId()).toBe('sent');
    });

    it('falls back to the item text where it returns nothing', () => {
      renderMenu(menuItems('Drafts', 'Sent'), {
        items: '[role="menuitem"]',
        label: (item) => (item.id === 'sent' ? 'Archive' : ''),
      });
      document.getElementById('sent')!.focus();

      pressKey('d');

      expect(activeId()).toBe('drafts');
    });
  });

  describe('accents', () => {
    // Items with ids, so labels with accents need not become ids themselves.
    const people = (...labels: string[]) =>
      labels
        .map(
          (label, i) =>
            `<div id="p${i}" role="menuitem" tabindex="0">${label}</div>`,
        )
        .join('');

    const renderPeople = (
      labels: string[],
      options: Omit<TypeaheadOptions, 'items'> = {},
    ) =>
      renderMenu(people(...labels), { items: '[role="menuitem"]', ...options });

    it('reaches an accented label from its bare letter', () => {
      renderPeople(['Anna', 'Émilie', 'Ángel']);
      document.getElementById('p0')!.focus();

      pressKey('e');
      expect(activeId()).toBe('p1');
    });

    it('reaches a bare label from an accented letter, in either case', () => {
      renderPeople(['Anna', 'emilie']);
      document.getElementById('p0')!.focus();

      pressKey('É');

      expect(activeId()).toBe('p1');
    });

    it('folds a whole prefix, not only its first letter', () => {
      const now = vi.spyOn(Date, 'now');
      renderPeople(['Emma', 'Émilie']);
      document.getElementById('p0')!.focus();

      now.mockReturnValue(1000);
      pressKey('e');
      now.mockReturnValue(1100);
      pressKey('m');
      now.mockReturnValue(1200);
      pressKey('í');

      expect(activeId()).toBe('p1');
    });

    it('matches a label written with a combining mark', () => {
      // "E" followed by U+0301, as some sources store it.
      renderPeople(['Anna', 'E\u0301milie']);
      document.getElementById('p0')!.focus();

      pressKey('é');

      expect(activeId()).toBe('p1');
    });

    it('folds what the label option returns', () => {
      renderPeople(['Anna', 'Nobody'], {
        label: (item) => (item.id === 'p1' ? 'Ōsaka' : ''),
      });
      document.getElementById('p0')!.focus();

      pressKey('o');

      expect(activeId()).toBe('p1');
    });

    it('folds the typeahead attribute', () => {
      const container = renderPeople(['Anna', 'Nobody']);
      container
        .querySelector('#p1')!
        .setAttribute(KEYROVE_ATTR_TYPEAHEAD, 'Çelik');
      document.getElementById('p0')!.focus();

      pressKey('c');

      expect(activeId()).toBe('p1');
    });

    it('cycles on an accented letter and its bare form alike', () => {
      const now = vi.spyOn(Date, 'now');
      renderPeople(['Anna', 'Émilie', 'Eva', 'Elodie'], { matchMode: 'cycle' });
      document.getElementById('p0')!.focus();

      now.mockReturnValue(1000);
      pressKey('é');
      expect(activeId()).toBe('p1');

      now.mockReturnValue(1100);
      pressKey('e');
      expect(activeId()).toBe('p2');

      now.mockReturnValue(1200);
      pressKey('é');
      expect(activeId()).toBe('p3');
    });

    it('leaves a letter with no decomposition as it is', () => {
      renderPeople(['Anna', 'Øystein', 'Olga']);
      document.getElementById('p0')!.focus();

      pressKey('o');

      expect(activeId()).toBe('p2');
    });

    it('leaves a lone combining mark to the page', () => {
      renderPeople(['Anna', 'Émilie']);
      document.getElementById('p0')!.focus();

      const mark = pressKey('\u0301');
      expect(mark.defaultPrevented).toBe(false);
      expect(activeId()).toBe('p0');

      // Nothing joined the buffer, so the next letter starts a fresh prefix.
      pressKey('e');
      expect(activeId()).toBe('p1');
    });

    it('keeps accents apart with foldDiacritics: false, still ignoring case', () => {
      const now = vi.spyOn(Date, 'now');
      renderPeople(['Anna', 'Émilie', 'emma'], { foldDiacritics: false });
      document.getElementById('p0')!.focus();

      now.mockReturnValue(1000);
      pressKey('e');
      expect(activeId()).toBe('p2');

      now.mockReturnValue(2000);
      pressKey('é');
      expect(activeId()).toBe('p1');
    });
  });

  describe('one object for both handlers', () => {
    it('configures navigation and typeahead alike', () => {
      const group = {
        items: '[role="menuitem"]',
        loop: true,
        rovingTabindex: true,
      };
      const typeahead = createTypeahead(group);
      const container = document.createElement('div');
      container.innerHTML = menuItems('Drafts', 'Sent');
      document.body.appendChild(container);
      container.addEventListener(
        'keydown',
        (e) => void (keyRove(e, group) || typeahead(e)),
      );
      document.getElementById('sent')!.focus();

      // The group loops, so navigation wraps past the last item …
      pressKey('', { code: 'ArrowDown' });
      expect(activeId()).toBe('drafts');

      // … and typing reaches the same items.
      pressKey('s');
      expect(activeId()).toBe('sent');
      expect(document.getElementById('sent')!.getAttribute('tabindex')).toBe(
        '0',
      );
    });
  });
});
