/**
 * The intent → target layer: pure stride arithmetic over the item sequence.
 *
 * A group is one DOM-ordered sequence; `cols` folds it into rows. `next`/
 * `prev` step ±1 (flowing across row ends in a grid), the row intents step
 * ±`cols` staying in their column, pages step ±`pageLength` items or rows.
 * Reading direction never reaches this layer — it is a key concern, resolved
 * entirely in the binding table.
 */

import {
  findFirst,
  findGridNeighbor,
  findLast,
  findNext,
  findPageTarget,
  findPrev,
} from './utils.js';
import type { ResolveTargetArgs } from './types.js';

/**
 * Resolves the element an intent lands on, or `null`/`undefined` when there
 * is nowhere to go (a grid edge, an empty group).
 *
 * Entry is handled here: with `fromIndex: -1` a directional intent resolves
 * to the first navigable item — the last, for `prev` on a looping list. The
 * caller gates the non-entering intents before ever asking.
 */
export const resolveTarget = ({
  intent,
  elements,
  fromIndex,
  cols,
  pageLength,
  loop,
  skipAttribute,
}: ResolveTargetArgs): Element | null | undefined => {
  const isGrid = cols > 1;

  if (fromIndex < 0) {
    return intent === 'prev' && loop
      ? findLast(elements, skipAttribute)
      : findFirst(elements, skipAttribute);
  }

  const bounds = { elements, fromIndex, skipAttribute };

  switch (intent) {
    case 'next':
      return isGrid
        ? findGridNeighbor({ ...bounds, step: 1 })
        : findNext({ ...bounds, loop });
    case 'prev':
      return isGrid
        ? findGridNeighbor({ ...bounds, step: -1 })
        : findPrev({ ...bounds, loop });
    case 'nextRow':
      return findGridNeighbor({ ...bounds, step: cols });
    case 'prevRow':
      return findGridNeighbor({ ...bounds, step: -cols });
    case 'home':
      return findFirst(elements, skipAttribute);
    case 'end':
      return findLast(elements, skipAttribute);
    case 'homeRow':
    case 'endRow': {
      const rowStart = fromIndex - (fromIndex % cols);
      const row = elements.slice(rowStart, rowStart + cols);

      if (intent === 'endRow') row.reverse();

      return row.find((el) => !el.hasAttribute(skipAttribute)) ?? null;
    }
    case 'pageUp':
      return findPageTarget({
        ...bounds,
        direction: -1,
        stride: pageLength * (isGrid ? cols : 1),
      });
    case 'pageDown':
      return findPageTarget({
        ...bounds,
        direction: 1,
        stride: pageLength * (isGrid ? cols : 1),
      });
  }
};
