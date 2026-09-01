import { buildBindings, ENTERING_INTENTS } from './bindings.js';
import { resolveTarget } from './position.js';
import {
  isEditableTarget,
  matchesCombo,
  parseAttributeInt,
  toggleTabIndex,
} from './utils.js';
import type {
  Attributes,
  KeyRoveEvent,
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

  const cols = parseAttributeInt(root, attributes.cols, 1);
  const isGrid = cols > 1;

  // Wrapping is linear-only — a grid keeps its edges, per the APG grid
  // pattern. Presence-based (`hasAttribute`), so the bare `data-keyrove-loop`
  // spelling works; `getAttribute` truthiness would read it as "" and
  // silently disable it.
  const loop = !isGrid && root.hasAttribute(attributes.loop);

  // `orientation="horizontal"` redirects only the *default* keys — an
  // explicit binding still wins in the table. Nothing but the literal value
  // "horizontal" switches anything, and a grid ignores the attribute
  // outright: its inline axis is already horizontal.
  const horizontal =
    !isGrid && root.getAttribute(attributes.orientation) === 'horizontal';

  const explicit = {
    next: root.getAttribute(attributes.nextKey),
    prev: root.getAttribute(attributes.prevKey),
    nextRow: isGrid ? root.getAttribute(attributes.nextRowKey) : null,
    prevRow: isGrid ? root.getAttribute(attributes.prevRowKey) : null,
  };

  // Direction is resolved only when a default that could flip is actually in
  // play — an inline axis with at least one unbound side.
  const rtl =
    (isGrid || horizontal) && !(explicit.next && explicit.prev)
      ? isRtl(root)
      : false;

  // First match wins: one keypress resolves to at most one action, and the
  // table's order is the precedence — explicit over default over fixed.
  const binding = buildBindings({ explicit, isGrid, horizontal, rtl }).find(
    ({ combo }) => matchesCombo(e, combo),
  );

  if (!binding) return null;

  // The fixed intents only act once focus is genuinely inside an item: they
  // move *within* a group, they are not a way into one. The directional
  // intents deliberately are — which is how a group is entered from the
  // keyboard.
  if (!focused && !ENTERING_INTENTS.has(binding.intent)) return null;

  const target = resolveTarget({
    intent: binding.intent,
    elements,
    fromIndex,
    cols,
    pageLength: parseAttributeInt(root, attributes.pageLength, 10),
    loop,
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
