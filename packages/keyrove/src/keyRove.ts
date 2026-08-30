import {
  findFirst,
  findGridNeighbor,
  findLast,
  findNext,
  findPageTarget,
  findPrev,
  isEditableTarget,
  matchesCombo,
  parseAttributeInt,
  toggleTabIndex,
} from './utils.js';
import type {
  Attributes,
  GetNavElementsArgs,
  KeyRoveEvent,
  KnownCode,
  MoveAction,
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
  pageLength: 'data-keyrove-page-length',
  colsLength: 'data-keyrove-cols-length',
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
export const KEYROVE_ATTR_PAGE_LENGTH = DEFAULT_ATTRIBUTES.pageLength;
export const KEYROVE_ATTR_COLS_LENGTH = DEFAULT_ATTRIBUTES.colsLength;
export const KEYROVE_ATTR_ROVING_TABINDEX = DEFAULT_ATTRIBUTES.rovingTabindex;
export const KEYROVE_ATTR_LOOP = DEFAULT_ATTRIBUTES.loop;
export const KEYROVE_ATTR_ORIENTATION = DEFAULT_ATTRIBUTES.orientation;
export const KEYROVE_ATTR_TYPEAHEAD = DEFAULT_ATTRIBUTES.typeahead;

// Named so the dispatch below is checked against `KnownCode` instead of
// comparing against bare literals that TypeScript cannot vet.
const KEY = {
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',
  home: 'Home',
  end: 'End',
  pageUp: 'PageUp',
  pageDown: 'PageDown',
} as const satisfies Record<string, KnownCode>;

// Reading direction for a horizontal group. The nearest `dir` attribute
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

const getNavElements = ({
  root,
  elementsSelector,
  focusedSelector,
  attributes = DEFAULT_ATTRIBUTES,
}: GetNavElementsArgs) => {
  if (!root) return {};

  const elements = root.querySelectorAll(elementsSelector);
  const elementsArray = Array.from(elements);
  const focused = root.querySelector(focusedSelector);
  const fromIndex = focused ? elementsArray.indexOf(focused) : -1;
  const skipAttribute = attributes.skip;
  const bounds = { elements: elementsArray, fromIndex, skipAttribute };

  // When the nav root declares a column count, arrow keys navigate the list as
  // a grid: Up/Down jump a whole row so focus lands on the item directly
  // above/below, while Left/Right move by a single cell.
  const colsLength = parseAttributeInt(root, attributes.colsLength, 1);
  const isGrid = colsLength > 1;

  // Wrapping is linear-only — a grid keeps its edges, per the APG grid
  // pattern. Presence-based (`hasAttribute`), so the bare `data-keyrove-loop`
  // spelling works; `getAttribute` truthiness would read it as "" and
  // silently disable it.
  const loop = !isGrid && root.hasAttribute(attributes.loop);

  // A page is `pageLength` items in a list, and `pageLength` whole rows in a
  // grid — stepping by whole rows keeps focus in the column it started in.
  const pageLength = parseAttributeInt(root, attributes.pageLength, 10);
  const stride = pageLength * (isGrid ? colsLength : 1);

  return {
    elements,
    focused,
    next: findNext({ ...bounds, loop }),
    prev: findPrev({ ...bounds, loop }),
    first: findFirst(elementsArray, skipAttribute),
    last: findLast(elementsArray, skipAttribute),
    isGrid,
    up: isGrid ? findGridNeighbor({ ...bounds, step: -colsLength }) : null,
    down: isGrid ? findGridNeighbor({ ...bounds, step: colsLength }) : null,
    left: isGrid ? findGridNeighbor({ ...bounds, step: -1 }) : null,
    right: isGrid ? findGridNeighbor({ ...bounds, step: 1 }) : null,
    pageUp: findPageTarget({ ...bounds, direction: -1, stride }),
    pageDown: findPageTarget({ ...bounds, direction: 1, stride }),
  };
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

  const {
    focused,
    next,
    prev,
    first,
    last,
    isGrid,
    up,
    down,
    left,
    right,
    pageUp,
    pageDown,
  } = getNavElements({
    root,
    elementsSelector: `[${attributes.item}]:not([disabled])`,
    focusedSelector: `[${attributes.item}]:focus-within`,
    attributes,
  });

  // `orientation="horizontal"` redirects only the *default* keys — an
  // explicit binding still wins below. "Next" follows the reading direction,
  // so RTL flips the pair; the direction is resolved only when it can matter.
  // Nothing but the literal value "horizontal" switches anything, and a grid
  // ignores the attribute outright: its cell moves already cover the
  // horizontal axis, and re-pointing the row keys at the arrows would break
  // both.
  const horizontal =
    !isGrid && root?.getAttribute(attributes.orientation) === 'horizontal';
  const rtl = horizontal && root ? isRtl(root) : false;
  const defaultNext = horizontal
    ? rtl
      ? KEY.arrowLeft
      : KEY.arrowRight
    : KEY.arrowDown;
  const defaultPrev = horizontal
    ? rtl
      ? KEY.arrowRight
      : KEY.arrowLeft
    : KEY.arrowUp;

  const nextCode = root?.getAttribute(attributes.nextKey) || defaultNext;
  const prevCode = root?.getAttribute(attributes.prevKey) || defaultPrev;
  // Presence-based, so the bare `data-keyrove-roving-tabindex` spelling works
  // — `getAttribute` would read it as "" and silently disable roving.
  const useRovingTabindex = focused?.hasAttribute(attributes.rovingTabindex);

  // Focus a resolved target, moving the roving tab stop with it when enabled.
  //
  // This is also where `preventDefault()` lives, because only here is it known
  // that keyrove is actually in a position to act. The press is ours when it
  // resolves a target, and also when focus already sits inside the group but
  // the move has nowhere to go (an edge): the group owns its bound keys up to
  // its own boundary, so the page must not scroll there instead. With neither,
  // keyrove has nothing to move from or to and the key is left with its
  // browser default rather than being swallowed.
  const moveFocus = (
    target: Element | null | undefined,
    action: MoveAction,
  ): MoveResult | null => {
    if (!target && !focused) return null;

    e.preventDefault();

    const from = focused ?? null;

    // A missing target (a grid edge) or a target that is the position itself
    // (the end of a list) is a consumed no-op: focus and the tab stop stay
    // put, and `onMove` stays quiet because nothing moved.
    if (!target || target === focused) return { action, from, to: null };

    if (useRovingTabindex) {
      toggleTabIndex({ root: focused, isActive: false });
      toggleTabIndex({ root: target, isActive: true });
    }

    (target as HTMLElement).focus();

    const move = { action, from, to: target };
    onMove?.(move);

    return move;
  };

  // First match wins: one keypress resolves to at most one action, so a
  // custom binding that collides with a fixed key takes the press over it.
  if (matchesCombo(e, prevCode)) {
    // In a grid, Up moves a whole row; otherwise to the previous item.
    return moveFocus(isGrid ? up : prev, 'prev');
  }

  if (matchesCombo(e, nextCode)) {
    // In a grid, Down moves a whole row; otherwise to the next item.
    return moveFocus(isGrid ? down : next, 'next');
  }

  // Cell moves within a grid row. A prev/next binding to the same key never
  // reaches here — the returns above already claimed it.
  if (isGrid && matchesCombo(e, KEY.arrowLeft)) {
    return moveFocus(left, 'prev');
  }

  if (isGrid && matchesCombo(e, KEY.arrowRight)) {
    return moveFocus(right, 'next');
  }

  // Home/End/PageUp/PageDown only act once focus is genuinely inside an item:
  // they move *within* a group, they are not a way into one. Without this gate
  // Home and End would resolve the first/last item from outside the group and
  // pull focus in — which is what the arrows deliberately do, and what these
  // four deliberately do not.
  if (!focused) return null;

  if (matchesCombo(e, KEY.home)) {
    return moveFocus(first, 'home');
  }

  if (matchesCombo(e, KEY.end)) {
    return moveFocus(last, 'end');
  }

  if (matchesCombo(e, KEY.pageUp)) {
    return moveFocus(pageUp, 'pageUp');
  }

  if (matchesCombo(e, KEY.pageDown)) {
    return moveFocus(pageDown, 'pageDown');
  }

  return null;
};
