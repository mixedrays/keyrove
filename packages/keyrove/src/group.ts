/**
 * The group layer, shared by every handler.
 *
 * `keyRove` and `createTypeahead` resolve the same root, read the same items
 * and position off it, and end the same way: claim the key, land focus, carry
 * the roving tab stop, report. That tail *is* the result contract consumers
 * chain on with `||`, so it is spelled out once here — which keeps the two
 * handlers' promises identical and leaves a third one nothing to re-derive.
 */

import {
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_ROVING_TABINDEX,
} from './attributes.js';
import { hasEnabledAttribute, toggleTabIndex } from './utils.js';
import type {
  ActionResult,
  Group,
  IsRoot,
  IsRoving,
  MoveFocusArgs,
  ReadItems,
} from './types.js';

// The attribute source's answers to the three questions this layer asks about
// a group. They are the defaults of the parameters below, so a caller that
// names no other source navigates markup exactly as it always has, and the
// config layer hands them back down where an options object leaves a field
// unnamed.
export const attributeRoot: IsRoot = (element) =>
  hasEnabledAttribute(element, KEYROVE_ATTR_ROOT);

export const attributeItems: ReadItems = (root) =>
  Array.from(root.querySelectorAll(`[${KEYROVE_ATTR_ITEM}]`)).filter((item) =>
    hasEnabledAttribute(item, KEYROVE_ATTR_ITEM),
  );

export const attributeRoving: IsRoving = (from) =>
  hasEnabledAttribute(from, KEYROVE_ATTR_ROVING_TABINDEX);

/**
 * The focused element as `element`'s own tree sees it. Inside a shadow root
 * the document sees only the host, so the shadow root is asked instead; focus
 * in a shadow tree further down shows up as that tree's host, which is still
 * inside whatever contains it.
 */
export const activeElementOf = (element: Element): Element | null =>
  (element.getRootNode() as Partial<DocumentOrShadowRoot>).activeElement ??
  null;

/**
 * Whether the focused element is this element or inside it — `:focus-within`,
 * asked of the tree rather than of the selector engine. Focus moves without
 * mutating the DOM, and a cached selector result can go stale where a walk
 * cannot. An item that hands its focus on to a control of its own holds it
 * too.
 */
export const holdsFocus = (element: Element): boolean => {
  const active = activeElementOf(element);

  return !!active && element.contains(active);
};

// `Node.DOCUMENT_NODE`, spelled out so reading it needs no global `Node`.
const DOCUMENT_NODE = 9;

/**
 * The element a listener sits on. A listener on the document, or the window,
 * has no element of its own, so the document element stands in: `<html>`
 * answers attribute reads and item queries like any root, with nothing set.
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
 * The root a keypress is navigated in: the nearest element `isRoot` accepts at
 * or above `target` — by default the nearest `data-keyrove-root` — else the
 * listener's element. Resolving from the *target* rather than the listener is
 * what lets one delegated listener serve several groups, and lets a root nest
 * inside another and still win while focus is in it.
 */
export const resolveRoot = (
  target: Element | null | undefined,
  listener: EventTarget | null | undefined,
  isRoot: IsRoot = attributeRoot,
): Element | null => {
  for (let element = target; element; element = element.parentElement) {
    if (isRoot(element)) return element;
  }

  return listenerElement(listener);
};

/**
 * What a root governs: its navigable items in DOM order, and the one holding
 * focus. An item counts as focused when focus is anywhere inside it
 * (`:focus-within`), so an item wrapping a control is still the position after
 * Tab lands on that control; where items nest, the outer one is the position,
 * being first in DOM order.
 *
 * The position is looked for among the items themselves, so whatever
 * `readItems` leaves out is not a position either. `disabled` is taken out
 * here rather than in any one reading: it is the DOM's own word for an element
 * that takes no part, and it means the same whichever source named the items.
 * The root answers first: focus outside it means no item can hold it, and the
 * walk is skipped.
 */
export const readGroup = (
  root: Element,
  readItems: ReadItems = attributeItems,
): Group => {
  const items = readItems(root).filter(
    (item) => !item.hasAttribute('disabled'),
  );

  return {
    items,
    focused: holdsFocus(root) ? (items.find(holdsFocus) ?? null) : null,
  };
};

/**
 * The group an item of `root` belongs to: the nearest root above its
 * *parent*, short of `root` itself, else `root`. The resolution a focus key's
 * move uses, so an item that is itself a root belongs to the group around it.
 */
const ownerRoot = (item: Element, root: Element, isRoot: IsRoot): Element => {
  for (
    let element = item.parentElement;
    element && element !== root;
    element = element.parentElement
  ) {
    if (isRoot(element)) return element;
  }

  return root;
};

