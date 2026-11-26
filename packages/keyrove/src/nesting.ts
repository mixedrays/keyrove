import type { IsRoot } from './types.js';

// `Node.DOCUMENT_NODE`, spelled out so reading it needs no global `Node`.
const DOCUMENT_NODE = 9;

/**
 * `<html>` stands in for the document or window. A shadow root is returned
 * as is: no single element contains every top-level child.
 */
export const listenerElement = (
  listener: EventTarget | null | undefined,
): Element | null => {
  if (!listener) return null;

  // Compare values, not `in`: a form exposes controls as named properties, so
  // `<input name="document">` makes `'document' in form` true.
  if ((listener as Node).nodeType === DOCUMENT_NODE) {
    return (listener as Document).documentElement;
  }
  if ((listener as Window).window === listener) {
    return (listener as Window).document.documentElement;
  }

  return listener as Element;
};

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
 * Not bounded by the listener, so settings on a wrapper root reach a listener
 * on an inner element.
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

/** An item that is itself a root belongs to the group around it. */
export const ownerRoot = (
  item: Element,
  root: Element,
  isRoot: IsRoot,
): Element => above(item, root, isRoot) ?? root;

/**
 * The one walk bounded by `reach`, the listener's element: `null` for `reach`
 * itself or anything outside it.
 */
export const outerRoot = (
  element: Element,
  reach: Element,
  isRoot: IsRoot,
): Element | null =>
  element === reach || !reach.contains(element)
    ? null
    : ownerRoot(element, reach, isRoot);

/** Outermost first. */
export const innerRoot = (item: Element, isRoot: IsRoot): Element | null =>
  Array.from(item.querySelectorAll('*')).find(isRoot) ?? null;
