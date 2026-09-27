/**
 * Reading a run: the helpers the UI and the Markdown report share. Nothing
 * here touches the DOM, so the same code can serve a page built elsewhere.
 */

import type {
  BenchCase,
  BenchOptions,
  BenchReport,
  BenchResults,
  LibraryInfo,
} from './types.ts';

/** A 60 Hz frame, in microseconds: the budget a keydown shares. */
export const FRAME_US = 1_000_000 / 60;

/** Section names in the order the run recorded them. */
export const sectionsOf = (results: BenchResults) => [
  ...new Set(results.cases.map((each) => each.section)),
];

/** A case is its page and its label; the same pair names it in any run. */
export const caseKey = (fixture: string, label: string) =>
  `${fixture}\u0000${label}`;

export const indexCases = (results: BenchResults) =>
  new Map(
    results.cases.map((each) => [caseKey(each.fixture.name, each.label), each]),
  );

export const findCase = (
  cases: Map<string, BenchCase>,
  fixture: string,
  label: string,
) => cases.get(caseKey(fixture, label));

/** What each section measures, in a sentence. */
export const SECTION_NOTES: Record<string, string> = {
  baseline:
    'The harness alone, building the event and calling nothing. The floor under every other number.',
  listener:
    'One press on pages of 200, 2,000 and 20,000 items, with the listener on the group (local) or on the document.',
  'focus keys':
    'An unbound key under a document listener on the L page, with 0 to 1,000 focus keys declared as attributes or passed as a map.',
  diagnostics: 'The two parts of the focus-key lookup, each timed on its own.',
  columns:
    'Arrow keys in four-column grids, with the column count fixed at 4 or read from the layout.',
};

/**
 * The numbers a reader wants first, all on the 20,000-item page under a
 * document listener: what the three kinds of key cost, and the costliest
 * realistic setup the README's conclusion rests on.
 */
export const HEADLINES = [
  {
    title: 'Unbound key',
    note: 'A key keyrove leaves alone',
    fixture: 'L',
    label: 'document, unbound',
  },
  {
    title: 'Bound key, no move',
    note: 'End on the last item',
    fixture: 'L',
    label: 'document, bound, no move',
  },
  {
    title: 'Key that moves focus',
    note: 'Includes the browser’s focus()',
    fixture: 'L',
    label: 'document, bound, moves focus',
  },
  {
    title: '100 focus keys',
    note: 'The costliest realistic case',
    fixture: 'L, 100 focus keys',
    label: '100 × attribute scan',
  },
] as const;

/** The units a time can be shown in. Reports always hold microseconds. */
export type TimeUnit = 'µs' | 'ms';

export const TIME_UNITS: TimeUnit[] = ['µs', 'ms'];

const PER_MICROSECOND: Record<TimeUnit, number> = { µs: 1, ms: 1e-3 };

/**
 * Table precision: two places in microseconds, as the README's tables print
 * them, and the same resolution in milliseconds, five places, so switching
 * the unit never rounds a difference away.
 */
const PLACES: Record<TimeUnit, number> = { µs: 2, ms: 5 };

export const formatTime = (micros: number, unit: TimeUnit = 'µs') =>
  (micros * PER_MICROSECOND[unit]).toFixed(PLACES[unit]);

/** Display precision: three significant figures, never an exponent. */
export const formatTimeShort = (micros: number, unit: TimeUnit = 'µs') => {
  const value = micros * PER_MICROSECOND[unit];
  if (value === 0) return '0';
  const magnitude = Math.floor(Math.log10(Math.abs(value)));

  return value.toFixed(Math.max(0, 2 - magnitude));
};

/** A 60 Hz frame in `unit`: the scale a keydown's cost is read against. */
export const formatFrame = (unit: TimeUnit) =>
  unit === 'µs'
    ? `${formatCount(Math.round(FRAME_US))} µs`
    : `${(FRAME_US / 1000).toFixed(1)} ms`;

export const formatCount = (value: number) => value.toLocaleString('en-US');

/** A share of a 60 Hz frame, to as many places as it takes to show. */
export const formatFrameShare = (micros: number) => {
  const percent = (micros / FRAME_US) * 100;
  const places = percent >= 1 ? 1 : percent >= 0.1 ? 2 : 3;

  return `${percent.toFixed(places)}%`;
};

/**
 * Below this, a ratio says more about rounding than about the code: the
 * recorded medians carry two decimal places, which at 0.01 µs is ±50%.
 */
const MIN_RATIO_US = 0.1;

/** How many times the reference this run took: above 1 is slower. */
export const ratio = (value: number, reference: number) =>
  reference >= MIN_RATIO_US && value >= MIN_RATIO_US ? value / reference : null;

/** A ratio as a signed change: 1.12 is `+12%`, 0.97 is `−3%`. */
export const formatChange = (value: number | null) => {
  if (value === null) return '–';
  const percent = Math.round((value - 1) * 100);

  return percent === 0
    ? '0%'
    : `${percent > 0 ? '+' : '−'}${Math.abs(percent)}%`;
};

export type Change = {
  /** `other` over `base`; `null` where either is below the noise floor. */
  ratio: number | null;
  /**
   * Set only where the two p10–p90 ranges do not overlap, so run-to-run
   * noise is never called a change.
   */
  direction: 'faster' | 'slower' | null;
};

export const compareCases = (base: BenchCase, other: BenchCase): Change => {
  const value = ratio(other.median, base.median);
  if (value === null) return { ratio: null, direction: null };

  return {
    ratio: value,
    direction:
      other.p10 > base.p90 ? 'slower' : other.p90 < base.p10 ? 'faster' : null,
  };
};

