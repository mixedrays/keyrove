import { describe, it, expect, afterEach, vi } from 'vitest';
import { createTypeahead } from '../createTypeahead';
import {
  keyRove,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_SKIP,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_TYPEAHEAD,
} from '../keyRove';

type ItemSpec = {
  skip?: boolean;
  disabled?: boolean;
  roving?: boolean;
  tabindex?: string;
  typeahead?: string;
};

const createItem = (id: string, label: string, spec: ItemSpec = {}) => {
  const el = document.createElement('div');
  el.id = id;
  el.textContent = label;
  el.setAttribute(KEYROVE_ATTR_ITEM, 'true');
  el.setAttribute('tabindex', spec.tabindex ?? '0');

  if (spec.skip) el.setAttribute(KEYROVE_ATTR_SKIP, 'true');
  if (spec.disabled) el.setAttribute('disabled', 'true');
  if (spec.roving) el.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, 'true');
  if (spec.typeahead !== undefined) {
    el.setAttribute(KEYROVE_ATTR_TYPEAHEAD, spec.typeahead);
  }

  return el;
};

type RenderOptions = {
  containerAttrs?: Record<string, string>;
  options?: Parameters<typeof createTypeahead>[0];
  /** Chains keyRove in front, as consumers are told to: keyRove(e) || typeahead(e). */
  chainKeyRove?: boolean;
};

/** Builds a list container wired to a fresh typeahead handler. */
const renderList = (
  items: HTMLElement[],
  { containerAttrs = {}, options, chainKeyRove }: RenderOptions = {},
) => {
  const typeahead = createTypeahead(options);
  const results: Array<
    ReturnType<typeof typeahead> | ReturnType<typeof keyRove>
  > = [];
  const container = document.createElement('div');

  Object.entries(containerAttrs).forEach(([key, value]) =>
    container.setAttribute(key, value),
  );
  items.forEach((item) => container.appendChild(item));

  document.body.appendChild(container);
  container.addEventListener('keydown', (e) => {
    results.push(chainKeyRove ? keyRove(e) || typeahead(e) : typeahead(e));
  });

  return { container, results };
};

