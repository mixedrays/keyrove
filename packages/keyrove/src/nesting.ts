/**
 * Where groups sit in the tree, relative to each other.
 *
 * Roots nest, and every handler eventually asks one of three questions about
 * that nesting: which root an element is in, which root is around a nested
 * one, and which root is nested in an item. They are answered here, by one
 * walk up the tree and one down it, and the listener's reach is applied in
 * one place, `outerRoot`.
 */

import type { IsRoot } from './types.js';

// `Node.DOCUMENT_NODE`, spelled out so reading it needs no global `Node`.
const DOCUMENT_NODE = 9;

/**
 * The element a listener sits on. A listener on the document, or the window,
 * has no element of its own, so the document element stands in: `<html>`
 * answers attribute reads and item queries like any root, with nothing set.
 *
 * A listener on a shadow root has no element to stand in: no single one
 * contains every top-level child. The shadow root is handed back as it is — a
 * fragment that answers item queries and holds focus like any root, and has
 * no attributes, so every attribute read of it is unset (see `readAttribute`).
 */
export const listenerElement = (
  listener: EventTarget | null | undefined,
): Element | null => {
  if (!listener) return null;

  // Told apart by values, not by which properties exist: a form exposes its
  // controls as named properties, so `<input name="document">` makes
  // `'document' in form` true. A control can stand in for `nodeType` or
  // `window` too, but it is an element, never 9 or the form itself.
  if ((listener as Node).nodeType === DOCUMENT_NODE) {
    return (listener as Document).documentElement;
  }
  if ((listener as Window).window === listener) {
    return (listener as Window).document.documentElement;
  }

  return listener as Element;
};

/**
 * The one walk up the tree: the nearest root above `element` — its parent
 * first — short of `bound`. `null` with none, and each question answers that
 * its own way.
 */
const above = (
  element: Element,
  bound: Element | null,
  isRoot: IsRoot,
): Element | null => {
  for (
    let parent = element.parentElement;
    parent && parent !== bound;
    parent = parent.parentElement
  ) {
    if (isRoot(parent)) return parent;
  }

  return null;
};

/**
 * The root an event at `target` is in: the nearest root at or above it, else
 * the listener's element. `null` with neither.
 *
 * Deliberately not bounded by the listener: with no root between the target
 * and the listener's element, a root above that element wins, so settings on
 * a wrapper root reach a listener on an inner element. A walk from one group
 * to the next never leaves the listener's element; see `outerRoot`.
 */
export const rootAt = (
  target: Element | null | undefined,
  listener: EventTarget | null | undefined,
  isRoot: IsRoot,
): Element | null => {
  const root =
    target && (isRoot(target) ? target : above(target, null, isRoot));

  return root || listenerElement(listener);
};

/**
 * The root an item of `root`'s belongs to: the nearest root above it, short
 * of `root`, else `root` — so an item that is itself a root belongs to the
 * group around it.
 */
export const ownerRoot = (
  item: Element,
  root: Element,
  isRoot: IsRoot,
): Element => above(item, root, isRoot) ?? root;

/**
 * The root around `element`, within `reach` — the listener's element, past
 * which nothing is keyrove's: the nearest root above it, short of `reach`,
 * else `reach`. An item that is itself a root is in the group around it.
 * `null` for `reach` itself, or anything outside it: nothing around those is
 * keyrove's. The one place the listener's reach bounds a walk.
 */
export const outerRoot = (
  element: Element,
  reach: Element,
  isRoot: IsRoot,
): Element | null =>
  element === reach || !reach.contains(element)
    ? null
    : ownerRoot(element, reach, isRoot);

/**
 * The root nested in `item`: the first root inside it, outermost first — the
 * walk down the tree. `null` with none.
 */
export const innerRoot = (item: Element, isRoot: IsRoot): Element | null =>
  Array.from(item.querySelectorAll('*')).find(isRoot) ?? null;
