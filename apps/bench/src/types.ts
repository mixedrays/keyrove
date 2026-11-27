export type BenchOptions = {
  /** Timed batches per case. */
  samples: number;
  /** The least time one batch may take; the batch size doubles until it does. */
  minBatchMs: number;
  /** How long each case runs untimed before its batches. */
  warmupMs: number;
};

export type Fixture = {
  name: string;
  groups: number;
  /** Set on the focus-key pages only. */
  focusKeys?: number;
  /** Set on the grid pages only: the `cols` value each group carries. */
  grid?: string;
  /**
   * Set where the groups do not hold 20 items each: the refused-focus pages,
   * whose one group holds its run of refusing items and the two around it.
   */
  items?: number;
  buildMs: number;
  /** Every element in the document once the page was built. */
  elements: number;
};

export type ColumnLayout = 'grid' | 'flex-wrap' | 'flex row' | 'flex column';

export type ColumnSpec = { layout: ColumnLayout; cols: string };

/**
 * `count` hidden items between the two the press moves between. `roving`
 * carries a stop onto each refusing item and back; `skip` means none is tried.
 */
export type RefusalSpec = {
  count: number;
  hidden: 'display: none' | 'visibility: hidden';
  roving?: boolean;
  skip?: boolean;
};

/** Proof that a case measures what its label says. */
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

/** Kept apart from `cases`, so every entry there is a real measurement. */
export type SkippedCase = {
  section: string;
  label: string;
  fixture: string;
  reason: string;
};

/** Found by trying each feature on the library. */
export type Supports = {
  /** The `focusKeys` option (2.4.0 on). */
  focusKeysMap: boolean;
  /** `cols="auto"`, columns read from the layout (2.5.0 on). */
  autoColumns: boolean;
  /**
   * A move walks on past an item that refuses focus (after 2.6.1). Absent
   * from a run recorded before the field existed.
   */
  refusedFocus?: boolean;
  /**
   * `cols="auto"` counts the items on the first line of a layout with no
   * grid tracks, such as `flex-wrap` (after 2.6.1). Absent from a run
   * recorded before the field existed.
   */
  wrapColumns?: boolean;
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
