/**
 * The roving tab stop, set up and kept whole across renders.
 *
 * keyrove moves an existing stop and never creates one, so a group rendered
 * from data needs its `0` placed once — and placed again whenever a render
 * replaces the item holding it. This is that one call, safe to make after
 * every render: it repairs the group rather than resetting it, so a stop the
 * user left somewhere valid stays there.
 */

import { itemsReader, rootTest, rovingTest, skipTest } from './config.js';
import { attributeRoot, ownItems, placeStop } from './group.js';
import type { RovingTabindexOptions } from './types.js';

/**
 * Gives a roving group exactly one tab stop, keeping the one it has where it
 * still can.
 *
 * The group's roving items are its own items, read as `keyRove` reads them —
 * the item attribute or `items`, `disabled` aside — that carry the stop:
 * the roving-tabindex attribute, or every item under `rovingTabindex: true`.
 * Items of a root nested inside are another group's, and are left alone.
 *
 * Of those, the stop goes to the first navigable one — neither skipped nor
 * disabled — that already has `tabindex="0"`, so a stop keyboard moves have
 * carried, or a template put on the selected item, survives the call. Failing
 * that, it goes to the first navigable item. Every other roving item gets
 * `-1`, disabled and skipped ones included. Only attributes that change are
 * written.
 * @param root - The group's root. Nullish is a no-op.
 * @param options - The group settings that decide what its items are; see
 * {@link RovingTabindexOptions}. The attributes answer where they are left out.
 * @returns The item holding the stop, or `null` when no roving item is
 * navigable.
 */
export const initRovingTabindex = (
  root: Element | null | undefined,
  options: RovingTabindexOptions = {},
): Element | null => {
  if (!root) return null;

  const isRoving = rovingTest(options);
  const isSkipped = skipTest(options);
  const items = ownItems(
    root,
    itemsReader(options),
    rootTest(options) ?? attributeRoot,
  ).filter(isRoving);
  const navigable = items.filter(
    (item) => !isSkipped(item) && !item.hasAttribute('disabled'),
  );
  const stop =
    navigable.find((item) => item.getAttribute('tabindex') === '0') ??
    navigable[0] ??
    null;

  placeStop(items, stop);

  return stop;
};
