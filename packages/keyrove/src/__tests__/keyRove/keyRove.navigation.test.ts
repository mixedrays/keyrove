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
  });
});
