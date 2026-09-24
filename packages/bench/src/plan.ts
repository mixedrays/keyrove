import type { BenchOptions } from './types.ts';

/**
 * What a run covers: the pages it builds and the settings it times with.
 * Apart from `keydown.ts` so the UI can read it without loading the code
 * under test.
 */

export const ITEMS_PER_GROUP = 20;

export const SIZES: [name: string, groups: number][] = [
  ['S', 10],
  ['M', 100],
  ['L', 1000],
];

export const FOCUS_KEY_COUNTS = [0, 10, 100, 1000];

export const GRIDS = ['4', 'auto'];

export const DEFAULT_OPTIONS: BenchOptions = {
  samples: 15,
  minBatchMs: 10,
  warmupMs: 100,
};

/**
 * How many cases a run records, section by section, for the progress it
 * reports. Keep it in step with the loops in `runBench`.
 */
export const CASE_COUNT =
  // baseline: once, on the small page.
  1 +
  // listener: two listener placements × three keys, per size.
  SIZES.length * 2 * 3 +
  // focus keys: three lookups per count, and the local listener at the top.
  FOCUS_KEY_COUNTS.length * 3 +
  1 +
  // diagnostics: two parts of the lookup, per count.
  FOCUS_KEY_COUNTS.length * 2 +
  // columns: the unbound key and a move, per grid.
  GRIDS.length * 2;
