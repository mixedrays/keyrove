import {
  findFirst,
  findGridNeighbor,
  findLast,
  findNext,
  findPageTarget,
  findPrev,
  parseAttributeInt,
  toggleTabIndex,
} from './utils.js';
import type {
  Attributes,
  CallbacksKeys,
  GetNavElementsArgs,
  KeyRoveEvent,
  KnownCode,
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

  // A page is `pageLength` items in a list, and `pageLength` whole rows in a
  // grid — stepping by whole rows keeps focus in the column it started in.
  const pageLength = parseAttributeInt(root, attributes.pageLength, 10);
  const stride = pageLength * (isGrid ? colsLength : 1);

  return {
    elements,
    focused,
    next: findNext(bounds),
    prev: findPrev(bounds),
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
 * @param options.callbacks - Callbacks fired after focus moves.
 */
export const keyRove = (e: KeyRoveEvent, { callbacks = {} }: Options = {}) => {
  const attributes = DEFAULT_ATTRIBUTES;
  const eventTarget = e.target as Element | null;
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

  const nextCode = root?.getAttribute(attributes.nextKey) || KEY.arrowDown;
  const prevCode = root?.getAttribute(attributes.prevKey) || KEY.arrowUp;
  const useRovingTabindex = focused?.getAttribute(attributes.rovingTabindex);

  // Focus a resolved target, moving the roving tab stop with it when enabled.
  //
  // This is also where `preventDefault()` lives, because only here is it known
  // that keyrove is actually in a position to act. The press is ours when it
  // resolves a target, and also when focus already sits inside the group but
  // the move has nowhere to go (a grid edge): the group owns its bound keys up
  // to its own boundary, so the page must not scroll there instead. With
  // neither, keyrove has nothing to move from or to and the key is left with
  // its browser default rather than being swallowed.
  const moveFocus = (
    target: Element | null | undefined,
    callbackKey: CallbacksKeys,
  ) => {
    if (!target && !focused) return;

    e.preventDefault();

    // A null target (a grid edge) is a no-op so the current tab stop is kept.
    if (!target) return;

    if (useRovingTabindex) {
      toggleTabIndex({ root: focused, isActive: false });
      toggleTabIndex({ root: target, isActive: true });
    }

    (target as HTMLElement).focus();
    callbacks[callbackKey]?.({ focused: target });
  };

  if (e.code === prevCode) {
    // In a grid, Up moves a whole row; otherwise to the previous item.
    moveFocus(isGrid ? up : prev, 'prev');
  }

  if (e.code === nextCode) {
    // In a grid, Down moves a whole row; otherwise to the next item.
    moveFocus(isGrid ? down : next, 'next');
  }

  if (e.code === KEY.arrowLeft && prevCode !== KEY.arrowLeft && isGrid) {
    // move one cell left within the grid row
    moveFocus(left, 'prev');
  }

  if (e.code === KEY.arrowRight && nextCode !== KEY.arrowRight && isGrid) {
    // move one cell right within the grid row
    moveFocus(right, 'next');
  }

  // Home/End/PageUp/PageDown only act once focus is genuinely inside an item:
  // they move *within* a group, they are not a way into one. Without this gate
  // Home and End would resolve the first/last item from outside the group and
  // pull focus in — which is what the arrows deliberately do, and what these
  // four deliberately do not.
  if (!focused) return;

  if (e.code === KEY.home) {
    moveFocus(first, 'home');
  }

  if (e.code === KEY.end) {
    moveFocus(last, 'end');
  }

  if (e.code === KEY.pageUp) {
    moveFocus(pageUp, 'pageUp');
  }

  if (e.code === KEY.pageDown) {
    moveFocus(pageDown, 'pageDown');
  }
};
