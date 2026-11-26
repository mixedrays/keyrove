// Pure stride arithmetic. Reading direction never reaches this layer; the
// binding table resolves it.

import type { ResolveTargetArgs } from './types.js';

// Tests each item only when reached, so a test that grows stricter mid-walk
// is honoured.
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
 * Yields the move's destination, then fallbacks for when it refuses focus.
 * Returns `null` for a move stopped at an edge, `undefined` for one that
 * goes by the group's ends and found none.
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
  const first = () => walk(0, 1);
  const last = () => walk(lastIndex, -1);

  if (fromIndex < 0) return yield* intent === 'prev' && loop ? last() : first();

  switch (intent) {
    // A grid never wraps, per the APG grid pattern.
    case 'next':
      yield* walk(fromIndex + 1, 1);
      return kind === 'grid' ? null : yield* loop ? first() : last();
    case 'prev':
      yield* walk(fromIndex - 1, -1);
      return kind === 'grid' ? null : yield* loop ? last() : first();
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
      // A row of only skipped cells is a no-op, even if other rows have cells.
      const rowStart = fromIndex - (fromIndex % cols);
      const row = elements.slice(rowStart, rowStart + cols);

      yield* intent === 'homeRow'
        ? walk(0, 1, row)
        : walk(row.length - 1, -1, row);
      return null;
    }
    // A page jump travels as far as possible: overshooting clamps to the end.
    case 'pageUp':
    case 'pageDown': {
      const direction = intent === 'pageUp' ? -1 : 1;
      const landing = fromIndex + pageLength * cols * direction;

      if (landing >= 0 && landing <= lastIndex) yield* walk(landing, direction);
      return yield* direction < 0 ? first() : last();
    }
  }
}
