import {
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_SKIP,
  type GroupOptions,
  type MoveResult,
  createTypeahead,
  followFocus,
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
  /**
   * The widget's own doing, which keyrove has no part in: the listbox's pick,
   * the tree opening a folder or stepping out of one. `phrase` is what
   * happened to `target`, in the words the row reads with.
   */
  widget: (target: Element, key: string, phrase: string) => void;
  /** A finished keydown, with whatever the handler chain answered it with. */
  keydown: (e: KeyboardEvent, claimed: unknown) => void;
};

/** The one line: the last thing that happened, and nothing before it. */
const createLine = (line: HTMLElement): Log => ({
  move: ({ action, to }) => {
    line.textContent = `${action} → ${nameOf(to)}`;
  },

  widget: (target, _key, phrase) => {
    line.textContent = `${phrase} → ${nameOf(target)}`;
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
export const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

/** How many rows are kept. Older ones have scrolled out of sight anyway. */
const HISTORY_LENGTH = 20;

/** A keypress as a row: what was pressed, and what keyrove made of it. */
type Entry = {
  outcome: 'moved' | 'noop' | 'passed' | 'widget';
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
export const keyLabel = (e: KeyboardEvent) => {
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

/** The landing's compact panels report one key at a time, like the hero. */
const createReadout = (surface: HTMLElement, line: HTMLElement): Log => {
  let movement: { action: string; to: Element } | null = null;
  let widget: { target: Element; phrase: string } | null = null;

  const show = (state: string, key: string, message: string) => {
    line.dataset.state = state;
    const label = document.createElement('span');
    label.className = 'hero-readout-target';
    label.textContent = message;
    if (state === 'blurred' || state === 'listening') {
      label.setAttribute('aria-hidden', 'true');
    }
    line.replaceChildren(label);
    if (key) {
      const cap = document.createElement('kbd');
      cap.textContent = key;
      line.prepend(cap);
    }
    line.classList.remove('hero-readout-fresh');
    void line.offsetWidth;
    line.classList.add('hero-readout-fresh');
  };

  surface.addEventListener('focusin', (e) => {
    if (!surface.contains(e.relatedTarget as Node | null)) {
      show('listening', '', 'listening…');
    }
  });
  surface.addEventListener('focusout', (e) => {
    if (!surface.contains(e.relatedTarget as Node | null)) {
      show('blurred', '', 'click to focus');
    }
  });

  return {
    move: (move) => {
      movement = move;
    },
    widget: (target, key, phrase) => {
      widget = { target, phrase };
      if (!key) {
        show('moved', '', `${phrase} → ${nameOf(target)}`);
        widget = null;
      }
    },
    keydown: (e, claimed) => {
      if (!MODIFIER_KEYS.has(e.key)) {
        if (widget) {
          show(
            'moved',
            keyLabel(e),
            `${widget.phrase} → ${nameOf(widget.target)}`,
          );
        } else if (movement) {
          show(
            'moved',
            keyLabel(e),
            `${movement.action} → ${nameOf(movement.to)}`,
          );
        } else if (isMoveResult(claimed)) {
          show('edge', keyLabel(e), `${claimed.action} · moved nothing`);
        } else if (surface.contains(document.activeElement)) {
          show('passed', keyLabel(e), 'left to the browser');
        }
      }
      movement = null;
      widget = null;
    },
  };
};

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

    /** The widget's own doing, which no return value of keyrove's describes. */
    widget: (target, key, phrase) => {
      push({
        outcome: 'widget',
        key,
        action: '',
        phrase,
        target: nameOf(target),
      });
    },

    keydown: (e, claimed) => {
      const key = keyLabel(e);

      // The widget's own handlers — the listbox's pick, the tree's branches —
      // answer with the element they acted on, and have already reported it.
      // Anything else here would be a second row for one keypress.
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
 * Picking, for the listbox demo.
 *
 * Selection is the widget's state rather than keyrove's, so this is the page's
 * own snippet made live: Space or Enter picks the focused option, a click picks
 * it, and either is reported to the log beside the moves. `followFocus` carries
 * the roving tab stop to wherever focus lands, the click included. Returns the
 * keydown half, to chain after navigation and typeahead.
 */
const wireSelection = (surface: HTMLElement, log: Log): Handler => {
  const OPTION = '[role="option"]';

  const select = (option: Element) => {
    for (const each of surface.querySelectorAll(OPTION)) {
      each.setAttribute('aria-selected', String(each === option));
    }
  };

  surface.addEventListener('focusin', (e) => followFocus(e));

  surface.addEventListener('click', (e) => {
    const option = (e.target as Element).closest(OPTION);
    if (!option) return;

    select(option);

    // No key to name: the pointer did this one.
    log.widget(option, '', 'selected');
  });

  return (e) => {
    if (!matchesCombo(e, 'Space, Enter')) return null;

    const option = (e.target as Element).closest(OPTION);
    if (!option) return null;

    e.preventDefault();
    select(option);
    log.widget(option, keyLabel(e), 'selected');

    return option;
  };
};

/**
 * Folding, for the sidebar demo: the tree described in attributes, made live
 * as its page's snippet. → opens a folder and ← closes it, and a click flips
 * one — which is Enter and Space too, since a folder is a button and the
 * browser turns either key into a click. Every row's skip attribute is then
 * brought level with whether a closed folder hides it. Returns the keydown
 * half, to chain after navigation.
 */
const wireFolds = (surface: HTMLElement, log: Log): Handler => {
  const setOpen = (folder: Element, open: boolean) => {
    folder.setAttribute('aria-expanded', String(open));

    const group = folder.nextElementSibling;
    if (group instanceof HTMLElement) group.hidden = !open;

    for (const item of surface.querySelectorAll(`[${KEYROVE_ATTR_ITEM}]`)) {
      item.toggleAttribute(KEYROVE_ATTR_SKIP, !!item.closest('[hidden]'));
    }
  };

  surface.addEventListener('click', (e) => {
    const folder = (e.target as Element).closest('[aria-expanded]');
    if (!folder) return;

    const open = folder.getAttribute('aria-expanded') === 'false';
    setOpen(folder, open);

    // No key to name: the click did this one, whatever set it off.
    log.widget(folder, '', open ? 'expanded' : 'collapsed');
  });

  return (e) => {
    const open = matchesCombo(e, 'ArrowRight');
    if (!open && !matchesCombo(e, 'ArrowLeft')) return null;

    // Only a folder the key would change: a page, or a folder already that
    // way round, leaves the key to the browser.
    const folder = e.target as Element;
    if (folder.getAttribute('aria-expanded') !== String(!open)) return null;

    e.preventDefault();
    setOpen(folder, open);
    log.widget(folder, keyLabel(e), open ? 'expanded' : 'collapsed');

    return folder;
  };
};

/**
 * Opening and closing, for the tree demo.
 *
 * keyrove walks the rows that are showing; the tree's shape is the tree's own,
 * so this is the page's snippet made live: → opens a closed folder and steps
 * into an open one, ← closes an open folder and steps out to the parent of
 * anything else, and a click opens or closes the folder it lands on, carrying
 * the roving tab stop with it. A key with nothing to do — → on a file, ← on a
 * closed top-level folder — is left to the browser, which is the contract the
 * handlers before it keep. Returns the keydown half, to chain after navigation
 * and typeahead.
 */
const wireTree = (surface: HTMLElement, log: Log): Handler => {
  const ITEM = '[role="treeitem"]';

  // A folder's rows are the group its `aria-owns` names, and the folder an
  // item sits under is the row just before the group around it.
  const groupOf = (item: Element) =>
    document.getElementById(item.getAttribute('aria-owns') ?? '');
  const parentOf = (item: Element) =>
    item.closest('[role="group"]')?.previousElementSibling ?? null;

  const toggle = (item: Element, open: boolean) => {
    const group = groupOf(item);
    if (!group) return;

    item.setAttribute('aria-expanded', String(open));
    group.hidden = !open;
  };

  const moveTo = (from: Element | null, to: Element) => {
    toggleTabIndex({ root: from, isActive: false });
    toggleTabIndex({ root: to, isActive: true });
    (to as HTMLElement).focus();
  };

  surface.addEventListener('click', (e) => {
    const item = (e.target as Element).closest(ITEM);
    if (!item) return;

    moveTo(surface.querySelector('[tabindex="0"]'), item);

    const expanded = item.getAttribute('aria-expanded');
    if (expanded === null) return;

    toggle(item, expanded === 'false');

    // No key to name: the pointer did this one.
    log.widget(item, '', expanded === 'false' ? 'expanded' : 'collapsed');
  });

  return (e) => {
    const item = (e.target as Element).closest(ITEM);
    if (!item) return null;

    // Null on a file: only a folder says whether it is open.
    const expanded = item.getAttribute('aria-expanded');
    const parent = parentOf(item);
    const key = keyLabel(e);

    if (matchesCombo(e, 'ArrowRight') && expanded === 'false') {
      toggle(item, true);
      log.widget(item, key, 'expanded');
    } else if (matchesCombo(e, 'ArrowRight') && expanded === 'true') {
      const child = groupOf(item)?.querySelector(ITEM);
      if (!child) return null;

      moveTo(item, child);
      log.widget(child, key, 'moved to');
    } else if (matchesCombo(e, 'ArrowLeft') && expanded === 'true') {
      toggle(item, false);
      log.widget(item, key, 'collapsed');
    } else if (matchesCombo(e, 'ArrowLeft') && parent) {
      moveTo(item, parent);
      log.widget(parent, key, 'moved to');
    } else {
      return null;
    }

    e.preventDefault();

    return item;
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
  // The demos whose group is described in JavaScript hand the same object to
  // both handlers, which is the point the options page makes.
  menu: (_surface, log, group) => [
    createTypeahead({ ...group, onMove: log.move }),
  ],
  listbox: (surface, log) => [
    createTypeahead({ onMove: log.move }),
    wireSelection(surface, log),
  ],
  sidebar: (surface, log) => [wireFolds(surface, log)],
  tree: (surface, log, group) => [
    createTypeahead({ ...group, onMove: log.move }),
    wireTree(surface, log),
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
  // A row inside a closed folder is still in the DOM, so it is still an item;
  // `skip` is what keeps a move from landing on one nobody can see.
  tree: {
    items: '[role="treeitem"]',
    skip: '[hidden] [role="treeitem"]',
    rovingTabindex: true,
  },
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

/** Wires every demo on the current page. */
export const mountDemos = () => {
  const demos = Array.from(
    document.querySelectorAll<HTMLElement>('.demo, .landing-demo'),
  );

  demos.forEach((demo, index) => {
    const surface = demo.querySelector<HTMLElement>(
      ':scope > :is(.demo-preview, .landing-preview) > .demo-surface',
    );

    // A demo draws one log or the other, and build/demos.ts decides which.
    const line = demo.querySelector<HTMLElement>('.log');
    if (!surface) return;
    const readout = demo.querySelector<HTMLElement>('[data-demo-readout]');
    const log = readout
      ? createReadout(surface, readout)
      : (createHistory(demo) ?? (line ? createLine(line) : null));
    if (!log) return;

    // Almost every demo is described in its own markup, which is what the
    // pages teach; `CONFIGS` holds the exceptions, each handed to the
    // handlers exactly as its page's snippet hands it to them.
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

    // The demo a page opens with starts focused, so the keys it documents work
    // on arrival rather than after a Tab or a click. Only the first one: focus
    // is single, and a page's opening demo is the one it is about.
    // `preventScroll` keeps arrival at the top of the page, so the list is
    // waiting when the reader gets to it rather than dragging them down to
    // it; the first arrow press will scroll it into view, which is the cost
    // of having it ready.
    //
    // Only while nothing else holds focus. The landing page opens on its hero
    // (see src/hero.ts), which is mounted first, and its first demo sits well
    // below that.
    const unclaimed =
      !document.activeElement || document.activeElement === document.body;
    if (index === 0 && unclaimed) {
      firstItem(surface, group)?.focus({ preventScroll: true });
    }
  });
};
