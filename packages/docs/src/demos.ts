import {
  KEYROVE_ATTR_COLS,
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_SKIP,
  type GroupOptions,
  type MoveResult,
  createTypeahead,
  keyRove,
  matchesCombo,
  toggleTabIndex,
} from '@mixedrays/keyrove';

/**
 * The live half of the demos embedded in the docs.
 *
 * Nothing here builds DOM. Every demo's markup is stamped into the page at
 * build time from the file under `content/_demos` that the source block below
 * it shows (see build/demos.ts), so this only wires the behaviour markup cannot
 * carry: the keydown listener, the log, and the copy button.
 */

/** A keydown handler with keyrove's contract: truthy when it claimed the key. */
type Handler = (e: KeyboardEvent) => unknown;

/**
 * An item's name for the log: its text, with whitespace collapsed the way
 * rendering collapses it, so a row that wraps a control reads as its label
 * rather than as its markup.
 */
const nameOf = (item: Element) =>
  item.textContent?.replace(/\s+/g, ' ').trim() || '—';

/**
 * A demo's log, in whichever shape its page draws it: one line that the next
 * move overwrites, or a history of rows. Both take the same three reports, so
 * nothing that writes to a log has to know which one it is talking to.
 */
type Log = {
  /** A move that happened, in the shape `onMove` hands it over. */
  move: (move: { action: string; to: Element }) => void;
  /** The widget's own doing, which keyrove has no part in: the listbox's pick. */
  pick: (option: Element, key: string) => void;
  /** A finished keydown, with whatever the handler chain answered it with. */
  keydown: (e: KeyboardEvent, claimed: unknown) => void;
};

/** The one line: the last thing that happened, and nothing before it. */
const createLine = (line: HTMLElement): Log => ({
  move: ({ action, to }) => {
    line.textContent = `${action} → ${nameOf(to)}`;
  },

  pick: (option) => {
    line.textContent = `selected → ${nameOf(option)}`;
  },

  // One line has nothing to say about a key that moved nothing: it would wipe
  // the move the reader is still reading.
  keydown: () => {},
});

/**
 * The history log, for the demos build/demos.ts stamps one into.
 *
 * A single line can only report moves, because `onMove` only fires on one.
 * The rows below are keyed off what the whole keydown came back with, so the
 * two answers that are not a move get a line of their own: a key keyrove
 * claimed and could not act on, and a key it never had a binding for.
 */

/** The glyphs the docs write for keys, so a row reads as the page does. */
const KEY_GLYPHS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  ' ': 'Space',
};

/** Held on their own, these are not yet a keypress — and not yet a row. */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

/** How many rows are kept. Older ones have scrolled out of sight anyway. */
const HISTORY_LENGTH = 20;

/** A keypress as a row: what was pressed, and what keyrove made of it. */
type Entry = {
  outcome: 'moved' | 'noop' | 'passed' | 'picked';
  key: string;
  action: string;
  phrase: string;
  target: string;
};

/**
 * The key as the log labels it: the chord, ending in the key's own glyph.
 *
 * `key` rather than `code`, because this is read rather than bound — what the
 * reader pressed is what their layout produced, and the bindings keyrove
 * matches are documented on the pages themselves.
 */
const keyLabel = (e: KeyboardEvent) => {
  const held = [
    e.ctrlKey && 'Ctrl',
    e.altKey && 'Alt',
    e.shiftKey && 'Shift',
    e.metaKey && 'Meta',
  ].filter((part): part is string => Boolean(part));

  const key =
    KEY_GLYPHS[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);

  return [...held, key].join('+');
};

/** Whether a handler in the chain answered with a move rather than an element. */
const isMoveResult = (value: unknown): value is MoveResult =>
  typeof value === 'object' && value !== null && 'action' in value;

/**
 * Wires a demo's history, or answers null for the demos that keep one line.
 *
 * Rows are cloned from the <template> stamped in beside the list rather than
 * written here, so every class a demo wears still lives in one file.
 */
