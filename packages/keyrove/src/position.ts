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

import type { ResolveTargetArgs } from './types.js';

/**
 * The walk every move is made of: each element `isNavigable` accepts, from
 * index `i` in steps of `step`, until the walk leaves either end. An item is
 * tested only as the walk reaches it, so a test that turns down more items as
 * the walk goes on is read afresh at every step.
 */
function* scan(
  elements: Element[],
  i: number,
  step: number,
  isNavigable: ResolveTargetArgs['isNavigable'],
): Generator<Element, undefined> {
  for (; i >= 0 && i < elements.length; i += step) {
    if (isNavigable(elements[i])) yield elements[i];
  }
}

/**
 * Every element an intent can land on, in the order the move tries them: the
 * stride's own walk first, then its fallback once that walk comes back empty
 * — the clamp or the wrap past a list's end, the clamp after a page jump.
 * The moves differ by where they start, by what they stride, and by that
 * fallback — never by which items they can land on, which is `isNavigable`'s
 * to say.
 *
 * The first element is the move's destination. The rest are where it goes
 * instead when that one turns out not to take focus: a test that turns down
 * every item refused so far turns down every item the walk has passed too, so
 * carrying the walk on lands where resolving the move again would, at one
 * pass over the items rather than one pass per refusal. Once done it returns
 * what the move resolves to when there is nowhere to go: `null` for a move
 * that stops at an edge (a grid's, or a row's), `undefined` for one that goes
 * by the group's ends and found none.
 *
 * Entry is handled here: with `fromIndex: -1` a directional intent starts at
 * the first navigable item — the last, for `prev` on a looping list. The
 * caller gates the bindings that do not enter before ever asking.
 */
export function* walkTargets({
  intent,
  elements,
  fromIndex,
  layout: { kind, cols, loop },
  pageLength,
  isNavigable,
}: ResolveTargetArgs): Generator<Element, null | undefined> {
  const lastIndex = elements.length - 1;
  const walk = (i: number, step: number, sequence = elements) =>
    scan(sequence, i, step, isNavigable);
  // The group's ends: its first and last navigable items, and on from there.
  // When every item is skipped there are none, and a move that goes by the
  // ends lands nowhere — a skipped item is never a destination, whichever
  // move is asking.
  const first = () => walk(0, 1);
  const last = () => walk(lastIndex, -1);

  if (fromIndex < 0) return yield* intent === 'prev' && loop ? last() : first();

  switch (intent) {
    // Past its end a list clamps, or wraps when it loops; a grid stops at its
    // edge and never wraps, per the APG grid pattern.
    case 'next':
      yield* walk(fromIndex + 1, 1);
      return kind === 'grid' ? null : yield* loop ? first() : last();
    case 'prev':
      yield* walk(fromIndex - 1, -1);
      return kind === 'grid' ? null : yield* loop ? last() : first();
    // A row move keeps its column, stepping a further row over a skipped cell.
    case 'nextRow':
      yield* walk(fromIndex + cols, cols);
      return null;
    case 'prevRow':
      yield* walk(fromIndex - cols, -cols);
      return null;
    case 'home':
      return yield* first();
    case 'end':
      return yield* last();
    case 'homeRow':
    case 'endRow': {
      // A row end goes by its own row alone: a row of nothing but skipped
      // cells is a consumed no-op, even where other rows have cells to land on.
      const rowStart = fromIndex - (fromIndex % cols);
      const row = elements.slice(rowStart, rowStart + cols);

      yield* intent === 'homeRow'
        ? walk(0, 1, row)
        : walk(row.length - 1, -1, row);
      return null;
    }
    // A page jump is a request to travel as far as possible: overshooting an
    // end, or finding only skipped items from where it lands onward, clamps to
    // that end rather than doing nothing.
    case 'pageUp':
    case 'pageDown': {
      const direction = intent === 'pageUp' ? -1 : 1;
      const landing = fromIndex + pageLength * cols * direction;

      if (landing >= 0 && landing <= lastIndex) yield* walk(landing, direction);
      return yield* direction < 0 ? first() : last();
    }
  }
}