/** Dispatches a keydown carrying a `key` (and optionally a `code`) from a focused element. */
const pressKey = (
  key: string,
  {
    code = '',
    from = document.activeElement as Element,
    ...modifiers
  }: Pick<KeyboardEventInit, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'> & {
    code?: string;
    from?: Element;
  } = {},
) => {
  const event = new KeyboardEvent('keydown', {
    key,
    code,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  from.dispatchEvent(event);

  return event;
};

const activeId = () => document.activeElement?.id;

const mailbox = () => [
  createItem('a', 'Drafts'),
  createItem('b', 'Dashboard'),
  createItem('c', 'Sent'),
];

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('createTypeahead', () => {
  describe('matching', () => {
    it('focuses the first item whose label starts with the typed character', () => {
      renderList(mailbox());
      document.getElementById('c')!.focus();

      pressKey('d');

      expect(activeId()).toBe('a');
    });

    it('matches case-insensitively in both directions', () => {
      const now = vi.spyOn(Date, 'now');
      renderList([createItem('a', 'drafts'), createItem('b', 'Sent')]);
      document.getElementById('b')!.focus();

      now.mockReturnValue(1000);
      pressKey('D', { shiftKey: true });
      expect(activeId()).toBe('a');

      now.mockReturnValue(2000);
      pressKey('s');
      expect(activeId()).toBe('b');
    });

    it('calls preventDefault when it consumes the character', () => {
      renderList(mailbox());
      document.getElementById('c')!.focus();

      const event = pressKey('d');

      expect(event.defaultPrevented).toBe(true);
    });

    it('buffers successive characters to refine the match', () => {
      const now = vi.spyOn(Date, 'now');
      renderList(mailbox());
      document.getElementById('c')!.focus();

      now.mockReturnValue(1000);
      pressKey('d');
      expect(activeId()).toBe('a');

      now.mockReturnValue(1200);
      pressKey('a');
      expect(activeId()).toBe('b');
    });

    it('returns null and leaves the key alone when nothing matches', () => {
      const { results } = renderList(mailbox());
      document.getElementById('a')!.focus();

      const event = pressKey('x');

      expect(activeId()).toBe('a');
      expect(event.defaultPrevented).toBe(false);
      expect(results).toEqual([null]);
    });

    it('is a consumed no-op when the match is already focused', () => {
      const { results } = renderList(mailbox());
      const drafts = document.getElementById('a')!;
      drafts.focus();

      const event = pressKey('d');

      expect(activeId()).toBe('a');
      expect(event.defaultPrevented).toBe(true);
      expect(results).toEqual([
        { action: 'typeahead', from: drafts, to: null },
      ]);
    });

    it('reports from as null when the group is entered from outside', () => {
      const { container, results } = renderList(mailbox());
      container.setAttribute('tabindex', '0');
      container.focus();

      pressKey('s', { from: container });

      expect(activeId()).toBe('c');
      expect(results).toEqual([
        { action: 'typeahead', from: null, to: document.getElementById('c') },
      ]);
    });
  });

  describe('buffer reset', () => {
    it('resets the buffer after the default 500 ms of silence', () => {
      const now = vi.spyOn(Date, 'now');
      renderList(mailbox());
      document.getElementById('b')!.focus();

      now.mockReturnValue(1000);
      pressKey('d');
      expect(activeId()).toBe('a');

      // "ds" matches nothing; a fresh buffer of "s" matches Sent
      now.mockReturnValue(1600);
      pressKey('s');
      expect(activeId()).toBe('c');
    });

    it('respects a custom resetMs', () => {
      const now = vi.spyOn(Date, 'now');
      renderList(mailbox(), { options: { resetMs: 50 } });
      document.getElementById('b')!.focus();

      now.mockReturnValue(1000);
      pressKey('d');

      now.mockReturnValue(1100);
      pressKey('s');

      expect(activeId()).toBe('c');
    });

    it('never lets an expired buffer disguise a leading space', () => {
      const now = vi.spyOn(Date, 'now');
      renderList([createItem('a', 'New York'), createItem('b', 'Sent')]);
      document.getElementById('b')!.focus();

      now.mockReturnValue(1000);
      pressKey('n');
      expect(activeId()).toBe('a');

      // the buffer has expired, so this space is leading again — untouched,
      // and it must not seed the next buffer
      now.mockReturnValue(2000);
      const space = pressKey(' ', { code: 'Space' });
      expect(space.defaultPrevented).toBe(false);

      now.mockReturnValue(2100);
      pressKey('s');
      expect(activeId()).toBe('b');
    });

    it('starts a fresh buffer when typing moves to another group', () => {
      const now = vi.spyOn(Date, 'now');
      const typeahead = createTypeahead();
      const groupA = document.createElement('div');
      groupA.setAttribute(KEYROVE_ATTR_ROOT, 'true');
      groupA.append(createItem('a', 'Apple'));
      const groupB = document.createElement('div');
      groupB.setAttribute(KEYROVE_ATTR_ROOT, 'true');
      groupB.append(createItem('b', 'Drafts'), createItem('c', 'Sent'));
      const page = document.createElement('div');
      page.append(groupA, groupB);
      document.body.appendChild(page);
      page.addEventListener('keydown', (e) => typeahead(e));

      now.mockReturnValue(1000);
      document.getElementById('a')!.focus();
      pressKey('a');

      // well inside resetMs, but a different group: the buffer must not leak
      now.mockReturnValue(1100);
      document.getElementById('b')!.focus();
      pressKey('s');

      expect(activeId()).toBe('c');
    });
  });

  describe('labels', () => {
    it('prefers the typeahead attribute over the text', () => {
      renderList([
        createItem('a', 'Drafts'),
        createItem('b', '#42 — invoice', { typeahead: 'Invoice' }),
      ]);
      document.getElementById('a')!.focus();

      pressKey('i');

      expect(activeId()).toBe('b');
    });

    it('falls back to trimmed text for a bare or empty attribute', () => {
      renderList([
        createItem('a', 'Drafts'),
        createItem('b', '  Sent  ', { typeahead: '' }),
      ]);
      document.getElementById('a')!.focus();

      pressKey('s');

      expect(activeId()).toBe('b');
    });

    it('collapses interior whitespace in the text, as rendering does', () => {
      const now = vi.spyOn(Date, 'now');
      const multiword = createItem('a', '');
      multiword.innerHTML = '<span>New</span>\n  <span>York</span>';
      renderList([multiword, createItem('b', 'Boston')]);
      document.getElementById('b')!.focus();

      for (const key of ['n', 'e', 'w', ' ', 'y']) {
        now.mockReturnValue(1000);
        pressKey(key);
      }

      expect(activeId()).toBe('a');
    });
  });

  describe('keys that never typeahead', () => {
    it('ignores presses with Ctrl, Alt, or Meta held', () => {
      const { results } = renderList(mailbox());
      document.getElementById('c')!.focus();

      pressKey('d', { ctrlKey: true });
      pressKey('d', { altKey: true });
      pressKey('d', { metaKey: true });

      expect(activeId()).toBe('c');
      expect(results).toEqual([null, null, null]);
    });

    it('ignores non-printable keys', () => {
      const { results } = renderList(mailbox());
      document.getElementById('c')!.focus();

      pressKey('ArrowDown', { code: 'ArrowDown' });
      pressKey('Enter', { code: 'Enter' });
      pressKey('F6', { code: 'F6' });

      expect(activeId()).toBe('c');
      expect(results).toEqual([null, null, null]);
    });

    it('leaves typing inside an editable target alone', () => {
      const host = createItem('host', '');
      const input = document.createElement('input');
      host.appendChild(input);
      renderList([createItem('a', 'Drafts'), host]);
      input.focus();

      const event = pressKey('d', { from: input });

      expect(document.activeElement).toBe(input);
      expect(event.defaultPrevented).toBe(false);
    });

    it('never captures a leading space, only one inside a match', () => {
      const now = vi.spyOn(Date, 'now');
      renderList([createItem('a', 'New York'), createItem('b', 'Boston')]);
      document.getElementById('b')!.focus();

      now.mockReturnValue(1000);
      const leading = pressKey(' ', { code: 'Space' });
      expect(leading.defaultPrevented).toBe(false);
      expect(activeId()).toBe('b');

      for (const key of ['n', 'e', 'w', ' ', 'y']) {
        now.mockReturnValue(1000);
        pressKey(key);
      }

      expect(activeId()).toBe('a');
    });
  });

  describe('item filtering', () => {
    it('passes over items carrying the skip attribute', () => {
      renderList([
        createItem('a', 'Drafts', { skip: true }),
        createItem('b', 'Dashboard'),
      ]);
      document.getElementById('b')!.focus();

      pressKey('d');

      expect(activeId()).toBe('b');
    });

    it('excludes disabled items', () => {
      renderList([
        createItem('a', 'Drafts', { disabled: true }),
        createItem('b', 'Dashboard'),
        createItem('c', 'Sent'),
      ]);
      document.getElementById('c')!.focus();

      pressKey('d');

      expect(activeId()).toBe('b');
    });
  });

  describe('roving tabindex', () => {
    it('moves the tab stop with the match', () => {
      const first = createItem('a', 'Drafts', { roving: true, tabindex: '0' });
      const second = createItem('b', 'Sent', { roving: true, tabindex: '-1' });
      renderList([first, second]);
      first.focus();

      pressKey('s');

      expect(activeId()).toBe('b');
      expect(first.getAttribute('tabindex')).toBe('-1');
      expect(second.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('onMove', () => {
    it('fires with the action and both endpoints of the move', () => {
      const onMove = vi.fn();
      renderList(mailbox(), { options: { onMove } });
      document.getElementById('c')!.focus();

      pressKey('d');

      expect(onMove).toHaveBeenCalledWith({
        action: 'typeahead',
        from: document.getElementById('c'),
        to: document.getElementById('a'),
      });
    });

    it('stays silent when the match is already focused or nothing matches', () => {
      const onMove = vi.fn();
      renderList(mailbox(), { options: { onMove } });
      document.getElementById('a')!.focus();

      pressKey('d');
      pressKey('x');

      expect(onMove).not.toHaveBeenCalled();
    });
  });

  describe('chaining with keyRove', () => {
    it('stands down for keys keyRove claims, so bindings never enter the buffer', () => {
      const { results } = renderList(
        [
          createItem('a', 'Apple'),
          createItem('b', 'Banana'),
          createItem('c', 'Notes'),
        ],
        {
          containerAttrs: { [KEYROVE_ATTR_NEXT_KEY]: 'KeyJ' },
          chainKeyRove: true,
        },
      );
      document.getElementById('a')!.focus();

      // physical J is the next-key binding: navigation wins over typing
      pressKey('j', { code: 'KeyJ' });
      expect(activeId()).toBe('b');

      // an unbound letter falls through to typeahead with a clean buffer
      pressKey('n', { code: 'KeyN' });
      expect(activeId()).toBe('c');

      expect(results).toEqual([
        {
          action: 'next',
          from: document.getElementById('a'),
          to: document.getElementById('b'),
        },
        {
          action: 'typeahead',
          from: document.getElementById('b'),
          to: document.getElementById('c'),
        },
      ]);
    });
  });
});