const createHistory = (demo: HTMLElement): Log | null => {
  const list = demo.querySelector<HTMLElement>('[data-log]');
  const template = demo.querySelector<HTMLTemplateElement>(
    'template[data-log-row]',
  );

  if (!list || !template) return null;

  const live = demo.querySelector<HTMLElement>('.demo-log-live');
  const empty = list.querySelector<HTMLElement>('[data-log-empty]');

  // The newest row, so a key held down counts up on the row it already has.
  let last: { signature: string; row: HTMLElement; count: number } | null =
    null;

  const fill = (row: HTMLElement, slot: string, text: string) => {
    const cell = row.querySelector(`[data-${slot}]`);
    if (cell) cell.textContent = text;
  };

  const push = (entry: Entry) => {
    const signature = Object.values(entry).join('|');

    // Auto-repeat, or an arrow leant on at an end: a row each would push
    // everything that led there off the top, so the row counts instead.
    if (last && last.signature === signature) {
      last.count += 1;

      const badge = last.row.querySelector<HTMLElement>('[data-repeat]');
      if (badge) {
        badge.textContent = `×${last.count}`;
        badge.hidden = false;
      }

      return;
    }

    const row = template.content.firstElementChild?.cloneNode(true);
    if (!(row instanceof HTMLElement)) return;

    row.dataset.outcome = entry.outcome;
    fill(row, 'key', entry.key);
    fill(row, 'action', entry.action);
    fill(row, 'phrase', entry.phrase);
    fill(row, 'target', entry.target);

    empty?.remove();
    list.prepend(row);
    list.scrollTop = 0;

    while (list.children.length > HISTORY_LENGTH) {
      list.lastElementChild?.remove();
    }

    last = { signature, row, count: 1 };

    // The list is `aria-hidden`; this is what is actually announced, and it is
    // the line the demos have always announced. A key keyrove passed on is
    // left out: the browser is acting on it as this runs — moving focus, for
    // Tab — and an announcement here would arrive over the top of that one.
    if (live && entry.outcome !== 'passed') {
      const said = entry.action || entry.phrase;
      live.textContent = `${said} → ${entry.target || 'nothing'}`;
    }
  };

  demo.querySelector('[data-clear-log]')?.addEventListener('click', () => {
    list.replaceChildren(...(empty ? [empty] : []));
    last = null;
    if (live) live.textContent = '';
  });

  return {
    // The history is written from what the keydown answered rather than from
    // `onMove`, because the two rows that are not a move — a key claimed with
    // nowhere to go, a key that was never keyrove's — never reach `onMove` at
    // all. Taking the moves from there too would only double them.
    move: () => {},

    /** The widget's own state changing, which no return value describes. */
    pick: (option, key) => {
      push({
        outcome: 'picked',
        key,
        action: '',
        phrase: 'selected',
        target: nameOf(option),
      });
    },

    keydown: (e, claimed) => {
      const key = keyLabel(e);

      // The selection handler answers with the option it picked, and has
      // already reported it. Anything else here would be a second row for one
      // keypress.
      if (claimed instanceof Element) return;

      if (isMoveResult(claimed)) {
        push(
          claimed.to
            ? {
                outcome: 'moved',
                key,
                action: claimed.action,
                phrase: 'moved to',
                target: nameOf(claimed.to),
              }
            : {
                outcome: 'noop',
                key,
                action: claimed.action,
                phrase: 'moved nothing',
                target: '',
              },
        );

        return;
      }

      // `keyRove` returned null, so the browser still has the key — which is
      // the whole reason Tab keeps working here.
      //
      // "not handled" rather than "not bound", because null is two answers at
      // once: no binding for the key, or a binding that stood down because the
      // press landed in a field. The editable-targets demo is all the second
      // kind, and a row there claiming the arrow was unbound would contradict
      // the page it sits on. Telling them apart would mean asking the same
      // question keyrove asks, and `isEditableTarget` is not part of its
      // public surface.
      if (!MODIFIER_KEYS.has(e.key)) {
        push({
          outcome: 'passed',
          key,
          action: '',
          phrase: 'is not handled here -> the browser keeps it',
          target: '',
        });
      }
    },
  };
};

/**
 * Escape, out of a nested group.
 *
 * Navigation stops at the nearest root, so no key pressed inside a nested group
 * reaches the group around it — getting back out is the app's job. This is the
 * smallest version of it: hand focus to the item beside the group.
 */
