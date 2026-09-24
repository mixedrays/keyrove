/**
 * The results, as HTML strings: one report on its own, or several side by
 * side against a baseline. Nothing here reads or writes the page, so the
 * same markup can be built wherever the stylesheet is.
 */

import { icon } from './icons.ts';
import { DEFAULT_OPTIONS, ITEMS_PER_GROUP } from './plan.ts';
import {
  browserMajor,
  caseRows,
  compareCases,
  findCase,
  formatChange,
  formatCount,
  formatFrameShare,
  formatFrame,
  formatTime,
  formatTimeShort,
  HEADLINES,
  indexCases,
  SECTION_NOTES,
  sectionsOf,
  skipReason,
  summarize,
  timingLine,
  type CaseRow,
  type TimeUnit,
} from './results.ts';
import type { BenchCase, BenchReport, BenchResults } from './types.ts';

/** One report the page can show: a file in `results/`, or a run made here. */
export type Entry = {
  id: string;
  name: string;
  report: BenchReport;
  /** A run made here: the tab went to the background at some point. */
  wasHidden?: boolean;
};

export type View = {
  /** One line on where the numbers came from, as text. */
  source: string;
  notices: string[];
  body: string;
  /** `null` where the view has no fixtures to list. */
  fixtures: string | null;
  environment: string;
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

const displayValue = (value: string | number | boolean) =>
  typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);

/** A report's library, short: the version, and its commit or the tree. */
const libraryShort = ({ report }: Entry) => {
  const library = report.library;
  if (!library) return '–';
  if (library.ref) return `${library.version} · ${library.commit}`;
  return `${library.version}, working tree${library.dirty ? ' with edits' : ''}`;
};

const browserShort = ({ report }: Entry) => {
  const browser = String(report.environment.Browser ?? '');
  return `${browserMajor(browser)}${/headless/i.test(browser) ? ' headless' : ''}`;
};

/** Groups rows of one page under a single name, as the tables here do. */
const fixtureCell = (rows: { fixture: string }[], index: number) => {
  const { fixture } = rows[index];
  const first = index === 0 || rows[index - 1].fixture !== fixture;

  // A repeated page name stays in the cell for a screen reader, which reads
  // a row on its own, and is hidden from sight, where the fainter rules
  // inside a page's rows do the grouping.
  return `<td class="fixture-cell">${first ? escapeHtml(fixture) : `<span class="sr-only">${escapeHtml(fixture)}</span>`}</td>`;
};

const rowClass = (rows: { fixture: string }[], index: number) =>
  rows[index + 1]?.fixture === rows[index].fixture
    ? ' class="group-continues"'
    : '';

const sectionHeading = (section: string, note: string) => {
  const id = `section-${section.replace(/\W+/g, '-')}`;
  return {
    id,
    html: `<h3 id="${id}" class="result-heading">${escapeHtml(capitalize(section))}</h3>
      <p class="result-note">${escapeHtml(note)}</p>`,
  };
};

const environmentList = (report: BenchReport) =>
  `<dl class="env-list">${Object.entries(report.environment)
    .map(
      ([term, value]) =>
        `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(displayValue(value))}</dd></div>`,
    )
    .join('')}</dl>`;

/* ---------- one report ---------- */

/**
 * Below a microsecond the spread is the timer's own noise; a floor on the
 * scale keeps the baseline's 0.00–0.01 from filling its bar.
 */
const MIN_SCALE_US = 1;

/** Where `value` falls on a 0–`max` scale, as a CSS percentage. */
const at = (value: number, max: number) =>
  `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`;

/**
 * An axis end, which is a round number more often than a measured one: the
 * trailing zeros a value keeps to show its precision say nothing here.
 */
const scaleLabel = (max: number, unit: TimeUnit) =>
  `${formatTimeShort(max, unit)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')} ${unit}`;

const renderBar = (each: BenchCase, max: number) => {
  // A nonzero bar keeps a sliver, so the smallest cases still register
  // beside the largest; a true zero draws nothing.
  const width = each.median > 0 ? `max(2px, ${at(each.median, max)})` : '0px';

  return `<div class="bar">
    <span class="bar-fill" style="width: ${width}"></span>
    <span class="bar-range" style="left: ${at(each.p10, max)}; right: calc(100% - ${at(each.p90, max)})"></span>
  </div>`;
};

