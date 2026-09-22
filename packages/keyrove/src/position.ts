/**
 * The intent → target layer: pure stride arithmetic over the item sequence.
 *
 * A group is one DOM-ordered sequence; the layout's `cols` folds it into rows.
 * `next`/`prev` step ±1 (flowing across row ends in a grid), the row intents
 * step ±`cols` staying in their column, pages step ±`pageLength` rows — a list
 * being one column, that is ±`pageLength` items there. Reading direction never
 * reaches this layer — it is a key concern, resolved entirely in the binding
 * table.
 */

import { KEYROVE_ATTR_SKIP } from './attributes.js';
import { hasEnabledAttribute } from './utils.js';
import type { IsSkipped, ResolveTargetArgs } from './types.js';

/**
 * Which items a move passes over, where the caller names no other test. The
 * config layer hands it back down where an options object leaves `skip`
 * unnamed.
 */
export const attributeSkip: IsSkipped = (element) =>
  hasEnabledAttribute(element, KEYROVE_ATTR_SKIP);

/**
 * Binds a skip test into the walk every move is made of: the first element
 * `isSkipped` leaves alone, from index `i` in steps of `step`; `undefined`
 * once the walk leaves either end. The moves differ by where they start, by
 * what they stride, and by the fallback when the walk comes back empty — never
 * by which items they pass over, so that test is bound once per resolution.
 */
const scanner =
  (isSkipped: IsSkipped) =>
  (elements: Element[], i: number, step: number): Element | undefined => {
    for (; i >= 0 && i < elements.length; i += step) {
      if (!isSkipped(elements[i])) {
        return elements[i];
      }
    }
  };

/**
 * Resolves the element an intent lands on, or `null`/`undefined` when there
 * is nowhere to go (a grid edge, an empty group).
 *
 * Entry is handled here: with `fromIndex: -1` a directional intent resolves
 * to the first navigable item — the last, for `prev` on a looping list. The
 * caller gates the bindings that do not enter before ever asking.
 */
export const resolveTarget = ({
  intent,
  elements,
  fromIndex,
  layout: { kind, cols, loop },
  pageLength,
  isSkipped = attributeSkip,
}: ResolveTargetArgs): Element | null | undefined => {
  const scan = scanner(isSkipped);
  const lastIndex = elements.length - 1;
  // The group's ends: its first and last navigable items. When every item is
  // skipped there are none, and a move that goes by the ends lands nowhere —
  // a skipped item is never a destination, whichever move is asking.
  const first = () => scan(elements, 0, 1);
  const last = () => scan(elements, lastIndex, -1);

  if (fromIndex < 0) return intent === 'prev' && loop ? last() : first();

  switch (intent) {
    // Past its end a list clamps, or wraps when it loops; a grid stops at its
    // edge and never wraps, per the APG grid pattern.
    case 'next':
      return (
        scan(elements, fromIndex + 1, 1) ||
        (kind === 'grid' ? null : loop ? first() : last())
      );
    case 'prev':
      return (
        scan(elements, fromIndex - 1, -1) ||
        (kind === 'grid' ? null : loop ? last() : first())
      );
    // A row move keeps its column, stepping a further row over a skipped cell.
    case 'nextRow':
      return scan(elements, fromIndex + cols, cols) || null;
    case 'prevRow':
      return scan(elements, fromIndex - cols, -cols) || null;
    case 'home':
      return first();
    case 'end':
      return last();
    case 'homeRow':
    case 'endRow': {
      // A row end goes by its own row alone: a row of nothing but skipped
      // cells is a consumed no-op, even where other rows have cells to land on.
      const rowStart = fromIndex - (fromIndex % cols);
      const row = elements.slice(rowStart, rowStart + cols);

      return (
        (intent === 'homeRow'
          ? scan(row, 0, 1)
          : scan(row, row.length - 1, -1)) || null
      );
    }
    // A page jump is a request to travel as far as possible: overshooting an
    // end, or finding only skipped items from where it lands onward, clamps to
    // that end rather than doing nothing.
    case 'pageUp':
    case 'pageDown': {
      const direction = intent === 'pageUp' ? -1 : 1;
      const landing = fromIndex + pageLength * cols * direction;

      return (
        (landing >= 0 &&
          landing <= lastIndex &&
          scan(elements, landing, direction)) ||
        (direction < 0 ? first() : last())
      );
    }
  }
};
