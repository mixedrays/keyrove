import {
  KEYROVE_ATTR_FOCUS_KEY,
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_SKIP,
  type GroupOptions,
  createTypeahead,
  followFocus,
  keyRove,
  matchesCombo,
  toggleTabIndex,
} from '@mixedrays/keyrove';

import { demoDefinition, type DemoExtra } from '../build/demo-definitions.ts';
import { createReadout, keyLabel, type Readout } from './readout.ts';

/**
 * The live half of the demos embedded in the docs.
 *
 * Nothing here builds DOM. Every demo's markup is stamped into the page at
 * build time from the file under `content/_demos` that the source block below
 * it shows (see build/demos.ts), so this only wires the behaviour markup cannot
 * carry: the keydown listener and the readout. What a demo needs beyond
 * navigation is its entry in build/demo-definitions.ts, which the build read
 * too. src/components/markdown.tsx mounts it on each demo once React has
 * rendered the page, and leaves the demo's markup to it — React draws the
 * panel around the demo and its code tabs, never the demo itself.
 */

/** A keydown handler with keyrove's contract: truthy when it claimed the key. */
type Handler = (e: KeyboardEvent) => unknown;

/**
 * Picking, for the listbox demo.
 *
 * Selection is the widget's state rather than keyrove's, so this is the page's
 * own snippet made live: Space or Enter picks the focused option, a click picks
 * it, and either is reported to the readout. `followFocus` carries the roving
 * tab stop to wherever focus lands, the click included. Returns the keydown
 * half, to chain after navigation and typeahead.
 */