const renderSection = (section: string, cases: BenchCase[], unit: TimeUnit) => {
  const max = Math.max(MIN_SCALE_US, ...cases.map((each) => each.p90));
  const rows = cases.map((each) => ({ fixture: each.fixture.name }));
  const heading = sectionHeading(section, SECTION_NOTES[section] ?? '');

  // The median leads, with its spread beside it; the result check and the
  // batch size are there to be looked up.
  const body = cases.map(
    (each, index) => `<tr${rowClass(rows, index)}>
      ${fixtureCell(rows, index)}
      <td class="case-cell">${escapeHtml(each.label)}</td>
      <td class="num strong">${formatTime(each.median, unit)}</td>
      <td class="bar-cell" aria-hidden="true">${renderBar(each, max)}</td>
      <td class="num">${formatTime(each.p10, unit)}–${formatTime(each.p90, unit)}</td>
      <td><span class="pill">${escapeHtml(each.result)}</span></td>
      <td class="num">${formatCount(each.batch)}</td>
    </tr>`,
  );

  return `<section class="result-section" aria-labelledby="${heading.id}">
    ${heading.html}
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Fixture</th>
            <th scope="col">Case</th>
            <th scope="col" class="num">Median (${unit})</th>
            <th scope="col" class="bar-cell" aria-hidden="true">
              <span class="scale"><span>0</span><span>${scaleLabel(max, unit)}</span></span>
            </th>
            <th scope="col" class="num">p10–p90 (${unit})</th>
            <th scope="col">Result</th>
            <th scope="col" class="num">Batch (calls)</th>
          </tr>
        </thead>
        <tbody>${body.join('')}</tbody>
      </table>
    </div>
  </section>`;
};

const renderNotRun = (results: BenchResults) => {
  const skipped = results.skipped ?? [];
  if (!skipped.length) return '';
  const heading = sectionHeading(
    'not run',
    'Cases this version could not run as labelled, because it lacks the feature they time.',
  );

  return `<section class="result-section" aria-labelledby="${heading.id}">
    ${heading.html}
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th scope="col">Fixture</th><th scope="col">Case</th><th scope="col">Why</th></tr>
        </thead>
        <tbody>${skipped
          .map(
            (each, index) => `<tr${rowClass(skipped, index)}>
              ${fixtureCell(skipped, index)}
              <td class="case-cell">${escapeHtml(each.label)}</td>
              <td>${escapeHtml(capitalize(each.reason))}.</td>
            </tr>`,
          )
          .join('')}</tbody>
      </table>
    </div>
  </section>`;
};

const renderHeadlines = (results: BenchResults, unit: TimeUnit) => {
  const cases = indexCases(results);

  return HEADLINES.map((headline) => {
    const found = findCase(cases, headline.fixture, headline.label);

    return `<div class="stat">
      <p class="stat-label">${escapeHtml(headline.title)}</p>
      <p class="stat-note">${escapeHtml(headline.note)}</p>
      <p class="stat-value">${found ? formatTimeShort(found.median, unit) : '–'}<span class="stat-unit">${unit}</span></p>
      <p class="stat-foot">${found ? `${formatFrameShare(found.median)} of a 60 Hz frame` : 'Not in this run'}</p>
    </div>`;
  }).join('');
};

const renderFixtures = (results: BenchResults) => {
  const rows = results.fixtures.map(
    (fixture) => `<tr>
      <td class="fixture-cell">${escapeHtml(fixture.name)}</td>
      <td class="num">${formatCount(fixture.groups)}</td>
      <td class="num">${formatCount(fixture.groups * ITEMS_PER_GROUP)}</td>
      <td class="num">${formatCount(fixture.focusKeys ?? 0)}</td>
      <td>${escapeHtml(fixture.grid ?? '–')}</td>
      <td class="num">${formatCount(fixture.elements)}</td>
      <td class="num">${fixture.buildMs.toFixed(2)}</td>
    </tr>`,
  );

  return `<div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th scope="col">Fixture</th>
          <th scope="col" class="num">Groups</th>
          <th scope="col" class="num">Items</th>
          <th scope="col" class="num">Focus keys</th>
          <th scope="col">Grid</th>
          <th scope="col" class="num">Elements</th>
          <th scope="col" class="num">Build (ms)</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  </div>`;
};

