/**
 * The shape of a benchmark run, from `runBench()` through the runner's JSON to
 * `results/recorded.json`. The UI reads it, and so can anything else that
 * wants the numbers — a docs page, say — without running anything.
 */

export type BenchOptions = {
  /** Timed batches per case. */
  samples: number;
  /** The least time one batch may take; the batch size doubles until it does. */
  minBatchMs: number;
  /** How long each case runs untimed before its batches. */
  warmupMs: number;
};

/** One generated page, as built for the cases that ran on it. */
export type Fixture = {
  name: string;
  groups: number;
  /** Set on the focus-key pages only. */
  focusKeys?: number;
  /** Set on the grid pages only: the `cols` value each group carries. */
  grid?: string;
  buildMs: number;
  /** Every element in the document once the page was built. */
  elements: number;
};

/** What one call returned: proof that a case measures what its label says. */
export type Outcome = 'unhandled' | 'consumed no-op' | 'moved' | '-';

export type BenchCase = {
  section: string;
  label: string;
  fixture: Fixture;
  result: Outcome;
  /** Per-call times, in microseconds. */
  median: number;
  p10: number;
  p90: number;
  /** Calls per timed batch. */
  batch: number;
};

/**
 * A case the library under test could not run as labelled, because it lacks
 * the feature the case times. Kept apart from `cases`, so every entry there
 * is a real measurement.
 */
export type SkippedCase = {
  section: string;
  label: string;
  fixture: string;
  reason: string;
};

/** The features some cases need, as found by trying them on the library. */
export type Supports = {
  /** The `focusKeys` option (2.4.0 on). */
  focusKeysMap: boolean;
  /** `cols="auto"`, columns read from the layout (2.5.0 on). */
  autoColumns: boolean;
};

export type BenchResults = {
  /** Absent from a run recorded before the field existed. */
  userAgent?: string;
  hardwareConcurrency?: number;
  crossOriginIsolated: boolean;
  options: BenchOptions;
  /** Absent from a run recorded before probing, which ran every case. */
  supports?: Supports;
  fixtures: Fixture[];
  cases: BenchCase[];
  skipped?: SkippedCase[];
};

/** Which keyrove a run measured. */
export type LibraryInfo = {
  /** `version` from the library's package.json in the measured source. */
  version: string;
  /** The git ref as given, when the source came from one. */
  ref?: string;
  /** Short commit hash of the measured source. */
  commit?: string;
  /** The working tree's library source had uncommitted changes. */
  dirty?: boolean;
};

/**
 * A run with where it ran: what `--json` writes, and what each file in
 * `results/` holds.
 */
export type BenchReport = {
  /** Display name to value, in display order. */
  environment: Record<string, string | number | boolean>;
  /** Absent from a run recorded before the field existed. */
  library?: LibraryInfo;
  results: BenchResults;
};

/** Reported after each case, and once as each page is built. */
export type BenchProgress = {
  completed: number;
  total: number;
  fixture: string;
  /** The case that just finished; `null` when a page has just been built. */
  last: BenchCase | null;
};

export type RunBench = (
  options?: Partial<BenchOptions> & {
    onProgress?: (progress: BenchProgress) => void;
    signal?: AbortSignal;
  },
) => Promise<BenchResults>;
