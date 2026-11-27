// Focus by pointer, `element.focus()` or Tab onto an inner control leaves the
// stop behind, so Tab away and back would return somewhere else.

import { readGroups } from './group.js';
import { listenerElement } from './nesting.js';
import type { KeyRoveEvent, RovingTabindexOptions } from './types.js';

/**
 * Moves the roving tab stop to the item focus landed in. Attach it to
 * `focusin`, beside `keyRove` on `keydown`.
 *
 * The item is found the way a keypress finds its position: the nearest root
 * above the target, and the item of its group holding focus, the outermost
 * where items nest. Where that root has none — focus on a panel that is itself
 * a root and an item of the group around it, or on a control of a nested root
 * inside an outer item — the group around it is asked next, as far as the
 * listener's element.
 *
 * The item takes the stop when it carries it and is not skipped; every other
 * roving item of its group gets `-1`. A nested group's stop is its own and is
 * never touched. Only attributes that change are written, so the `focusin`
 * that follows one of keyRove's own moves, which has already carried the stop,
 * writes nothing.
 * @param e - The focusin event, native or framework-synthetic.
 * @param options - The group settings that decide what its items are; see
 * {@link RovingTabindexOptions}. The attributes answer where they are left out.
 * @returns The item now holding the stop, or `null` when focus is in no item
 * that carries one.
 */
export const followFocus = (
  e: Pick<KeyRoveEvent, 'target' | 'currentTarget'>,
  options: RovingTabindexOptions = {},
): Element | null => {
  const groups = readGroups(options);
  const scope = listenerElement(e.currentTarget);

  let group = groups.at(e.target as Element | null, e.currentTarget);

  while (group) {
    const { root, focused } = group;

    if (focused) {
      if (!group.isNavigable(focused) || !group.roving.includes(focused)) {
        return null;
      }

      group.placeStop(focused);

      return focused;
    }

    group = scope && groups.around(root, scope);
  }

  return null;
};