const wireGroupExit = (surface: HTMLElement) => {
  const groups = surface.querySelectorAll<HTMLElement>(
    `[${KEYROVE_ATTR_ROOT}]`,
  );

  for (const group of groups) {
    group.addEventListener('keydown', (e) => {
      if (!matchesCombo(e, 'Escape')) return;

      const exit = [
        group.nextElementSibling,
        group.previousElementSibling,
      ].find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement &&
          el.hasAttribute(KEYROVE_ATTR_ITEM) &&
          !el.hasAttribute(KEYROVE_ATTR_SKIP),
      );

      exit?.focus();
    });
  }
};

/**
 * Picking, for the listbox demo.
 *
 * Selection is the widget's state rather than keyrove's, so this is the page's
 * own snippet made live: Space or Enter picks the focused option, a click picks
 * and carries the roving tab stop with it, and either is reported to the log
 * beside the moves. Returns the keydown half, to chain after navigation and
 * typeahead.
 */
const wireSelection = (surface: HTMLElement, log: Log): Handler => {
  const OPTION = '[role="option"]';

  const select = (option: Element) => {
    for (const each of surface.querySelectorAll(OPTION)) {
      each.setAttribute('aria-selected', String(each === option));
    }
  };

  surface.addEventListener('click', (e) => {
    const option = (e.target as Element).closest(OPTION);
    if (!option) return;

    const stop = surface.querySelector('[tabindex="0"]');
    toggleTabIndex({ root: stop, isActive: false });
    toggleTabIndex({ root: option, isActive: true });
    select(option);

    // No key to name: the pointer did this one.
    log.pick(option, '');
  });

  return (e) => {
    if (!matchesCombo(e, 'Space') && !matchesCombo(e, 'Enter')) return null;

    const option = (e.target as Element).closest(OPTION);
    if (!option) return null;

    e.preventDefault();
    select(option);
    log.pick(option, keyLabel(e));

    return option;
  };
};

/**
 * What a demo runs beyond navigation, keyed by its name — the file under
 * content/_demos, which build/demos.ts stamps onto the wrapper. Each entry
 * returns the handlers to chain after `keyRove`, in order, so a key one leaves
 * alone falls through to the next exactly as the pages' own `||` chains do.
 * A demo not listed runs navigation alone: typeahead on every list would make
 * letters do something the page they sit on never mentions.
 */
const EXTRAS: Record<
  string,
  (surface: HTMLElement, log: Log, group: GroupOptions) => Handler[]
> = {
  typeahead: (_surface, log) => [createTypeahead({ onMove: log.move })],
  labels: (_surface, log) => [createTypeahead({ onMove: log.move })],
  // The one demo whose group is described in JavaScript hands the same object
  // to both handlers, which is the point the page it sits on makes.
  menu: (_surface, log, group) => [
    createTypeahead({ ...group, onMove: log.move }),
  ],
  listbox: (surface, log) => [
    createTypeahead({ onMove: log.move }),
    wireSelection(surface, log),
  ],
};

/**
 * The settings a demo's group is described with, for the demos that are
 * described in JavaScript rather than in markup, keyed by name as `EXTRAS` is.
 * A demo not listed here is configured by its own attributes, which is what
 * every other page teaches.
 */
const CONFIGS: Record<string, GroupOptions> = {
  menu: { items: '[role="menuitem"]', loop: true, rovingTabindex: true },
};

/**
 * "Copy code" — the source block's own text, rather than a second copy of it
 * held in an attribute, so what lands on the clipboard is what is on screen.
 * Where the markup shares its panel with the script, that is whichever of the
 * two tabs is showing, so it is looked up on the click rather than once.
 */
const wireCopy = (demo: HTMLElement) => {
  const button = demo.querySelector<HTMLButtonElement>('[data-copy-code]');
  if (!button) return;

  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  button.addEventListener('click', async () => {
    const code = Array.from(demo.querySelectorAll('.demo-code pre')).find(
      (pre) => !pre.closest('[hidden]'),
    );
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
    } catch {
      // Clipboard access can be refused outright; the markup is on the page
      // either way, so there is nothing to fall back to.
      return;
    }

    // Both glyphs are already in the button; `data-copied` is what picks
    // between them, so confirming a copy costs no DOM construction.
    button.toggleAttribute('data-copied', true);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => button.removeAttribute('data-copied'), 2000);
  });
};

