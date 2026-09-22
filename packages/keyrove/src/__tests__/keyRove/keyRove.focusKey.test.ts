import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  keyRove,
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
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

const CHORD = { ctrlKey: true, shiftKey: true };

let detach: (() => void) | undefined;

afterEach(() => {
  detach?.();
  detach = undefined;
  resetTestState();
});

/**
 * The panels of the docs example: two sections that are items of the
 * listener's element. The left one wraps a textarea, the right one a nested
 * list root — the two places a focus key has to reach out of.
 */
const renderPanels = (
  listener: 'panels' | 'document' = 'panels',
  options?: Parameters<typeof keyRove>[1],
) => {
  const results: RoveResult[] = [];

  document.body.innerHTML = `
    <div id="panels">
      <section id="left" ${KEYROVE_ATTR_ITEM} ${KEYROVE_ATTR_FOCUS_KEY}="ctrl+shift+KeyE" tabindex="-1">
        <textarea id="note"></textarea>
      </section>
      <section id="right" ${KEYROVE_ATTR_ITEM} ${KEYROVE_ATTR_FOCUS_KEY}="ctrl+shift+KeyB" tabindex="-1">
        <ul id="mail" ${KEYROVE_ATTR_ROOT}>
          <li id="inbox" ${KEYROVE_ATTR_ITEM} tabindex="0">Inbox</li>
          <li id="drafts" ${KEYROVE_ATTR_ITEM} tabindex="0">Drafts</li>
        </ul>
      </section>
    </div>`;

  const node =
    listener === 'document' ? document : document.getElementById('panels')!;
  const listen = (e: Event) => {
    results.push(keyRove(e as KeyboardEvent, options));
  };
  node.addEventListener('keydown', listen);
  detach = () => node.removeEventListener('keydown', listen);

  return results;
};

/**
 * The same panels reached by their keys alone: each section is a root rather
 * than an item, so no arrow walks from one panel to the other, and an arrow
 * pressed on a panel stays inside it. The list carries a roving tab stop, to
 * show that a jump out of it leaves the stop where it was.
 */
const renderPanelRoots = (options?: Parameters<typeof keyRove>[1]) => {
  const results: RoveResult[] = [];

  document.body.innerHTML = `
    <div id="panels">
      <section id="left" ${KEYROVE_ATTR_ROOT} ${KEYROVE_ATTR_FOCUS_KEY}="ctrl+shift+KeyE" tabindex="-1">
        <textarea id="note"></textarea>
      </section>
      <section id="right" ${KEYROVE_ATTR_ROOT} ${KEYROVE_ATTR_FOCUS_KEY}="ctrl+shift+KeyB" tabindex="-1">
        <ul id="mail">
          <li id="inbox" ${KEYROVE_ATTR_ITEM} ${KEYROVE_ATTR_ROVING_TABINDEX} tabindex="0">Inbox</li>
          <li id="drafts" ${KEYROVE_ATTR_ITEM} ${KEYROVE_ATTR_ROVING_TABINDEX} tabindex="-1">Drafts</li>
        </ul>
      </section>
    </div>`;

  const node = document.getElementById('panels')!;
  const listen = (e: Event) => {
    results.push(keyRove(e as KeyboardEvent, options));
  };
  node.addEventListener('keydown', listen);
  detach = () => node.removeEventListener('keydown', listen);

  return results;
};

const byId = (id: string) => document.getElementById(id)!;

