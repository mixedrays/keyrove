import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  keyRove,
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
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

    it('ignores a focus key on an element that is not an item', () => {
      const container = renderList([createItem('a')]);
      const stray = document.createElement('div');
      stray.id = 'stray';
      stray.setAttribute(KEYROVE_ATTR_FOCUS_KEY, 'KeyX');
      stray.setAttribute('tabindex', '0');
      container.appendChild(stray);
      byId('a').focus();

      const event = pressKey('KeyX');

      expect(activeId()).toBe('a');
      expect(event.defaultPrevented).toBe(false);
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

  describe('focus keys and editable targets', () => {
    it('fires from a text field when the combo holds Ctrl, Alt or Meta', () => {
      renderPanels();
      byId('note').focus();

      const event = pressKey('KeyB', undefined, CHORD);

      expect(activeId()).toBe('right');
      expect(event.defaultPrevented).toBe(true);
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