/**
 * What every time on the page is, said once above the tables: the unit, how
 * big it is, and what the range beside the median means.
 */
const unitsNote = (text: string, unit: TimeUnit) =>
  `<p class="units-note">Every time is what one <code class="code-inline">keyRove</code> call took, in ${
    unit === 'µs'
      ? 'microseconds (µs; 1,000 µs = 1 ms)'
      : 'milliseconds (ms; 1 ms = 1,000 µs)'
  }: ${text} A 60 Hz frame is ${formatFrame(unit)}.</p>`;

const optionsDiffer = (results: BenchResults) =>
  timingLine(results.options) !== timingLine(DEFAULT_OPTIONS);

export const renderSingle = (entry: Entry, unit: TimeUnit = 'µs'): View => {
  const { environment, results } = entry.report;
  const notices: string[] = [];

  if (entry.wasHidden) {
    notices.push(
      'The tab was in the background during the run, where browsers throttle timers. Run again with the tab in front.',
    );
  }
  if (!results.crossOriginIsolated) {
    notices.push(
      'The page was not cross-origin isolated, so its timer was coarse. Serve it with <code class="code-inline">pnpm bench</code>.',
    );
  }
  if (optionsDiffer(results)) {
    notices.push(
      `This run used timing settings other than the defaults (${escapeHtml(timingLine(results.options))}), so it does not compare like for like with runs that used them.`,
    );
  }
  if (results.skipped?.length) {
    notices.push(
      `${plural(results.skipped.length, 'case was', 'cases were')} not run, because this version lacks the feature they time. They are listed under Not run.`,
    );
  }

  const source = [
    environment.Library,
    environment.Date,
    environment.Browser,
    environment.CPU ??
      (environment.Platform &&
        `${environment.Platform}, ${environment['CPU cores']} cores`),
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    source,
    notices,
    body: `<p class="headline-caption">On the 20,000-item page, with the listener on the document</p>
      <div class="stat-row">${renderHeadlines(results, unit)}</div>
      ${unitsNote(
        `the median of ${results.options.samples} timed batches, and the p10–p90 range the middle 80% of them fell in.`,
        unit,
      )}
      <div class="legend">
        <span class="legend-item"><span class="legend-bar" aria-hidden="true"></span>Median</span>
        <span class="legend-item"><span class="legend-range" aria-hidden="true"></span>p10–p90</span>
        <span class="legend-scale">Bars share a scale within each table</span>
      </div>
      ${sectionsOf(results)
        .map((section) =>
          renderSection(
            section,
            results.cases.filter((each) => each.section === section),
            unit,
          ),
        )
        .join('')}
      ${renderNotRun(results)}`,
    fixtures: renderFixtures(results),
    environment: environmentList(entry.report),
  };
};

/* ---------- several reports ---------- */

const ARROWS = { slower: '▲', faster: '▼' } as const;

/** One median beside the baseline's: the value, and its change. */
const comparisonCell = (
  entry: Entry,
  row: CaseRow,
  found: BenchCase | undefined,
  base: BenchCase | undefined,
  isBaseline: boolean,
  unit: TimeUnit,
) => {
  if (!found) {
    const reason = skipReason(entry.report.results, row.fixture, row.label);
    return reason
      ? `<td class="num"><span class="cmp-na" title="Not run: ${escapeHtml(reason)}">n/a<span class="sr-only">, not run: ${escapeHtml(reason)}</span></span></td>`
      : '<td class="num"><span class="cmp-na" title="Not in this report">–</span></td>';
  }

  const range = `p10–p90: ${formatTime(found.p10, unit)}–${formatTime(found.p90, unit)} ${unit}`;
  const mismatch =
    base && !isBaseline && base.result !== found.result
      ? `<span class="cmp-warn" title="Returned ${escapeHtml(found.result)}; the baseline returned ${escapeHtml(base.result)}">${icon('warning', 'size-3.5')}<span class="sr-only">returned ${escapeHtml(found.result)}, baseline returned ${escapeHtml(base.result)}; </span></span>`
      : '';

  if (isBaseline || !base) {
    return `<td class="num" title="${range}"><span class="cmp"><span class="cmp-value">${formatTime(found.median, unit)}</span><span class="cmp-change"></span></span></td>`;
  }

  const change = compareCases(base, found);
  const said =
    change.ratio === null
      ? ''
      : `<span class="sr-only">, ${change.direction ?? 'within noise'}</span>`;

  return `<td class="num" title="${range}"><span class="cmp">${mismatch}<span class="cmp-value">${formatTime(found.median, unit)}</span><span class="cmp-change" data-direction="${change.direction ?? 'none'}">${change.direction ? `<span aria-hidden="true">${ARROWS[change.direction]}</span>` : ''}${formatChange(change.ratio)}${said}</span></span></td>`;
};