/**
 * The item a demo opens on: the first one a key would move away from.
 *
 * Items inside a nested root are passed over while the surface has items of
 * its own, so the nested demo opens on the menu rather than inside the
 * reaction row — the inner group answers to keys the page has not introduced
 * yet. Where every item lives in a nested root, as in the responsive grid,
 * the first of those is the first item. A demo with no items at all, like the
 * focus-keys panels, opens on the first element a focus key names.
 */
const firstItem = (surface: HTMLElement, { items: named }: GroupOptions) => {
  // A group described in JavaScript carries no attribute to look for, so the
  // selector its own config names stands in for one.
  const selector =
    typeof named === 'string'
      ? named
      : `[${KEYROVE_ATTR_ITEM}]:not([${KEYROVE_ATTR_SKIP}])`;

  const items = Array.from(
    surface.querySelectorAll<HTMLElement>(`${selector}:not([disabled])`),
  );

  const isNested = (item: HTMLElement) => {
    const root = item.closest(`[${KEYROVE_ATTR_ROOT}]`);

    return root !== null && root !== surface;
  };

  return (
    items.find((item) => !isNested(item)) ??
    items[0] ??
    surface.querySelector<HTMLElement>(`[${KEYROVE_ATTR_FOCUS_KEY}]`)
  );
};

/**
 * Columns decided by CSS.
 *
 * The responsive demo lets a container query choose its column count and
 * publishes it as `--cols` on the grid. keyrove reads `data-keyrove-cols`, so
 * the attribute is brought level with the property right before each keypress
 * — the line the page's own snippet shows — rather than watched for resizes.
 * The grid is a descendant of the surface rather than the surface itself
 * because the query needs a container above the element it lays out.
 */
const syncColumns = (surface: HTMLElement) => {
  const grids = surface.querySelectorAll<HTMLElement>(`[${KEYROVE_ATTR_COLS}]`);

  for (const grid of grids) {
    const cols = getComputedStyle(grid).getPropertyValue('--cols');
    if (cols) grid.setAttribute(KEYROVE_ATTR_COLS, cols);
  }
};

/** Wires every demo on the current page. */
export const mountDemos = () => {
  const demos = Array.from(document.querySelectorAll<HTMLElement>('.demo'));

  demos.forEach((demo, index) => {
    wireCopy(demo);

    const surface = demo.querySelector<HTMLElement>(
      ':scope > .demo-preview > .demo-surface',
    );

    // A demo draws one log or the other, and build/demos.ts decides which.
    const line = demo.querySelector<HTMLElement>('.log');
    const log = createHistory(demo) ?? (line ? createLine(line) : null);
    if (!surface || !log) return;

    // Every demo but one is described in its own markup, which is what the
    // pages teach; `CONFIGS` is the exception, and it is handed to the
    // handlers exactly as that page's snippet hands it to them.
    const group = CONFIGS[demo.dataset.demo ?? ''] ?? {};
    const handlers: Handler[] = [
      (e) => keyRove(e, { ...group, onMove: log.move }),
      ...(EXTRAS[demo.dataset.demo ?? '']?.(surface, log, group) ?? []),
    ];

    // One listener for the demo, nested roots included: the event bubbles here
    // and keyrove resolves the root from its target, not from this element.
    // The first handler to claim the key ends the chain, which is the `||` of
    // the pages' own snippets.
    surface.addEventListener('keydown', (e) => {
      syncColumns(surface);

      // The first handler to claim the key ends the chain, which is the `||`
      // of the pages' own snippets — kept rather than discarded, because what
      // it answered with is what the history has to report.
      let claimed: unknown = null;
      for (const handle of handlers) {
        claimed = handle(e);
        if (claimed) break;
      }

      log.keydown(e, claimed);
    });
    wireGroupExit(surface);

    // The demo a page opens with starts focused, so the keys it documents work
    // on arrival rather than after a Tab or a click. Only the first one: focus
    // is single, and a page's opening demo is the one it is about.
    //
    // The landing page included. Its demo is the reader's first look at the
    // library working, and asking for a click or a Tab first is a poor way to
    // open an argument about keyboards. `preventScroll` keeps arrival at the
    // top of the page, so the list is waiting when the reader gets to it
    // rather than dragging them down to it; the first arrow press will scroll
    // it into view, which is the cost of having it ready.
    if (index === 0) {
      firstItem(surface, group)?.focus({ preventScroll: true });
    }
  });
};