describe('keyRove', () => {
  describe('focus keys', () => {
    it('focuses the item carrying the pressed combo and claims the key', () => {
      renderList([
        createItem('a'),
        createItem('b', { focusKey: 'ctrl+shift+KeyB' }),
        createItem('c'),
      ]);
      byId('a').focus();

      const event = pressKey('KeyB', undefined, CHORD);

      expect(activeId()).toBe('b');
      expect(event.defaultPrevented).toBe(true);
    });

    it('works with a bare code, not only a chord', () => {
      renderList([createItem('a'), createItem('b', { focusKey: 'KeyB' })]);
      byId('a').focus();

      pressKey('KeyB');

      expect(activeId()).toBe('b');
    });

    it('matches the combo exactly, modifiers included', () => {
      renderList([
        createItem('a'),
        createItem('b', { focusKey: 'ctrl+shift+KeyB' }),
      ]);
      byId('a').focus();

      const bare = pressKey('KeyB');
      const partial = pressKey('KeyB', undefined, { ctrlKey: true });
      const extra = pressKey('KeyB', undefined, { ...CHORD, altKey: true });

      expect(activeId()).toBe('a');
      expect(bare.defaultPrevented).toBe(false);
      expect(partial.defaultPrevented).toBe(false);
      expect(extra.defaultPrevented).toBe(false);
    });

    it('returns { action: "focus", from, to } and fires onMove with it', () => {
      const onMove = vi.fn();
      const results: RoveResult[] = [];
      renderList([createItem('a'), createItem('b', { focusKey: 'KeyB' })], {
        options: { onMove },
        onResult: (result) => results.push(result),
      });
      byId('a').focus();

      pressKey('KeyB');

      const move = { action: 'focus', from: byId('a'), to: byId('b') };
      expect(results).toEqual([move]);
      expect(onMove).toHaveBeenCalledWith(move);
    });

    it('enters the group from outside, reporting from as null', () => {
      const results: RoveResult[] = [];
      const container = renderList(
        [createItem('a'), createItem('b', { focusKey: 'KeyB' })],
        { onResult: (result) => results.push(result) },
      );
      container.setAttribute('tabindex', '0');
      container.focus();

      pressKey('KeyB', container);

      expect(activeId()).toBe('b');
      expect(results).toEqual([{ action: 'focus', from: null, to: byId('b') }]);
    });

    it('is a consumed no-op when the item already holds focus', () => {
      const onMove = vi.fn();
      const results: RoveResult[] = [];
      renderList([createItem('a'), createItem('b', { focusKey: 'KeyB' })], {
        options: { onMove },
        onResult: (result) => results.push(result),
      });
      byId('b').focus();

      const event = pressKey('KeyB');

      expect(activeId()).toBe('b');
      expect(event.defaultPrevented).toBe(true);
      expect(results).toEqual([{ action: 'focus', from: byId('b'), to: null }]);
      expect(onMove).not.toHaveBeenCalled();
    });

    it('is a consumed no-op while focus is inside the item', () => {
      const results = renderPanels();
      byId('drafts').focus();

      const event = pressKey('KeyB', undefined, CHORD);

      expect(activeId()).toBe('drafts');
      expect(event.defaultPrevented).toBe(true);
      expect(results).toEqual([
        { action: 'focus', from: byId('right'), to: null },
      ]);
    });
  });

  describe('focus key precedence', () => {
    it('takes a combo a default answers to, and the default stands down', () => {
      renderList([
        createItem('a'),
        createItem('b'),
        createItem('c', { focusKey: 'Home' }),
      ]);
      byId('b').focus();

      pressKey('Home');

      expect(activeId()).toBe('c');
    });

    it('takes a combo an explicit root binding answers to', () => {
      renderList(
        [
          createItem('a'),
          createItem('b'),
          createItem('c', { focusKey: 'KeyJ' }),
        ],
        { containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'KeyJ' } },
      );
      byId('a').focus();

      pressKey('KeyJ');

      expect(activeId()).toBe('c');
    });

    it('gives a shared combo to the first item in DOM order', () => {
      renderList([
        createItem('a'),
        createItem('b', { focusKey: 'KeyX' }),
        createItem('c', { focusKey: 'KeyX' }),
      ]);
      byId('a').focus();

      pressKey('KeyX');
      expect(activeId()).toBe('b');

      pressKey('KeyX');
      expect(activeId()).toBe('b');
    });

    it('leaves the key untouched for a skipped or disabled item', () => {
      renderList([
        createItem('a'),
        createItem('b', { skip: true, focusKey: 'KeyB' }),
        createItem('c', { disabled: true, focusKey: 'KeyC' }),
      ]);
      byId('a').focus();

      const skipped = pressKey('KeyB');
      const disabled = pressKey('KeyC');

      expect(activeId()).toBe('a');
      expect(skipped.defaultPrevented).toBe(false);
      expect(disabled.defaultPrevented).toBe(false);
    });

    it('ignores a bare attribute without a combo', () => {
      const results: RoveResult[] = [];
      renderList([createItem('a'), createItem('b', { focusKey: '' })], {
        onResult: (result) => results.push(result),
      });
      byId('a').focus();

      pressKey('KeyB');

      expect(activeId()).toBe('a');
      expect(results).toEqual([null]);
    });

    it('ignores a blank attribute, even for a keydown with no code', () => {
      const results: RoveResult[] = [];
      renderList([createItem('a'), createItem('b', { focusKey: ' ' })], {
        onResult: (result) => results.push(result),
      });
      byId('a').focus();

      pressKey('');

      expect(activeId()).toBe('a');
      expect(results).toEqual([null]);
    });
  });

  describe('focus key reach', () => {
    it('reaches an item of the outer group from inside a nested root', () => {
      const results = renderPanels();
      byId('inbox').focus();

      pressKey('KeyE', undefined, CHORD);

      expect(activeId()).toBe('left');
      // from is the sibling that contained focus, not the row inside it
      expect(results).toEqual([
        { action: 'focus', from: byId('right'), to: byId('left') },
      ]);
    });

    it('reaches an item in a sibling root under one delegated listener', () => {
      const first = document.createElement('ul');
      first.setAttribute(KEYROVE_ATTR_ROOT, '');
      first.append(createItem('a'), createItem('b'));
      const second = document.createElement('ul');
      second.setAttribute(KEYROVE_ATTR_ROOT, '');
      second.append(createItem('c'), createItem('d', { focusKey: 'KeyD' }));
      const panel = document.createElement('div');
      panel.append(first, second);
      document.body.appendChild(panel);
      panel.addEventListener('keydown', (e) => keyRove(e));
      byId('a').focus();

      pressKey('KeyD');

      expect(activeId()).toBe('d');
    });

    it('works with the listener on the document and no root above the target', () => {
      renderPanels('document');
      byId('left').focus();

      pressKey('KeyB', undefined, CHORD);
      expect(activeId()).toBe('right');

      pressKey('KeyE', undefined, CHORD);
      expect(activeId()).toBe('left');
    });

    it('moves the roving stop within the target group and leaves a nested group alone', () => {
      renderPanels();
      for (const id of ['left', 'right', 'inbox', 'drafts']) {
        byId(id).setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, '');
      }
      byId('left').setAttribute('tabindex', '0');
      byId('drafts').setAttribute('tabindex', '-1');
      byId('drafts').focus();

      pressKey('KeyE', undefined, CHORD);

      expect(activeId()).toBe('left');
      // the panels' stop moved from the panel focus was inside to the target
      expect(byId('right').getAttribute('tabindex')).toBe('-1');
      expect(byId('left').getAttribute('tabindex')).toBe('0');
      // the nested list keeps its own stop where it was
      expect(byId('inbox').getAttribute('tabindex')).toBe('0');
      expect(byId('drafts').getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('focus keys on elements that are not items', () => {
    it('focuses the element from outside any group, reporting from as null', () => {
      const onMove = vi.fn();
      const results = renderPanelRoots({ onMove });
      byId('note').focus();

      const event = pressKey('KeyB', undefined, CHORD);

      const move = { action: 'focus', from: null, to: byId('right') };
      expect(activeId()).toBe('right');
      expect(event.defaultPrevented).toBe(true);
      expect(results).toEqual([move]);
      expect(onMove).toHaveBeenCalledWith(move);
    });

    it('keeps the element out of every arrow order', () => {
      const results = renderPanelRoots();
      byId('left').focus();

      const down = pressKey('ArrowDown');

      // nothing to walk to from a panel with no items of its own
      expect(activeId()).toBe('left');
      expect(down.defaultPrevented).toBe(false);

      byId('right').focus();
      pressKey('ArrowDown');
      pressKey('ArrowDown');
      pressKey('ArrowDown');

      // into the panel's own list, and no further than its end
      expect(activeId()).toBe('drafts');
      expect(results[results.length - 1]).toEqual({
        action: 'next',
        from: byId('drafts'),
        to: null,
      });
    });

    it('is a consumed no-op while focus is inside the element', () => {
      const onMove = vi.fn();
      const results = renderPanelRoots({ onMove });
      byId('inbox').focus();

      const event = pressKey('KeyB', undefined, CHORD);

      expect(activeId()).toBe('inbox');
      expect(event.defaultPrevented).toBe(true);
      expect(results).toEqual([
        { action: 'focus', from: byId('right'), to: null },
      ]);
      expect(onMove).not.toHaveBeenCalled();
    });

    it('leaves the roving stop where it was in the group focus left', () => {
      const results = renderPanelRoots();
      byId('inbox').focus();

      pressKey('KeyE', undefined, CHORD);

      expect(activeId()).toBe('left');
      expect(results).toEqual([
        { action: 'focus', from: null, to: byId('left') },
      ]);
      expect(byId('inbox').getAttribute('tabindex')).toBe('0');
      expect(byId('left').getAttribute('tabindex')).toBe('-1');
    });

    it('leaves the key untouched for a skipped or disabled element', () => {
      renderPanelRoots();
      byId('left').setAttribute(KEYROVE_ATTR_SKIP, '');
      byId('right').setAttribute('disabled', '');
      byId('note').focus();

      const skipped = pressKey('KeyE', undefined, CHORD);
      const disabled = pressKey('KeyB', undefined, CHORD);

      expect(activeId()).toBe('note');
      expect(skipped.defaultPrevented).toBe(false);
      expect(disabled.defaultPrevented).toBe(false);
    });

    it('treats an element whose item attribute is "false" as no item', () => {
      const container = renderList([createItem('a')]);
      const stray = createItem('stray', { roving: true, focusKey: 'KeyX' });
      stray.setAttribute(KEYROVE_ATTR_ITEM, 'false');
      container.appendChild(stray);
      byId('a').setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, '');
      byId('a').focus();

      pressKey('KeyX');

      expect(activeId()).toBe('stray');
      // a move in no group: the stop stays on the item focus left
      expect(byId('a').getAttribute('tabindex')).toBe('0');
    });
  });

  describe('focus keys and editable targets', () => {
    it('fires from a text field when the combo holds Ctrl, Alt or Meta', () => {
      renderPanels();
      byId('note').focus();

      const event = pressKey('KeyB', undefined, CHORD);

      expect(activeId()).toBe('right');
      expect(event.defaultPrevented).toBe(true);
    });

    it('leaves a chorded press alone while an IME composition is in progress', () => {
      renderPanels();
      byId('note').focus();

      const event = pressKey('KeyB', undefined, {
        ...CHORD,
        isComposing: true,
      });

      expect(activeId()).toBe('note');
      expect(event.defaultPrevented).toBe(false);
    });

    it('leaves a bare or Shift-only combo to the field', () => {
      const host = createItem('host');
      const field = document.createElement('textarea');
      field.id = 'field';
      host.appendChild(field);
      renderList([
        host,
        createItem('b', { focusKey: 'KeyB' }),
        createItem('c', { focusKey: 'shift+KeyC' }),
      ]);
      field.focus();

      const bare = pressKey('KeyB');
      const shifted = pressKey('KeyC', undefined, { shiftKey: true });

      expect(activeId()).toBe('field');
      expect(bare.defaultPrevented).toBe(false);
      expect(shifted.defaultPrevented).toBe(false);
    });

    it('keeps a chorded move out of the field — only a focus key reaches out', () => {
      const host = createItem('host');
      const field = document.createElement('textarea');
      field.id = 'field';
      host.appendChild(field);
      renderList([host, createItem('b')], {
        containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'ctrl+KeyJ' },
      });
      field.focus();

      const event = pressKey('KeyJ', undefined, { ctrlKey: true });

      expect(activeId()).toBe('field');
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