const wireSelection = (
  surface: HTMLElement,
  readout: Readout,
  signal: AbortSignal,
): Handler => {
  const OPTION = '[role="option"]';

  const select = (option: Element) => {
    for (const each of surface.querySelectorAll(OPTION)) {
      each.setAttribute('aria-selected', String(each === option));
    }
  };

  surface.addEventListener('focusin', (e) => followFocus(e), { signal });

  surface.addEventListener(
    'click',
    (e) => {
      const option = (e.target as Element).closest(OPTION);
      if (!option) return;

      select(option);

      // No key to name: the pointer did this one.
      readout.widget(option, '', 'selected');
    },
    { signal },
  );

  return (e) => {
    if (!matchesCombo(e, 'Space, Enter')) return null;

    const option = (e.target as Element).closest(OPTION);
    if (!option) return null;

    e.preventDefault();
    select(option);
    readout.widget(option, keyLabel(e), 'selected');

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
const wireFolds = (
  surface: HTMLElement,
  readout: Readout,
  signal: AbortSignal,
): Handler => {
  const setOpen = (folder: Element, open: boolean) => {
    folder.setAttribute('aria-expanded', String(open));

    const group = folder.nextElementSibling;
    if (group instanceof HTMLElement) group.hidden = !open;

    for (const item of surface.querySelectorAll(`[${KEYROVE_ATTR_ITEM}]`)) {
      item.toggleAttribute(KEYROVE_ATTR_SKIP, !!item.closest('[hidden]'));
    }
  };

  surface.addEventListener(
    'click',
    (e) => {
      const folder = (e.target as Element).closest('[aria-expanded]');
      if (!folder) return;

      const open = folder.getAttribute('aria-expanded') === 'false';
      setOpen(folder, open);

      // No key to name: the click did this one, whatever set it off.
      readout.widget(folder, '', open ? 'expanded' : 'collapsed');
    },
    { signal },
  );

  return (e) => {
    const open = matchesCombo(e, 'ArrowRight');
    if (!open && !matchesCombo(e, 'ArrowLeft')) return null;

    // Only a folder the key would change: a page, or a folder already that
    // way round, leaves the key to the browser.
    const folder = e.target as Element;
    if (folder.getAttribute('aria-expanded') !== String(!open)) return null;

    e.preventDefault();
    setOpen(folder, open);
    readout.widget(folder, keyLabel(e), open ? 'expanded' : 'collapsed');

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
const wireTree = (
  surface: HTMLElement,
  readout: Readout,
  signal: AbortSignal,
): Handler => {
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

  surface.addEventListener(
    'click',
    (e) => {
      const item = (e.target as Element).closest(ITEM);
      if (!item) return;

      moveTo(surface.querySelector('[tabindex="0"]'), item);

      const expanded = item.getAttribute('aria-expanded');
      if (expanded === null) return;

      toggle(item, expanded === 'false');

      // No key to name: the pointer did this one.
      readout.widget(item, '', expanded === 'false' ? 'expanded' : 'collapsed');
    },
    { signal },
  );

  return (e) => {
    const item = (e.target as Element).closest(ITEM);
    if (!item) return null;

    // Null on a file: only a folder says whether it is open.
    const expanded = item.getAttribute('aria-expanded');
    const parent = parentOf(item);
    const key = keyLabel(e);

    if (matchesCombo(e, 'ArrowRight') && expanded === 'false') {
      toggle(item, true);
      readout.widget(item, key, 'expanded');
    } else if (matchesCombo(e, 'ArrowRight') && expanded === 'true') {
      const child = groupOf(item)?.querySelector(ITEM);
      if (!child) return null;

      moveTo(item, child);
      readout.widget(child, key, 'moved to');
    } else if (matchesCombo(e, 'ArrowLeft') && expanded === 'true') {
      toggle(item, false);
      readout.widget(item, key, 'collapsed');
    } else if (matchesCombo(e, 'ArrowLeft') && parent) {
      moveTo(item, parent);
      readout.widget(parent, key, 'moved to');
    } else {
      return null;
    }

    e.preventDefault();

    return item;
  };
};

/**
 * The behaviours a definition can list in `extras`, each returning the
 * keydown handler to chain after `keyRove`. A demo listing none runs
 * navigation alone.
 */
const EXTRAS: Record<
  DemoExtra,
  (
    surface: HTMLElement,
    readout: Readout,
    group: GroupOptions,
    signal: AbortSignal,
  ) => Handler
> = {
  // Handed the same group as navigation, which is the point the options page
  // makes for the demos described in JavaScript.
  typeahead: (_surface, readout, group) =>
    createTypeahead({ ...group, onMove: readout.move }),
  selection: (surface, readout, _group, signal) =>
    wireSelection(surface, readout, signal),
  folds: (surface, readout, _group, signal) =>
    wireFolds(surface, readout, signal),
  branches: (surface, readout, _group, signal) =>
    wireTree(surface, readout, signal),
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

/** Every live demo on a page, in order: the panels, and the landing page's hero. */
const LIVE_DEMO = '[data-demo], .hero-demo';

/**
 * Focuses `item` if `demo` is the one the page opens with, so the keys it
 * documents work on arrival rather than after a Tab or a click. Only the
 * first live demo: focus is single, and a page's opening demo is the one it
 * is about — on the landing page the hero, whichever of them mounts first.
 * `preventScroll` keeps arrival at the top of the page, so the list is
 * waiting when the reader gets to it rather than dragging them down to it;
 * the first arrow press will scroll it into view, which is the cost of having
 * it ready.
 *
 * Only while nothing else holds focus. A client-side navigation hands focus
 * back to the page first (see src/components/docs-layout.tsx), so a page
 * reached from the sidebar opens the way a page loaded from its URL does.
 */
export const focusOnArrival = (demo: HTMLElement, item: HTMLElement | null) => {
  const isFirst = document.querySelector(LIVE_DEMO) === demo;
  const unclaimed =
    !document.activeElement || document.activeElement === document.body;
  if (isFirst && unclaimed) item?.focus({ preventScroll: true });
};

/**
 * Wires one demo, the `.demo-panel[data-demo]` build/demos.ts stamped, as its
 * entry in build/demo-definitions.ts says. Every listener goes on the demo's
 * own elements and comes off when `signal` aborts, which is when the component
 * holding the demo unmounts. Throws on markup the build did not stamp.
 */
export const mountDemo = (demo: HTMLElement, signal: AbortSignal) => {
  const { group = {}, extras = [] } = demoDefinition(demo.dataset.demo ?? '');
  const surface = demo.querySelector<HTMLElement>(
    ':scope > .demo-panel-preview > .demo-surface',
  );
  if (!surface) {
    throw new Error(`[docs] the "${demo.dataset.demo}" demo has no surface.`);
  }

  // Before the readout starts, which reads back where focus is.
  focusOnArrival(demo, firstItem(surface, group));

  const readout = createReadout(demo, surface, signal);
  const handlers: Handler[] = [
    (e) => keyRove(e, { ...group, onMove: readout.move }),
    ...extras.map((extra) => EXTRAS[extra](surface, readout, group, signal)),
  ];

  // One listener for the demo, nested roots included: the event bubbles here
  // and keyrove resolves the root from its target, not from this element.
  surface.addEventListener(
    'keydown',
    (e) => {
      // The first handler to claim the key ends the chain, which is the `||`
      // of the pages' own snippets — kept rather than discarded, because what
      // it answered with is what the readout has to report.
      let claimed: unknown = null;
      for (const handle of handlers) {
        claimed = handle(e);
        if (claimed) break;
      }

      readout.keydown(e, claimed);
    },
    { signal },
  );
};
