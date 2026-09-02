import { buildBindings } from './bindings.js';
import { resolveTarget } from './position.js';
import {
  isEditableTarget,
  matchesCombo,
  parseAttributeInt,
  toggleTabIndex,
} from './utils.js';
import type {
  Attributes,
  ExplicitBindings,
  KeyRoveEvent,
  Layout,
  MoveResult,
  Options,
} from './types.js';

/**
 * Attribute names keyrove reads from the DOM.
 *
 * Internal on purpose: making these configurable is a deliberate non-goal for
 * now, and exporting the map would freeze its shape before that feature is
 * designed. The individual `KEYROVE_ATTR_*` constants below are the public surface.
 */
const DEFAULT_ATTRIBUTES = {
  item: 'data-keyrove-item',
  skip: 'data-keyrove-skip',
  root: 'data-keyrove-root',
  nextKey: 'data-keyrove-next-key',
  prevKey: 'data-keyrove-prev-key',
  nextRowKey: 'data-keyrove-next-row-key',
  prevRowKey: 'data-keyrove-prev-row-key',
  homeKey: 'data-keyrove-home-key',
  endKey: 'data-keyrove-end-key',
  homeRowKey: 'data-keyrove-home-row-key',
  endRowKey: 'data-keyrove-end-row-key',
  pageUpKey: 'data-keyrove-page-up-key',
  pageDownKey: 'data-keyrove-page-down-key',
  pageLength: 'data-keyrove-page-length',
  cols: 'data-keyrove-cols',
  rovingTabindex: 'data-keyrove-roving-tabindex',
  loop: 'data-keyrove-loop',
  orientation: 'data-keyrove-orientation',
  typeahead: 'data-keyrove-typeahead',
} as const satisfies Attributes;

// Individual constants, so consumers can spread them into markup without
// reaching into the map.
export const KEYROVE_ATTR_ITEM = DEFAULT_ATTRIBUTES.item;
export const KEYROVE_ATTR_SKIP = DEFAULT_ATTRIBUTES.skip;
export const KEYROVE_ATTR_ROOT = DEFAULT_ATTRIBUTES.root;
export const KEYROVE_ATTR_NEXT_KEY = DEFAULT_ATTRIBUTES.nextKey;
export const KEYROVE_ATTR_PREV_KEY = DEFAULT_ATTRIBUTES.prevKey;
export const KEYROVE_ATTR_NEXT_ROW_KEY = DEFAULT_ATTRIBUTES.nextRowKey;
export const KEYROVE_ATTR_PREV_ROW_KEY = DEFAULT_ATTRIBUTES.prevRowKey;
export const KEYROVE_ATTR_HOME_KEY = DEFAULT_ATTRIBUTES.homeKey;
export const KEYROVE_ATTR_END_KEY = DEFAULT_ATTRIBUTES.endKey;
export const KEYROVE_ATTR_HOME_ROW_KEY = DEFAULT_ATTRIBUTES.homeRowKey;
export const KEYROVE_ATTR_END_ROW_KEY = DEFAULT_ATTRIBUTES.endRowKey;
export const KEYROVE_ATTR_PAGE_UP_KEY = DEFAULT_ATTRIBUTES.pageUpKey;
export const KEYROVE_ATTR_PAGE_DOWN_KEY = DEFAULT_ATTRIBUTES.pageDownKey;
export const KEYROVE_ATTR_PAGE_LENGTH = DEFAULT_ATTRIBUTES.pageLength;
export const KEYROVE_ATTR_COLS = DEFAULT_ATTRIBUTES.cols;
export const KEYROVE_ATTR_ROVING_TABINDEX = DEFAULT_ATTRIBUTES.rovingTabindex;
export const KEYROVE_ATTR_LOOP = DEFAULT_ATTRIBUTES.loop;
export const KEYROVE_ATTR_ORIENTATION = DEFAULT_ATTRIBUTES.orientation;
export const KEYROVE_ATTR_TYPEAHEAD = DEFAULT_ATTRIBUTES.typeahead;

// Reading direction for an inline axis. The nearest `dir` attribute
// decides, mirroring how the DOM resolves direction (and working in jsdom,
// which has no layout); `dir="auto"` — content-dependent, so only the
// browser can resolve it — and a missing attribute fall through to the
// computed style, guarded for environments without `getComputedStyle`.
const isRtl = (root: Element): boolean => {
  const dir = root.closest('[dir]')?.getAttribute('dir')?.toLowerCase();

  if (dir === 'rtl' || dir === 'ltr') return dir === 'rtl';

  return (
    typeof getComputedStyle !== 'undefined' &&
    getComputedStyle(root).direction === 'rtl'
  );
};

/**
 * Reads the group's layout off its root. A list is one column; `cols` above 1
 * makes a grid, which has no orientation of its own — its `next`/`prev` axis is
 * sideways by nature — and never wraps, per the APG grid pattern.
 */