const renderComparisonSection = (
  section: string,
  rows: CaseRow[],
  entries: Entry[],
  baselineIndex: number,
  unit: TimeUnit,
) => {
  const indexes = entries.map((entry) => indexCases(entry.report.results));
  const heading = sectionHeading(section, SECTION_NOTES[section] ?? '');

  const body = rows.map((row, index) => {
    const base = findCase(indexes[baselineIndex], row.fixture, row.label);
    const cells = entries.map((entry, column) =>
      comparisonCell(
        entry,
        row,
        findCase(indexes[column], row.fixture, row.label),
        base,
        column === baselineIndex,
        unit,
      ),
    );

    return `<tr${rowClass(rows, index)}>
      ${fixtureCell(rows, index)}
      <td class="case-cell">${escapeHtml(row.label)}</td>
      ${cells.join('')}
    </tr>`;
  });

  return `<section class="result-section" aria-labelledby="${heading.id}">
    ${heading.html}
    <div class="table-wrap">
      <table class="data-table compare-table">
        <thead>
          <tr>
            <th scope="col">Fixture</th>
            <th scope="col">Case</th>
            ${entries
              .map(
                (entry, column) =>
                  `<th scope="col" class="num">${escapeHtml(entry.name)}<span class="th-sub">${unit} · ${column === baselineIndex ? 'baseline' : 'change'}</span></th>`,
              )
              .join('')}
          </tr>
        </thead>
        <tbody>${body.join('')}</tbody>
      </table>
    </div>
  </section>`;
};

const renderSummary = (entries: Entry[], baselineIndex: number) => {
  const baseline = entries[baselineIndex];

  const rows = entries.map((entry, index) => {
    if (index === baselineIndex) {
      return `<tr>
        <td class="fixture-cell">${escapeHtml(entry.name)} <span class="pill">baseline</span></td>
        <td>${escapeHtml(libraryShort(entry))}</td>
        <td>${escapeHtml(String(entry.report.environment.Date ?? '–'))}</td>
        <td>${escapeHtml(browserShort(entry))}</td>
        <td class="num">–</td><td class="num">–</td><td class="num">–</td>
      </tr>`;
    }

    const { geomean, faster, slower } = summarize(
      baseline.report.results,
      entry.report.results,
    );
    const count = (value: number, direction: 'faster' | 'slower') =>
      value
        ? `<span class="cmp-change" data-direction="${direction}"><span aria-hidden="true">${ARROWS[direction]}</span>${value}</span>`
        : '0';

    return `<tr>
      <td class="fixture-cell">${escapeHtml(entry.name)}</td>
      <td>${escapeHtml(libraryShort(entry))}</td>
      <td>${escapeHtml(String(entry.report.environment.Date ?? '–'))}</td>
      <td>${escapeHtml(browserShort(entry))}</td>
      <td class="num strong">${formatChange(geomean)}</td>
      <td class="num">${count(faster, 'faster')}</td>
      <td class="num">${count(slower, 'slower')}</td>
    </tr>`;
  });

  return `<div class="table-wrap summary-wrap">
    <table class="data-table summary-table">
      <thead>
        <tr>
          <th scope="col">Report</th>
          <th scope="col">Library</th>
          <th scope="col">Date</th>
          <th scope="col">Browser</th>
          <th scope="col" class="num">Overall change</th>
          <th scope="col" class="num">Faster (cases)</th>
          <th scope="col" class="num">Slower (cases)</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  </div>
  <p class="summary-note">
    Overall change is the geometric mean of the change over every case both
    reports measured. Faster and Slower count the cases whose p10–p90 range
    does not overlap the baseline’s. Cells marked
    <span class="cmp-change" data-direction="slower"><span aria-hidden="true">▲</span>slower</span>
    or <span class="cmp-change" data-direction="faster"><span aria-hidden="true">▼</span>faster</span>
    do the same; a grey change is within noise.
  </p>`;
};