/**
 * One run against another over every case both measured: the geometric
 * mean of their ratios, which weighs a 2 µs case and a 500 µs case alike,
 * and how many cases moved beyond noise either way.
 */
export const summarize = (base: BenchResults, other: BenchResults) => {
  const others = indexCases(other);
  let logSum = 0;
  let compared = 0;
  let faster = 0;
  let slower = 0;

  for (const each of base.cases) {
    const match = others.get(caseKey(each.fixture.name, each.label));
    if (!match) continue;
    const change = compareCases(each, match);
    if (change.ratio === null) continue;
    logSum += Math.log(change.ratio);
    compared++;
    if (change.direction === 'faster') faster++;
    if (change.direction === 'slower') slower++;
  }

  return {
    geomean: compared ? Math.exp(logSum / compared) : null,
    compared,
    faster,
    slower,
  };
};

export type CaseRow = { section: string; fixture: string; label: string };

/**
 * Every case any of `runs` measured or skipped, once, by section. The run
 * with the most cases sets the order; one another run has beyond it follows
 * in its section.
 */
export const caseRows = (runs: BenchResults[]): CaseRow[] => {
  const rows = new Map<string, CaseRow>();
  const fullestFirst = [...runs].sort(
    (a, b) => b.cases.length - a.cases.length,
  );

  for (const run of fullestFirst) {
    const entries = [
      ...run.cases.map(({ section, fixture, label }) => ({
        section,
        fixture: fixture.name,
        label,
      })),
      ...(run.skipped ?? []),
    ];
    for (const { section, fixture, label } of entries) {
      const key = caseKey(fixture, label);
      if (!rows.has(key)) rows.set(key, { section, fixture, label });
    }
  }

  const all = [...rows.values()];
  return [...new Set(all.map((row) => row.section))].flatMap((section) =>
    all.filter((row) => row.section === section),
  );
};

/** Why a run did not measure a case it knows of, if it skipped it. */
export const skipReason = (run: BenchResults, fixture: string, label: string) =>
  run.skipped?.find((each) => each.fixture === fixture && each.label === label)
    ?.reason;

/** Browser and major version, whichever way a report spells its browser. */
export const browserMajor = (browser: string) => {
  const match = browser.match(/(Chrome|Firefox|Safari|Edge|Opera)\D*?(\d+)/);
  return match ? `${match[1]} ${match[2]}` : browser;
};

/** `2.10.0` after `2.9.1`; anything that is not a version sorts after. */
export const compareVersions = (a?: string, b?: string) => {
  const parse = (value?: string) =>
    value
      ?.match(/^(\d+)\.(\d+)\.(\d+)/)
      ?.slice(1)
      .map(Number) ?? null;
  const [left, right] = [parse(a), parse(b)];
  if (!left || !right) return left ? -1 : right ? 1 : 0;

  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
};

/**
 * Reports in the order a comparison reads best: those built from a git ref
 * by version, oldest first, then the rest (the working tree, the browser)
 * by date.
 */
export const sortReports = <T extends { name: string; report: BenchReport }>(
  entries: T[],
) =>
  [...entries].sort(
    (a, b) =>
      compareVersions(
        a.report.library?.ref && a.report.library.version,
        b.report.library?.ref && b.report.library.version,
      ) ||
      String(a.report.environment.Date).localeCompare(
        String(b.report.environment.Date),
      ) ||
      a.name.localeCompare(b.name, 'en', { numeric: true }),
  );

export const timingLine = ({ warmupMs, samples, minBatchMs }: BenchOptions) =>
  `${warmupMs} ms warmup, then ${samples} batches of ≥ ${minBatchMs} ms per case`;

/** Browser tokens, most specific first: Edge and Opera also say Chrome. */
const BROWSERS: [RegExp, string][] = [
  [/Edg\/([\d.]+)/, 'Edge'],
  [/OPR\/([\d.]+)/, 'Opera'],
  [/Firefox\/([\d.]+)/, 'Firefox'],
  [/HeadlessChrome\/([\d.]+)/, 'Chrome (headless)'],
  [/Chrome\/([\d.]+)/, 'Chrome'],
  [/Version\/([\d.]+).*Safari/, 'Safari'],
];

/** `Chrome 153.0.8010.53` out of a user agent string; the string if unknown. */
export const browserName = (userAgent: string) => {
  for (const [pattern, name] of BROWSERS) {
    const match = userAgent.match(pattern);
    // Chromium's reduced user agent pads its version with zeros: 153.0.0.0.
    if (match) return `${name} ${match[1].replace(/(\.0)+$/, '')}`;
  }

  return userAgent;
};

/** Which keyrove a run measured, in one line. */
export const describeLibrary = ({
  version,
  ref,
  commit,
  dirty,
}: LibraryInfo) =>
  ref
    ? `${version} (${ref}, ${commit})`
    : commit
      ? `${version} (working tree at ${commit}${dirty ? ', with uncommitted changes' : ''})`
      : version;

/**
 * Where a browser run ran, as far as a page can tell. The headless runner
 * knows more — the OS release, the CPU model — and records it itself.
 */
export const browserEnvironment = (
  results: BenchResults,
  {
    platform,
    date,
    library,
  }: { platform: string; date: Date; library: LibraryInfo },
): Record<string, string | number | boolean> => ({
  Library: describeLibrary(library),
  Browser: browserName(results.userAgent ?? ''),
  Platform: platform,
  'CPU cores': results.hardwareConcurrency ?? 'unknown',
  'Cross-origin isolated': results.crossOriginIsolated,
  Timing: timingLine(results.options),
  Date: date.toISOString().slice(0, 10),
});