/**
 * The items a root governs itself: its items, less those of a root nested
 * inside it, which belong to that root (see `ownerRoot`).
 *
 * Deliberately not `readGroup`'s items, which keep a nested root's items so
 * the outer order runs straight through them. This is the set one group's
 * roving tab stop is shared across: exactly one `0` among them, and a nested
 * group's stop left alone.
 */
export const ownItems = (
  root: Element,
  readItems: ReadItems = attributeItems,
  isRoot: IsRoot = attributeRoot,
): Element[] =>
  readItems(root).filter((item) => ownerRoot(item, root, isRoot) === root);

/**
 * The item holding a group's roving tab stop: the first of its own items that
 * carries the stop and has `tabindex="0"`, disabled ones aside. `null` where
 * the group has none.
 */
export const stopHolder = (
  root: Element,
  readItems: ReadItems = attributeItems,
  isRoot: IsRoot = attributeRoot,
  isRoving: IsRoving = attributeRoving,
): Element | null =>
  ownItems(root, readItems, isRoot).find(
    (item) =>
      isRoving(item) &&
      item.getAttribute('tabindex') === '0' &&
      !item.hasAttribute('disabled'),
  ) ?? null;

/**
 * The item a move from `from` to `to`, both items of `root`, carries the
 * roving tab stop from. `root`'s order runs on through the items of a root
 * nested in it, but each group keeps a stop of its own: a move within one
 * group carries it from `from`, and a move into another carries that group's
 * own stop, leaving the stop of the group focus left where it is. `null`
 * where there is no `from`, or the group moved into has no stop to carry.
 */
export const stopSource = (
  root: Element,
  from: Element | null,
  to: Element | null | undefined,
  readItems: ReadItems = attributeItems,
  isRoot: IsRoot = attributeRoot,
  isRoving: IsRoving = attributeRoving,
): Element | null => {
  if (!from || !to) return from;

  const group = ownerRoot(to, root, isRoot);

  return ownerRoot(from, root, isRoot) === group
    ? from
    : stopHolder(group, readItems, isRoot, isRoving);
};

/**
 * Gives `stop` the group's one `tabindex="0"` and every other of its roving
 * `items` `-1` — or all of them `-1` where there is no stop. Only attributes
 * that change are written, so a group already in order takes no mutations.
 */
export const placeStop = (items: Element[], stop: Element | null) => {
  for (const item of items) {
    const isActive = item === stop;

    if (item.getAttribute('tabindex') !== (isActive ? '0' : '-1')) {
      toggleTabIndex({ root: item, isActive });
    }
  }
};

/**
 * Moves the roving tab stop from one item to another, and hands back how to
 * put both `tabindex` values back exactly as they were — absent included.
 */
const carryStop = (from: Element, to: Element) => {
  const before = [from, to].map(
    (element) => [element, element.getAttribute('tabindex')] as const,
  );

  toggleTabIndex({ root: from, isActive: false });
  toggleTabIndex({ root: to, isActive: true });

  return () => {
    for (const [element, value] of before) {
      if (value === null) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', value);
    }
  };
};

/**
 * Claims the key and lands focus on `to`, reporting the move.
 *
 * Call it only once a handler has decided the press is its own:
 * `preventDefault` is unconditional here, because the group owns its keys up
 * to its own boundary and the page must not scroll instead. A move made from
 * code passes no event, and has no key to claim. A missing `to`, or
 * one that is the focused item already, is a consumed no-op — focus and the
 * tab stop stay put, `onMove` stays quiet, and the result carries `to: null`.
 * Otherwise the roving tab stop follows when `isRoving` accepts the item it is
 * carried from — by default, when it carries the attribute — `to` is focused,
 * and `onMove` fires with the move that happened. That item is `from`, unless
 * `stopFrom` names another: a move into another group carries that group's
 * own stop, found by `stopSource` or at a boundary crossing.
 *
 * A `to` that does not take focus — not focusable, inert, hidden — is the same
 * consumed no-op, with the tab stop put back where it was.
 */
export const moveFocus = <Action extends string>({
  e,
  action,
  from,
  to,
  isRoving = attributeRoving,
  stopFrom = from,
  onMove,
}: MoveFocusArgs<Action>): ActionResult<Action> => {
  e?.preventDefault();

  if (!to || to === from) return { action, from, to: null };

  // The stop moves before focus does: `tabindex="0"` is what makes a bare item
  // focusable in the first place.
  const putBack =
    stopFrom && stopFrom !== to && isRoving(stopFrom)
      ? carryStop(stopFrom, to)
      : undefined;

  (to as HTMLElement).focus();

  // `focus()` fails silently, so whether focus landed on `to` or inside it is
  // read off the tree.
  if (!holdsFocus(to)) {
    putBack?.();

    return { action, from, to: null };
  }

  const move = { action, from, to };
  onMove?.(move);

  return move;
};