const distinct = (values: (string | undefined)[]) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

const comparisonNotices = (entries: Entry[], baselineIndex: number) => {
  const notices: string[] = [];
  const baseline = entries[baselineIndex];

  const browsers = distinct(entries.map(browserShort));
  if (browsers.length > 1) {
    notices.push(
      `These reports ran in different browsers (${escapeHtml(browsers.join(', '))}). Times compare fairly only within one browser.`,
    );
  }
  const machines = distinct(
    entries.map(({ report }) =>
      report.environment.CPU ? String(report.environment.CPU) : undefined,
    ),
  );
  if (machines.length > 1) {
    notices.push(
      `These reports ran on different machines (${escapeHtml(machines.join(', '))}). Times compare fairly only on one.`,
    );
  }
  if (
    distinct(entries.map((entry) => timingLine(entry.report.results.options)))
      .length > 1
  ) {
    notices.push(
      'These reports used different timing settings, so they do not compare like for like.',
    );
  }
  for (const entry of entries.filter((each) => each.wasHidden)) {
    notices.push(
      `${escapeHtml(entry.name)} was run with the tab in the background at some point, where browsers throttle timers.`,
    );
  }

  const lacking = entries.filter(
    (entry) => entry.report.results.skipped?.length,
  );
  if (lacking.length) {
    notices.push(
      `${escapeHtml(lacking.map((entry) => entry.name).join(', '))} ${lacking.length === 1 ? 'lacks' : 'lack'} a feature some cases time, so those cases read n/a there.`,
    );
  }

  const base = indexCases(baseline.report.results);
  const mismatches = entries.reduce(
    (total, entry, index) =>
      index === baselineIndex
        ? total
        : total +
          entry.report.results.cases.filter((each) => {
            const found = findCase(base, each.fixture.name, each.label);
            return found && found.result !== each.result;
          }).length,
    0,
  );
  if (mismatches) {
    notices.push(
      `${plural(mismatches, 'case returns', 'cases return')} something other than in ${escapeHtml(baseline.name)}, so ${mismatches === 1 ? 'it' : 'they'} may not measure the same thing there. They are marked with a warning sign.`,
    );
  }

  return notices;
};

const environmentTable = (entries: Entry[]) => {
  const keys = [
    ...new Set(
      entries.flatMap((entry) => Object.keys(entry.report.environment)),
    ),
  ];

  return `<div class="table-wrap env-table-wrap">
    <table class="data-table env-table">
      <thead>
        <tr><th scope="col"><span class="sr-only">Detail</span></th>${entries
          .map((entry) => `<th scope="col">${escapeHtml(entry.name)}</th>`)
          .join('')}</tr>
      </thead>
      <tbody>${keys
        .map(
          (key) => `<tr>
            <th scope="row">${escapeHtml(key)}</th>
            ${entries
              .map((entry) => {
                const value = entry.report.environment[key];
                return `<td>${value === undefined ? '–' : escapeHtml(displayValue(value))}</td>`;
              })
              .join('')}
          </tr>`,
        )
        .join('')}</tbody>
    </table>
  </div>`;
};

export const renderComparison = (
  entries: Entry[],
  baselineIndex: number,
  unit: TimeUnit = 'µs',
): View => {
  const rows = caseRows(entries.map((entry) => entry.report.results));
  const sections = [...new Set(rows.map((row) => row.section))];

  return {
    source: `${entries.length} reports, against ${entries[baselineIndex].name}`,
    notices: comparisonNotices(entries, baselineIndex),
    body: `${renderSummary(entries, baselineIndex)}
      ${unitsNote(
        `the median of each report’s timed batches. Changes are against ${escapeHtml(entries[baselineIndex].name)}.`,
        unit,
      )}
      ${sections
        .map((section) =>
          renderComparisonSection(
            section,
            rows.filter((row) => row.section === section),
            entries,
            baselineIndex,
            unit,
          ),
        )
        .join('')}`,
    fixtures: null,
    environment: environmentTable(entries),
  };
};
