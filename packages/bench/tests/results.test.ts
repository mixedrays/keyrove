import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { reportName } from '../scripts/library.ts';
import { CASE_COUNT } from '../src/plan.ts';
import { toComparisonMarkdown, toMarkdown } from '../src/report.ts';
import {
  browserMajor,
  browserName,
  caseRows,
  compareCases,
  compareVersions,
  findCase,
  formatChange,
  formatFrameShare,
  formatFrame,
  formatTime,
  formatTimeShort,
  HEADLINES,
  indexCases,
  ratio,
  SECTION_NOTES,
  sectionsOf,
  sortReports,
  summarize,
} from '../src/results.ts';
import type {
  BenchCase,
  BenchReport,
  BenchResults,
  LibraryInfo,
} from '../src/types.ts';

const recorded: BenchReport = JSON.parse(
  readFileSync(new URL('../results/recorded.json', import.meta.url), 'utf8'),
);

test('the recorded run has as many cases as a run records', () => {
  assert.equal(
    recorded.results.cases.length + (recorded.results.skipped?.length ?? 0),
    CASE_COUNT,
  );
});

test('every headline names a case in the recorded run', () => {
  const cases = indexCases(recorded.results);

  for (const headline of HEADLINES) {
    assert.ok(
      findCase(cases, headline.fixture, headline.label),
      `${headline.fixture} · ${headline.label}`,
    );
  }
});

test('every section has a note', () => {
  for (const section of sectionsOf(recorded.results)) {
    assert.ok(SECTION_NOTES[section], section);
  }
});

test('sections come in the order the run recorded them', () => {
  assert.deepEqual(sectionsOf(recorded.results), [
    'baseline',
    'listener',
    'focus keys',
    'diagnostics',
    'columns',
  ]);
});

test('the Markdown report prints the README table rows', () => {
  const markdown = toMarkdown(recorded);

  assert.ok(markdown.startsWith('## Environment\n\n- Browser: '));
  assert.ok(
    markdown.includes('| S | 10 | 200 | 0 | - | 624 | 1.59 |'),
    'fixture row',
  );
  assert.ok(
    markdown.includes(
      '| M, cols="auto" | 100 | 2000 | 0 | auto | 6114 | 14.97 |',
    ),
    'grid fixture row',
  );
  assert.ok(
    markdown.includes(
      '| S | local, unbound | unhandled | 2.68 | 2.64–2.93 | 4096 |',
    ),
    'case row',
  );
});

test('browser names come out of user agent strings', () => {
  assert.equal(
    browserName(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
    ),
    'Chrome 153',
  );
  assert.equal(
    browserName(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36',
    ),
    'Chrome (headless) 153',
  );
  assert.equal(
    browserName(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.3400.12',
    ),
    'Edge 153.0.3400.12',
  );
  assert.equal(
    browserName(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0',
    ),
    'Firefox 143',
  );
  assert.equal(
    browserName(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15',
    ),
    'Safari 19.1',
  );
  assert.equal(browserName('something else'), 'something else');
});

test('a ratio needs both times above the noise floor', () => {
  assert.equal(ratio(2, 1), 2);
  assert.equal(ratio(0.005, 0.01), null);
  assert.equal(ratio(1, 0), null);
});

test('changes read as signed percentages', () => {
  assert.equal(formatChange(1.123), '+12%');
  assert.equal(formatChange(0.97), '−3%');
  assert.equal(formatChange(1.001), '0%');
  assert.equal(formatChange(null), '–');
});

/** A case with just what a comparison reads; the rest does not matter. */
const timed = (
  label: string,
  median: number,
  p10 = median * 0.98,
  p90 = median * 1.02,
  fixture = 'L',
  section = 'listener',
): BenchCase => ({
  section,
  label,
  fixture: { name: fixture, groups: 1000, buildMs: 0, elements: 0 },
  result: 'unhandled',
  median,
  p10,
  p90,
  batch: 1,
});

const run = (
  cases: BenchCase[],
  skipped: BenchResults['skipped'] = [],
): BenchResults => ({
  crossOriginIsolated: true,
  options: recorded.results.options,
  fixtures: [],
  cases,
  skipped,
});

test('a change counts only where the p10–p90 ranges part', () => {
  const base = timed('a', 10, 9.8, 10.2);

  assert.deepEqual(compareCases(base, timed('a', 12, 11.8, 12.2)), {
    ratio: 1.2,
    direction: 'slower',
  });
  assert.equal(compareCases(base, timed('a', 8, 7.8, 8.2)).direction, 'faster');
  // 5% slower, but the ranges overlap: noise, not a change.
  assert.equal(
    compareCases(base, timed('a', 10.5, 10.1, 10.9)).direction,
    null,
  );
  assert.deepEqual(compareCases(timed('a', 0.01), timed('a', 0.02)), {
    ratio: null,
    direction: null,
  });
});

