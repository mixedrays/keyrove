// A faked keydown would tie a button's move to whichever key the group
// binds, so `rove` skips the binding table.

import { readConfig } from './config.js';
import { readGroups, walkOn } from './group.js';
import { walkTargets } from './position.js';
import type { KeyRoveOptions, MoveResult, StrideAction } from './types.js';

// Entry with no position: forward moves from the start, backward from the
// end. A row end has no row to go by.
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
 * @param element - The group's root, or an element inside it. A shadow root
 * is a root with no attributes, as it is for a listener attached to one.
 * Nullish is a no-op.
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
  element: Element | ShadowRoot | null | undefined,
  action: StrideAction,
  options: KeyRoveOptions = {},
): MoveResult | null => {
  const group = readGroups(options).at(element as Element | null, element);

  if (!group) return null;

  const config = readConfig(group, options);

  if (config.layout.kind === 'list' && action.endsWith('Row')) return null;

  const { items: elements, focused } = group;
  const from = focused ?? group.stop;
  const intent = from ? action : ENTRY[action];

  if (!intent) return null;

  // An entry is `home` or `end`, which ignore the index.
  const fromIndex = from ? elements.indexOf(from) : 0;
  const { to: target, retarget } = walkOn(
    (isNavigable) =>
      walkTargets({
        intent,
        elements,
        fromIndex,
        layout: config.layout,
        pageLength: config.pageLength,
        isNavigable,
      }),
    group.isNavigable,
  );

  if (!target && !from) return null;

  return group.move({
    action,
    from,
    to: target,
    retarget,
    onMove: options.onMove,
  });
};
