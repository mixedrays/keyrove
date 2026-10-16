/**
 * The moves across a nested root's boundary.
 *
 * Inside a nested root only that root's bindings apply, so no stride reaches
 * the group around it, and no stride means "go inside this item". `exit` and
 * `enter` are those two moves. Each lands in a group other than the one the
 * key was pressed in, so the roving stop that moves is the destination
 * group's own, and the group focus left keeps its stop for the way back.
 */

import { activeElementOf } from './group.js';
import type { BoundaryAction, Group, GroupReader } from './types.js';

// `Node.DOCUMENT_POSITION_FOLLOWING`, spelled out so reading it needs no
// global `Node`.
const FOLLOWING = 4;

/**
 * Where a boundary move lands, and the group it lands in, whose own roving
 * stop the move carries.
 */
type Crossing = { group: Group; to: Element };

/** A group's own items that a move can land on. */
const landings = (group: Group) => group.own.filter(group.isNavigable);

/**
 * Out of a nested root, to the group around it: the item of that group
 * containing the root, where the root sits inside one, else the nearest of
 * its items after the root in DOM order, else the nearest before it. Focus
 * already on that item — a root that is itself an item of the group around it
 * — has nowhere to go.
 */
const exit = (
  groups: GroupReader,
  root: Element,
  scope: Element,
): Crossing | null => {
  const group = groups.around(root, scope);

  if (!group) return null;

  const items = landings(group);
  const after = items.findIndex(
    (item) => root.compareDocumentPosition(item) & FOLLOWING,
  );
  const to =
    items.find((item) => item.contains(root)) ??
    items[after < 0 ? items.length - 1 : after];

  if (!to || activeElementOf(to) === to) return null;

  return { group, to };
};

/**
 * Into the first root nested in `item`, outermost first: to the item holding
 * that group's roving stop, where a move can land on it, so the group opens
 * where the user left it; else to its first item a move can land on.
 */
const enter = (groups: GroupReader, item: Element): Crossing | null => {
  const group = groups.inside(item);

  if (!group) return null;

  const items = landings(group);
  const to = items.find(group.holdsStop) ?? items[0];

  if (!to) return null;

  return { group, to };
};

/**
 * Where a boundary move goes from `group`, the group the key was pressed in,
 * or `null` where it has nowhere to go: `exit` from the listener's own group,
 * or with no item around it; `enter` with no item focused, or none nested in
 * it to land on. `scope` is the listener's element, past which no group is
 * keyrove's.
 */
export const crossBoundary = (
  intent: BoundaryAction,
  groups: GroupReader,
  group: Group,
  scope: Element,
): Crossing | null => {
  if (intent === 'exit') return exit(groups, group.root, scope);

  return group.focused ? enter(groups, group.focused) : null;
};
