import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  keyRove,
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_SKIP,
} from '../../keyRove';
import {
  activeId,
  createItem,
  pressKey,
  renderList,
  resetTestState,
} from './testUtils';
import type { Options } from '../../index';

afterEach(resetTestState);

/**
 * A group with no keyrove attributes anywhere — the markup someone else's
 * component renders, which options are there to navigate.
 */
const renderMenu = (html: string, options: Options) => {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  container.addEventListener('keydown', (e) => keyRove(e, options));

  return container;
};

const menuItems = (...ids: string[]) =>
  ids
    .map((id) => `<div id="${id}" role="menuitem" tabindex="0">${id}</div>`)
    .join('');

describe('keyRove', () => {
  describe('items named in options', () => {
    it('navigates markup carrying no keyrove attributes', () => {
      renderMenu(menuItems('a', 'b', 'c'), { items: '[role="menuitem"]' });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it('takes a reading of its own in place of a selector', () => {
      renderMenu(menuItems('a', 'b'), {
        items: (root) => Array.from(root.querySelectorAll('[role]')),
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it('leaves disabled items out, as the attribute reading does', () => {
      renderMenu(
        `${menuItems('a')}<div id="b" role="menuitem" tabindex="0" disabled></div>${menuItems('c')}`,
        { items: '[role="menuitem"]' },
      );
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('c');
    });
  });

  describe('settings beside attributes', () => {
    it('loops a group whose items are still read from the markup', () => {
      renderList([createItem('a'), createItem('b')], {
        options: { loop: true },
      });
      document.getElementById('b')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('a');
    });

    it('lets an option win over the attribute for the same move', () => {
      renderList([createItem('a'), createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'KeyJ' },
        options: { keys: { next: 'KeyL' } },
      });
      document.getElementById('a')!.focus();

      pressKey('KeyJ');
      expect(activeId()).toBe('a');

      pressKey('KeyL');
      expect(activeId()).toBe('b');
    });

    it.each([
      ['an empty', ''],
      ['a blank', '  '],
    ])(
      'reads %s option value as unset, deferring to the attribute',
      (_, value) => {
        renderList([createItem('a'), createItem('b')], {
          containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'KeyJ' },
          options: { keys: { next: value } },
        });
        document.getElementById('a')!.focus();

        pressKey('ArrowDown');
        expect(activeId()).toBe('a');

        pressKey('KeyJ');
        expect(activeId()).toBe('b');
      },
    );

    it('leaves the moves an option does not name to their attributes', () => {
      renderList([createItem('a'), createItem('b'), createItem('c')], {
        options: { keys: { next: 'KeyJ' } },
      });
      document.getElementById('a')!.focus();

      // The rebound move frees its default, as an attribute binding does.
      pressKey('ArrowDown');
      expect(activeId()).toBe('a');

      pressKey('KeyJ');
      expect(activeId()).toBe('b');

      // End was named by neither source, so it keeps its own default.
      pressKey('End');
      expect(activeId()).toBe('c');
    });

    it('falls back to the attribute for a column count below one', () => {
      renderList(
        Array.from({ length: 6 }, (_, i) => createItem(`${i}`)),
        { containerAttrs: { [KEYROVE_ATTR_COLS]: '3' }, options: { cols: 0 } },
      );
      document.getElementById('0')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('3');
    });
  });

  describe('layout named in options', () => {
    it('folds the sequence into a grid', () => {
      renderMenu(menuItems('0', '1', '2', '3', '4', '5'), {
        items: '[role="menuitem"]',
        cols: 3,
      });
      document.getElementById('0')!.focus();

      pressKey('ArrowDown');
      expect(activeId()).toBe('3');

      pressKey('ArrowRight');
      expect(activeId()).toBe('4');
    });

    it('takes the horizontal arrows for a list', () => {
      renderMenu(menuItems('a', 'b'), {
        items: '[role="menuitem"]',
        orientation: 'horizontal',
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowRight');

      expect(activeId()).toBe('b');
    });

    it('jumps by the page length it names', () => {
      renderMenu(menuItems('0', '1', '2', '3', '4', '5'), {
        items: '[role="menuitem"]',
        pageLength: 2,
      });
      document.getElementById('0')!.focus();

      pressKey('PageDown');

      expect(activeId()).toBe('2');
    });
  });

  describe('skip named in options', () => {
    it('passes over the items its selector matches', () => {
      renderMenu(
        `${menuItems('a')}<div id="sep" role="menuitem" class="divider" tabindex="0"></div>${menuItems('c')}`,
        { items: '[role="menuitem"]', skip: '.divider' },
      );
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('c');
    });

    it('takes a test of its own in place of a selector', () => {
      renderMenu(menuItems('a', 'b', 'c'), {
        items: '[role="menuitem"]',
        skip: (element) => element.id === 'b',
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('c');
    });
  });

  describe('rovingTabindex named in options', () => {
    it('carries the tab stop without the attribute on any item', () => {
      renderMenu(menuItems('a', 'b'), {
        items: '[role="menuitem"]',
        rovingTabindex: true,
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(document.getElementById('a')!.getAttribute('tabindex')).toBe('-1');
      expect(document.getElementById('b')!.getAttribute('tabindex')).toBe('0');
    });

    it('leaves the tab stop alone when it names false over marked-up items', () => {
      renderList(
        [createItem('a', { roving: true }), createItem('b', { roving: true })],
        {
          options: { rovingTabindex: false },
        },
      );
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
      expect(document.getElementById('a')!.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('focusKeys named in options', () => {
    it('focuses the element a combo names', () => {
      const onMove = vi.fn();
      renderMenu(`${menuItems('a', 'b')}<div id="panel" tabindex="-1"></div>`, {
        items: '[role="menuitem"]',
        focusKeys: { 'ctrl+KeyE': '#panel' },
        onMove,
      });
      document.getElementById('a')!.focus();

      pressKey('KeyE', undefined, { ctrlKey: true });

      expect(activeId()).toBe('panel');
      expect(onMove).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'focus' }),
      );
    });

    it('takes an element in place of a selector', () => {
      const container = document.createElement('div');
      container.innerHTML = `${menuItems('a', 'b')}<div id="panel" tabindex="-1"></div>`;
      document.body.appendChild(container);
      const panel = container.querySelector('#panel')!;
      container.addEventListener('keydown', (e) =>
        keyRove(e, { items: '[role="menuitem"]', focusKeys: { KeyP: panel } }),
      );
      document.getElementById('a')!.focus();

      pressKey('KeyP');

      expect(activeId()).toBe('panel');
    });

    it('replaces the attribute scan rather than adding to it', () => {
      renderList([createItem('a'), createItem('b', { focusKey: 'KeyB' })], {
        options: { focusKeys: { KeyA: '#a' } },
      });
      document.getElementById('a')!.focus();

      const declared = pressKey('KeyB');

      expect(declared.defaultPrevented).toBe(false);
      expect(activeId()).toBe('a');
    });

    it('leaves a key whose selector matches nothing to the table below it', () => {
      renderMenu(menuItems('a', 'b'), {
        items: '[role="menuitem"]',
        focusKeys: { ArrowDown: '#missing' },
      });
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it('passes over a disabled element it names, and goes on searching', () => {
      renderMenu(
        `${menuItems('a', 'b')}<div id="panel" tabindex="-1" disabled></div>`,
        { items: '[role="menuitem"]', focusKeys: { ArrowDown: '#panel' } },
      );
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });

    it('ignores a blank combo', () => {
      renderMenu(`${menuItems('a', 'b')}<div id="panel" tabindex="-1"></div>`, {
        items: '[role="menuitem"]',
        focusKeys: { ' ': '#panel' },
      });
      document.getElementById('a')!.focus();

      const event = pressKey('');

      expect(event.defaultPrevented).toBe(false);
      expect(activeId()).toBe('a');
    });

    it('ignores a selector matching nothing', () => {
      renderMenu(menuItems('a', 'b'), {
        items: '[role="menuitem"]',
        focusKeys: { KeyP: '#missing' },
      });
      document.getElementById('a')!.focus();

      const event = pressKey('KeyP');

      expect(event.defaultPrevented).toBe(false);
      expect(activeId()).toBe('a');
    });
  });

  describe('root named in options', () => {
    it('scopes the group to the nearest element the selector matches', () => {
      renderMenu(
        `<div class="group">${menuItems('a', 'b')}</div>` +
          `<div class="group">${menuItems('c', 'd')}</div>`,
        { root: '.group', items: '[role="menuitem"]' },
      );
      document.getElementById('b')!.focus();

      // The end of its own group, not of the markup the listener covers.
      pressKey('ArrowDown');

      expect(activeId()).toBe('b');
    });
  });

  describe('settings options leave unnamed', () => {
    it('keeps answering from the markup, whoever named the items', () => {
      renderMenu(
        `${menuItems('a')}` +
          `<div id="b" role="menuitem" tabindex="0" ${KEYROVE_ATTR_SKIP}="true"></div>` +
          `${menuItems('c')}`,
        { items: '[role="menuitem"]' },
      );
      document.getElementById('a')!.focus();

      pressKey('ArrowDown');

      expect(activeId()).toBe('c');
    });
  });
});