const readLayout = (root: Element, attributes: Attributes): Layout => {
  const cols = parseAttributeInt(root, attributes.cols, 1);

  if (cols > 1) return { kind: 'grid', cols, horizontal: true, loop: false };

  return {
    kind: 'list',
    cols: 1,
    // `orientation="horizontal"` redirects only the *default* keys — an
    // explicit binding still wins in the table. Nothing but the literal value
    // "horizontal" switches anything.
    horizontal: root.getAttribute(attributes.orientation) === 'horizontal',
    // Presence-based (`hasAttribute`), so the bare `data-keyrove-loop`
    // spelling works; `getAttribute` truthiness would read it as "" and
    // silently disable it.
    loop: root.hasAttribute(attributes.loop),
  };
};

/**
 * The combos bound on the root, one per move — `null` where the attribute is
 * unset and the move keeps its default key. Read unfiltered: the binding table
 * consults only the moves its layout has, so a row key set on a list is never
 * looked at.
 */
const readExplicitBindings = (
  root: Element,
  attributes: Attributes,
): Required<ExplicitBindings> => ({
  next: root.getAttribute(attributes.nextKey),
  prev: root.getAttribute(attributes.prevKey),
  nextRow: root.getAttribute(attributes.nextRowKey),
  prevRow: root.getAttribute(attributes.prevRowKey),
  home: root.getAttribute(attributes.homeKey),
  end: root.getAttribute(attributes.endKey),
  homeRow: root.getAttribute(attributes.homeRowKey),
  endRow: root.getAttribute(attributes.endRowKey),
  pageUp: root.getAttribute(attributes.pageUpKey),
  pageDown: root.getAttribute(attributes.pageDownKey),
});

/**
 * Handles keyboard navigation within the provided event's current target.
 * @param e - The keydown event, native or framework-synthetic.
 * @param options.onMove - Fired after focus moved — only when it actually did.
 * @returns `null` when the key was left untouched; `{ action, from, to }` when
 * it was consumed, with `to: null` for a consumed no-op at an edge. A non-null
 * result means the key is claimed, so handlers chain with `||`:
 * `keyRove(e) || myOwnHandler(e)`.
 */
export const keyRove = (
  e: KeyRoveEvent,
  { onMove }: Options = {},
): MoveResult | null => {
  const attributes = DEFAULT_ATTRIBUTES;
  const eventTarget = e.target as Element | null;

  if (isEditableTarget(eventTarget)) return null;

  const closestRoot = eventTarget?.closest?.(`[${attributes.root}]`);
  const root = (closestRoot || e.currentTarget) as Element | null;

  if (!root) return null;

  const elements = Array.from(
    root.querySelectorAll(`[${attributes.item}]:not([disabled])`),
  );
  const focused = root.querySelector(`[${attributes.item}]:focus-within`);
  const fromIndex = focused ? elements.indexOf(focused) : -1;

  const layout = readLayout(root, attributes);

  // First match wins: one keypress resolves to at most one action, and the
  // table's order is the precedence — explicit over default.
  const binding = buildBindings({
    explicit: readExplicitBindings(root, attributes),
    layout,
    rtl: () => isRtl(root),
  }).find(({ combo }) => matchesCombo(e, combo));

  if (!binding) return null;

  // Most moves only act once focus is genuinely inside an item, whatever key
  // they are bound to: they move *within* a group, they are not a way into
  // one. The directional moves deliberately are — which is how a group is
  // entered from the keyboard.
  if (!focused && !binding.enters) return null;

  const target = resolveTarget({
    intent: binding.intent,
    elements,
    fromIndex,
    layout,
    pageLength: parseAttributeInt(root, attributes.pageLength, 10),
    skipAttribute: attributes.skip,
  });

  // With neither a target nor a focused item, keyrove has nothing to move
  // from or to and the key is left with its browser default rather than
  // being swallowed.
  if (!target && !focused) return null;

  // Only here is it known that keyrove is actually in a position to act. The
  // press is ours when it resolves a target, and also when focus already sits
  // inside the group but the move has nowhere to go (an edge): the group owns
  // its bound keys up to its own boundary, so the page must not scroll there
  // instead.
  e.preventDefault();

  const from = focused ?? null;

  // A missing target (a grid edge) or a target that is the position itself
  // (the end of a list) is a consumed no-op: focus and the tab stop stay
  // put, and `onMove` stays quiet because nothing moved.
  if (!target || target === focused) {
    return { action: binding.intent, from, to: null };
  }

  // Presence-based, so the bare `data-keyrove-roving-tabindex` spelling works
  // — `getAttribute` would read it as "" and silently disable roving.
  if (focused?.hasAttribute(attributes.rovingTabindex)) {
    toggleTabIndex({ root: focused, isActive: false });
    toggleTabIndex({ root: target, isActive: true });
  }

  (target as HTMLElement).focus();

  const move = { action: binding.intent, from, to: target };
  onMove?.(move);

  return move;
};
