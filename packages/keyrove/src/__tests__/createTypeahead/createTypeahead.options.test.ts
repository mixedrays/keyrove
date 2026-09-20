import { describe, it, expect, afterEach } from 'vitest';
import { createTypeahead } from '../../createTypeahead';
import { keyRove } from '../../keyRove';
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

    it('leaves disabled items out, as the attribute reading does', () => {
      renderMenu(
        `<div id="first" role="menuitem" tabindex="0" disabled>Drafts</div>` +
          `<div id="second" role="menuitem" tabindex="0">Drafts</div>`,
        { items: '[role="menuitem"]' },
      );
      document.getElementById('second')!.focus();

      pressKey('d');

      expect(activeId()).toBe('second');
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

  describe('skip named in options', () => {
    it('passes over the items its test matches', () => {
      renderMenu(
        `<div id="header" role="menuitem" tabindex="0" class="divider">Drafts</div>` +
          `${menuItems('Drafts')}`,
        { items: '[role="menuitem"]', skip: '.divider' },
      );
      document.getElementById('header')!.focus();

      pressKey('d');

      expect(activeId()).toBe('drafts');
    });
  });

  describe('rovingTabindex named in options', () => {
    it('carries the tab stop to the match', () => {
      renderMenu(menuItems('Drafts', 'Sent'), {
        items: '[role="menuitem"]',
        rovingTabindex: true,
      });
      document.getElementById('drafts')!.focus();

      pressKey('s');

      expect(activeId()).toBe('sent');
      expect(document.getElementById('drafts')!.getAttribute('tabindex')).toBe(
        '-1',
      );
      expect(document.getElementById('sent')!.getAttribute('tabindex')).toBe(
        '0',
      );
    });
  });

  describe('root named in options', () => {
    it('scopes matching to the group the press came from', () => {
      renderMenu(
        `<div class="group">${menuItems('Drafts', 'Sent')}</div>` +
          `<div class="group"><div id="archive" role="menuitem" tabindex="0">Archive</div></div>`,
        { root: '.group', items: '[role="menuitem"]' },
      );
      document.getElementById('drafts')!.focus();

      // 'a' matches only the item in the other group, which is out of reach.
      pressKey('a');

      expect(activeId()).toBe('drafts');
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
