/**
 * A move made from code rather than from a key.
 *
 * On-screen buttons, gamepads, remotes and voice ask for a move by name —
 * "next", "end" — and a faked keydown would tie that to whichever key the
 * group has bound. `rove` names the move outright and skips the binding table;
 * from there on it runs the layers a keypress runs, so the group's items,
 * skips, layout and roving stop apply exactly as they do for keys.
 */

import { readConfig, rootTest } from './config.js';
import {
  attributeRoot,
  moveFocus,
  ownItems,
  readGroup,
  resolveRoot,
} from './group.js';
import { resolveTarget } from './position.js';
import type { MoveResult, Options, StrideAction } from './types.js';

// Where each move enters a group it has no position in: a forward move at the
// first item, as if from before it, and a backward one at the last, as if
// from past it. A row end has no row to go by.
const ENTRY: Record<StrideAction, 'home' | 'end' | null> = {
  home: 'home',
  next: 'home',
  nextRow: 'home',
  pageDown: 'home',
  end: 'end',
  prev: 'end',
  prevRow: 'end',
  pageUp: 'end',
  homeRow: null,
  endRow: null,
};

/**
 * Makes a move in a group, as its key would, without a keypress.
 *
 * The group is found the way a keypress finds it, with `element` as both the
 * target and the listener: the nearest root at or above it, else `element`
 * itself. The move goes from the item holding focus, as a key's does. With
 * focus elsewhere — on the button that asked for the move, as often as not —
 * a roving group still has a position: the item holding its tab stop, where
 * the user left off. Failing both, the move enters the group: `home`, `next`,
 * `nextRow` and `pageDown` at the first navigable item, `end`, `prev`,
 * `prevRow` and `pageUp` at the last, and `homeRow` and `endRow`, which have
 * no row to go by, not at all.
 *
 * The row moves are a grid's own, as they are in the key table, so in a list
 * they do nothing.
 * @param element - The group's root, or an element inside it. Nullish is a
 * no-op.
 * @param action - The move to make, by name. Whatever keys the group binds
 * have no say in it.
 * @param options - The object `keyRove` takes: the group's settings, falling
 * back to its attributes, and `onMove`. The keys and focus keys are about
 * keypresses, and are not read.
 * @returns `null` when there is no move to make: no group, no position to go
 * from and none to enter at, or a row move in a list. Otherwise what a
 * keypress returns: `{ action, from, to }`, with `to: null` where the move has
 * nowhere to go from `from`, and `from: null` where it entered the group.
 */
export const rove = (
  element: Element | null | undefined,
  action: StrideAction,
  options: Options = {},
): MoveResult | null => {
  const isRoot = rootTest(options);
  const root = resolveRoot(element, element, isRoot);

  if (!root) return null;

  const config = readConfig(root, options);

  if (config.layout.kind === 'list' && action.endsWith('Row')) return null;

  const { items: elements, focused } = readGroup(root, config.readItems);
  const from =
    focused ??
    ownItems(root, config.readItems, isRoot ?? attributeRoot).find(
      (item) =>
        config.isRoving(item) &&
        item.getAttribute('tabindex') === '0' &&
        elements.includes(item),
    ) ??
    null;
  const intent = from ? action : ENTRY[action];

  if (!intent) return null;

  const target = resolveTarget({
    intent,
    elements,
    // An entry is `home` or `end`, which go by the group's ends, not by an
    // index.
    fromIndex: from ? elements.indexOf(from) : 0,
    layout: config.layout,
    pageLength: config.pageLength,
    isSkipped: config.isSkipped,
  });

  if (!target && !from) return null;

  return moveFocus({
    action,
    from,
    to: target,
    isRoving: config.isRoving,
    onMove: options.onMove,
  });
};
