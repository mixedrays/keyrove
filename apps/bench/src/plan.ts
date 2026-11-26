import type { BenchOptions, ColumnSpec, RefusalSpec } from './types.ts';

// Apart from `keydown.ts` so the UI can read it without loading the code
// under test.

export const ITEMS_PER_GROUP = 20;

export const SIZES: [name: string, groups: number][] = [
  ['S', 10],
  ['M', 100],
  ['L', 1000],
];

export const FOCUS_KEY_COUNTS = [0, 10, 100, 1000];

// Flex layouts have no tracks, so `auto` counts their first line: four in
// `flex-wrap`, all 20 in `flex row`, one in `flex column`.
export const COLUMNS: ColumnSpec[] = [
  { layout: 'grid', cols: '4' },
  { layout: 'grid', cols: 'auto' },
  { layout: 'flex-wrap', cols: '4' },
  { layout: 'flex-wrap', cols: 'auto' },
  { layout: 'flex row', cols: 'auto' },
  { layout: 'flex column', cols: '1' },
  { layout: 'flex column', cols: 'auto' },
];

export const COLUMN_KEYS = ['unbound', 'bound, moves focus'] as const;
export const LAYOUT_STATES = ['', ', layout dirtied'] as const;

// The last is the same run marked skipped, which is never tried.
export const REFUSALS: RefusalSpec[] = [
  { count: 1, hidden: 'display: none' },
  { count: 10, hidden: 'display: none' },
  { count: 100, hidden: 'display: none' },
  { count: 1000, hidden: 'display: none' },
  { count: 1000, hidden: 'visibility: hidden' },
  { count: 1000, hidden: 'display: none', roving: true },
  { count: 1000, hidden: 'display: none', skip: true },
];

export const DEFAULT_OPTIONS: BenchOptions = {
  samples: 15,
  minBatchMs: 10,
  warmupMs: 100,
};

// Keep in step with the loops in `runBench`.
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
  // columns: each key on a clean and a dirtied layout, and the dirtied
  // layout read with no handler, per page.
  COLUMNS.length * (COLUMN_KEYS.length * LAYOUT_STATES.length + 1) +
  // refused focus: a move past the run, per page.
  REFUSALS.length;
