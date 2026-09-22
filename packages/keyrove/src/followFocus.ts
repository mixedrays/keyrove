/**
 * The roving tab stop, following focus however it arrives.
 *
 * keyrove carries the stop on the moves it makes. Focus also arrives by
 * pointer, by `element.focus()` from app code, and by Tab onto a control
 * inside an item that is not the stop, and each of those leaves the stop
 * behind, so Tab away and back returns somewhere else. A `focusin` listener
 * closes that gap. It keeps the `keyRove` call shape and reads the group the
 * way a keypress does, so one config object serves every handler.
 */

import { itemsReader, rootTest, rovingTest, skipTest } from './config.js';
import {
  attributeRoot,
  listenerElement,
  ownItems,
  placeStop,
  readGroup,
  resolveRoot,
} from './group.js';
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
  const isRoot = rootTest(options);
  const readItems = itemsReader(options);
  const scope = listenerElement(e.currentTarget);

  let from = e.target as Element | null;

  while (from) {
    const root = resolveRoot(from, e.currentTarget, isRoot);

    if (!root) return null;

    const { focused } = readGroup(root, readItems);

    if (focused) {
      const isRoving = rovingTest(options);

      if (!isRoving(focused) || skipTest(options)(focused)) return null;

      const items = ownItems(root, readItems, isRoot ?? attributeRoot).filter(
        isRoving,
      );

      if (!items.includes(focused)) return null;

      placeStop(items, focused);

      return focused;
    }

    // No item of this group holds focus. The group around it may, but never
    // one past the listener's reach.
    if (!scope || root === scope || !scope.contains(root)) return null;

    from = root.parentElement;
  }

  return null;
};
