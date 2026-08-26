/**
 * Standalone helpers behind keyRove's navigation.
 *
 * Everything here is pure with respect to keyrove's own concepts: helpers take
 * a plain element list and an attribute *name*, never the attribute map, so
 * they can be reasoned about and tested without a DOM tree wired to a nav root.
 */

import type {
  GridNeighborArgs,
  NavBounds,
  PageTargetArgs,
  ToggleTabIndexArgs,
} from './types.js';

/**
 * Sets `tabindex` to `0` / `-1` on `root`.
 *
 * Descendant `tabindex` values are deliberately left alone — they belong to the
 * consumer. Roving tabindex only needs the item itself to carry the tab stop.
 */
export const toggleTabIndex = ({ root, isActive }: ToggleTabIndexArgs) => {
  if (!root) return;

  root.setAttribute('tabindex', isActive ? '0' : '-1');
};

/** Reads an integer attribute off an element, falling back when absent or unparseable. */
export const parseAttributeInt = (
  element: Element,
  attribute: string,
  fallback: number,
): number =>
  parseInt(element.getAttribute(attribute) || String(fallback)) || fallback;

/** First navigable element, or the very first one when every element is skipped. */
export const findFirst = (
  elements: Element[],
  skipAttribute: string,
): Element | undefined =>
  elements.find((el) => !el.hasAttribute(skipAttribute)) || elements[0];

/** Last navigable element, or the very last one when every element is skipped. */
export const findLast = (
  elements: Element[],
  skipAttribute: string,
): Element | undefined =>
  elements
    .slice()
    .reverse()
    .find((el) => !el.hasAttribute(skipAttribute)) ||
  elements[elements.length - 1];

/** Next navigable element after `fromIndex`, falling back to the last one. */
export const findNext = ({
  elements,
  fromIndex,
  skipAttribute,
}: NavBounds): Element | undefined => {
  for (let i = fromIndex + 1; i < elements.length; i++) {
    if (!elements[i].hasAttribute(skipAttribute)) return elements[i];
  }

  return findLast(elements, skipAttribute);
};

/** Previous navigable element before `fromIndex`, falling back to the first one. */
export const findPrev = ({
  elements,
  fromIndex,
  skipAttribute,
}: NavBounds): Element | undefined => {
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (!elements[i].hasAttribute(skipAttribute)) return elements[i];
  }

  return findFirst(elements, skipAttribute);
};

/**
 * Resolves the neighbour `step` positions away, stepping further in the same
 * direction over skipped cells. Returns null at the grid edge (no wrapping).
 */
export const findGridNeighbor = ({
  elements,
  fromIndex,
  step,
  skipAttribute,
}: GridNeighborArgs): Element | null => {
  if (fromIndex < 0) return null;

  for (let i = fromIndex + step; i >= 0 && i < elements.length; i += step) {
    if (!elements[i].hasAttribute(skipAttribute)) return elements[i];
  }

  return null;
};

/**
 * Resolves the target of a page jump: `stride` positions away in `direction`.
 *
 * Unlike arrow movement, a page jump is a request to travel as far as possible,
 * so overshooting either end clamps to the first/last element rather than
 * doing nothing.
 */
export const findPageTarget = ({
  elements,
  fromIndex,
  direction,
  stride,
  skipAttribute,
}: PageTargetArgs): Element | null | undefined => {
  if (fromIndex < 0) return null;

  const targetIndex = fromIndex + stride * direction;
  const edge =
    direction < 0
      ? findFirst(elements, skipAttribute)
      : findLast(elements, skipAttribute);

  if (targetIndex < 0 || targetIndex >= elements.length) return edge;

  for (let i = targetIndex; i >= 0 && i < elements.length; i += direction) {
    if (!elements[i].hasAttribute(skipAttribute)) return elements[i];
  }

  return edge;
};
