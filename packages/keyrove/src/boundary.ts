// No stride leaves a nested root or goes inside an item; `exit` and `enter`
// do. The destination group's own stop moves; the one left keeps its stop.

import { activeElementOf } from './group.js';
import type { BoundaryAction, Group, GroupReader } from './types.js';

// `Node.DOCUMENT_POSITION_FOLLOWING`, spelled out so reading it needs no
// global `Node`.
const FOLLOWING = 4;

type Crossing = { group: Group; to: Element };

const landings = (group: Group) => group.own.filter(group.isNavigable);

// To the outer item containing the root, else the nearest after it, else the
// nearest before. A root that is itself the outer item has nowhere to go.
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

// Lands on the inner group's stop, so it opens where the user left it.
const enter = (groups: GroupReader, item: Element): Crossing | null => {
  const group = groups.inside(item);

  if (!group) return null;

  const items = landings(group);
  const to = items.find(group.holdsStop) ?? items[0];

  if (!to) return null;

  return { group, to };
};

/** `scope` is the listener's element, past which no group is keyrove's. */
export const crossBoundary = (
  intent: BoundaryAction,
  groups: GroupReader,
  group: Group,
  scope: Element,
): Crossing | null => {
  if (intent === 'exit') return exit(groups, group.root, scope);

  return group.focused ? enter(groups, group.focused) : null;
};
