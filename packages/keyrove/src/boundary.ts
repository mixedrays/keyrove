/**
 * The moves across a nested root's boundary.
 *
 * Inside a nested root only that root's bindings apply, so no stride reaches
 * the group around it, and no stride means "go inside this item". `exit` and
 * `enter` are those two moves. Each lands in a group other than the one the
 * key was pressed in, so the roving stop that moves is the destination
 * group's own, and the group focus left keeps its stop for the way back.
 */

import { ownItems, stopHolder } from './group.js';
import type { BoundaryAction, GroupConfig, IsRoot } from './types.js';

// `Node.DOCUMENT_POSITION_FOLLOWING`, spelled out so reading it needs no
// global `Node`.
const FOLLOWING = 4;

/**
 * Where a boundary move lands, and the item its group's roving stop is
 * carried from — `null` where that group has no stop to carry.
 */
export type Crossing = { to: Element; stopFrom: Element | null };

/**
 * The group a root sits in: the nearest root above it, else the listener's
 * element, and never one past the listener's reach. `null` for a root that
 * is the listener's element, or outside it: nothing around it is keyrove's.
 */
const outerRoot = (
  root: Element,
  scope: Element,
  isRoot: IsRoot,
): Element | null => {
  if (root === scope || !scope.contains(root)) return null;

  for (
    let element = root.parentElement;
    element && element !== scope;
    element = element.parentElement
  ) {
    if (isRoot(element)) return element;
  }

  return scope;
};

/** A group's own items that a move can land on: neither disabled nor skipped. */
const landings = (root: Element, config: GroupConfig, isRoot: IsRoot) =>
  ownItems(root, config.readItems, isRoot).filter(
    (item) => !item.hasAttribute('disabled') && !config.isSkipped(item),
  );

/**
 * Out of a nested root, to the group around it: the item of that group
 * containing the root, where the root sits inside one, else the nearest of
 * its items after the root in DOM order, else the nearest before it. Focus
 * already on that item — a root that is itself an item of the group around it
 * — has nowhere to go.
 */
const exit = (
  root: Element,
  scope: Element,
  config: GroupConfig,
  isRoot: IsRoot,
): Crossing | null => {
  const outer = outerRoot(root, scope, isRoot);

  if (!outer) return null;

  const items = landings(outer, config, isRoot);
  const after = items.findIndex(
    (item) => root.compareDocumentPosition(item) & FOLLOWING,
  );
  const to =
    items.find((item) => item.contains(root)) ??
    items[after < 0 ? items.length - 1 : after];

  if (!to || to.ownerDocument.activeElement === to) return null;

  return {
    to,
    stopFrom: stopHolder(outer, config.readItems, isRoot, config.isRoving),
  };
};

/**
 * Into the first root nested in `item`, outermost first: to the item holding
 * that group's roving stop, where a move can land on it, so the group opens
 * where the user left it; else to its first item a move can land on.
 */
const enter = (
  item: Element,
  config: GroupConfig,
  isRoot: IsRoot,
): Crossing | null => {
  const inner = Array.from(item.querySelectorAll('*')).find(isRoot);

  if (!inner) return null;

  const items = landings(inner, config, isRoot);
  const to =
    items.find(
      (each) => config.isRoving(each) && each.getAttribute('tabindex') === '0',
    ) ?? items[0];

  if (!to) return null;

  return {
    to,
    stopFrom: stopHolder(inner, config.readItems, isRoot, config.isRoving),
  };
};

/**
 * Where a boundary move goes from `root`, the group the key was pressed in,
 * or `null` where it has nowhere to go: `exit` from the listener's own group,
 * or with no item around it; `enter` with no item focused, or none nested in
 * it to land on. `scope` is the listener's element, past which no group is
 * keyrove's.
 */
export const crossBoundary = (
  intent: BoundaryAction,
  root: Element,
  scope: Element,
  focused: Element | null,
  config: GroupConfig,
  isRoot: IsRoot,
): Crossing | null => {
  if (intent === 'exit') return exit(root, scope, config, isRoot);

  return focused ? enter(focused, config, isRoot) : null;
};