test('a summary is the geometric mean over the cases both runs have', () => {
  const base = run([timed('a', 10), timed('b', 100), timed('c', 5)]);
  const other = run([timed('a', 20), timed('b', 50)]);
  const summary = summarize(base, other);

  // 2× and 0.5× cancel out; c is in one run only, so it is left out.
  assert.equal(summary.compared, 2);
  assert.ok(Math.abs(summary.geomean! - 1) < 1e-9);
  assert.equal(summary.slower, 1);
  assert.equal(summary.faster, 1);
});

test("rows cover every case any run has, in the fullest run's order", () => {
  const full = run([timed('a', 1), timed('b', 1), timed('c', 1)]);
  const partial = run(
    [timed('a', 1), timed('c', 1)],
    [{ section: 'listener', label: 'b', fixture: 'L', reason: 'no b' }],
  );

  assert.deepEqual(
    caseRows([partial, full]).map((row) => row.label),
    ['a', 'b', 'c'],
  );
  // A case only a skip names still gets its row.
  assert.deepEqual(
    caseRows([partial]).map((row) => row.label),
    ['a', 'c', 'b'],
  );
});

test('versions sort numerically, and a report without one after', () => {
  assert.ok(compareVersions('2.9.1', '2.10.0') < 0);
  assert.ok(compareVersions('2.1.0', undefined) < 0);
  assert.equal(compareVersions(undefined, undefined), 0);

  const entry = (name: string, date: string, library?: LibraryInfo) => ({
    name,
    report: { ...recorded, environment: { Date: date }, library },
  });
  const sorted = sortReports([
    entry('Your run', '2026-09-24', { version: '2.5.0' }),
    entry('v2.10.0', '2026-09-24', { version: '2.10.0', ref: 'v2.10.0' }),
    entry('Recorded', '2026-09-22'),
    entry('v2.2.0', '2026-09-24', { version: '2.2.0', ref: 'v2.2.0' }),
  ]);

  assert.deepEqual(
    sorted.map((each) => each.name),
    ['v2.2.0', 'v2.10.0', 'Recorded', 'Your run'],
  );
});

test('the comparison Markdown bolds only changes beyond noise', () => {
  const report = (cases: BenchCase[], skipped?: BenchResults['skipped']) => ({
    ...recorded,
    results: run(cases, skipped),
  });
  const markdown = toComparisonMarkdown(
    [
      { name: 'old', report: report([timed('a', 10), timed('b', 10)]) },
      {
        name: 'new',
        report: report(
          [timed('a', 12)],
          [{ section: 'listener', label: 'b', fixture: 'L', reason: 'no b' }],
        ),
      },
    ],
    0,
  );

  assert.ok(markdown.includes('| L | a | 10.00 | **12.00 (+20%)** |'));
  assert.ok(markdown.includes('| L | b | 10.00 | n/a |'));
  assert.ok(markdown.includes('| new |'));
  assert.ok(markdown.includes('| +20% | 0 | 1 |'), 'summary row');
});

test('browser names reduce to name and major version', () => {
  assert.equal(
    browserMajor('Chrome/153.0.8010.53 (headless), V8 15.3.76.13'),
    'Chrome 153',
  );
  assert.equal(browserMajor('Chrome (headless) 153'), 'Chrome 153');
  assert.equal(browserMajor('Firefox 143'), 'Firefox 143');
});

test('a ref becomes a report name that is a safe file name', () => {
  assert.equal(reportName('v2.1.0'), 'v2.1.0');
  assert.equal(reportName('release/2.1'), 'release-2.1');
  assert.equal(reportName('HEAD~3'), 'HEAD-3');
});

test('short times keep three significant figures', () => {
  assert.equal(formatTimeShort(2.574), '2.57');
  assert.equal(formatTimeShort(24.5), '24.5');
  assert.equal(formatTimeShort(575.78), '576');
  assert.equal(formatTimeShort(2.574, 'ms'), '0.00257');
  assert.equal(formatTimeShort(68.46, 'ms'), '0.0685');
  assert.equal(formatTimeShort(0), '0');
});

test('milliseconds keep the resolution microseconds have', () => {
  assert.equal(formatTime(2.68), '2.68');
  assert.equal(formatTime(2.68, 'ms'), '0.00268');
  assert.equal(formatTime(855, 'ms'), '0.85500');
  assert.equal(formatFrame('µs'), '16,667 µs');
  assert.equal(formatFrame('ms'), '16.7 ms');
});

test('the Markdown report can be in milliseconds', () => {
  const markdown = toMarkdown(recorded, 'ms');

  assert.ok(markdown.includes('| Median (ms) | p10–p90 (ms) |'));
  assert.ok(
    markdown.includes(
      '| S | local, unbound | unhandled | 0.00268 | 0.00264–0.00293 | 4096 |',
    ),
  );
  // Build times stay in milliseconds whatever the unit.
  assert.ok(markdown.includes('| S | 10 | 200 | 0 | - | 624 | 1.59 |'));
});

test('frame shares show as many places as they need', () => {
  assert.equal(formatFrameShare(2.57), '0.015%');
  assert.equal(formatFrameShare(68.46), '0.41%');
  assert.equal(formatFrameShare(855), '5.1%');
});
