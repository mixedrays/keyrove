import { ITEMS_PER_GROUP } from './plan.ts';
import {
  caseRows,
  compareCases,
  describeLibrary,
  findCase,
  formatChange,
  formatTime,
  indexCases,
  sectionsOf,
  skipReason,
  summarize,
  type TimeUnit,
} from './results.ts';
import type { BenchReport } from './types.ts';

/**
 * A run as Markdown: environment, fixtures, then one table per section. The
 * headless runner prints it and the UI copies it, so a run from either pastes
 * into the README's results the same way. Times are in `unit`; build times
 * are always milliseconds.
 */
export const toMarkdown = (
  { environment, results }: BenchReport,
  unit: TimeUnit = 'µs',
) => {
  const lines = [
    '## Environment',
    '',
    ...Object.entries(environment).map(
      ([name, value]) => `- ${name}: ${value}`,
    ),
    '',
    '## Fixtures',
    '',
    '| Fixture | Groups | Items | Focus keys | Grid | Elements | Build (ms) |',
    '| ------- | -----: | ----: | ---------: | ---- | -------: | ---------: |',
    ...results.fixtures.map(
      (fixture) =>
        `| ${fixture.name} | ${fixture.groups} | ${fixture.groups * ITEMS_PER_GROUP} | ${fixture.focusKeys ?? 0} | ${fixture.grid ?? '-'} | ${fixture.elements} | ${fixture.buildMs.toFixed(2)} |`,
    ),
  ];

  for (const section of sectionsOf(results)) {
    lines.push(
      '',
      `## ${section}`,
      '',
      `| Fixture | Case | Result | Median (${unit}) | p10–p90 (${unit}) | Batch |`,
      '| ------- | ---- | ------ | ----------: | -----------: | ----: |',
      ...results.cases
        .filter((each) => each.section === section)
        .map(
          (each) =>
            `| ${each.fixture.name} | ${each.label} | ${each.result} | ${formatTime(each.median, unit)} | ${formatTime(each.p10, unit)}–${formatTime(each.p90, unit)} | ${each.batch} |`,
        ),
    );
  }

  if (results.skipped?.length) {
    lines.push(
      '',
      '## not run',
      '',
      '| Fixture | Case | Why |',
      '| ------- | ---- | --- |',
      ...results.skipped.map(
        (each) => `| ${each.fixture} | ${each.label} | ${each.reason} |`,
      ),
    );
  }

  return lines.join('\n');
};

/**
 * Several runs side by side, against one of them: a summary of each, then
 * one table per section with every run's median and its change. A change in
 * bold is outside both runs' p10–p90 range; the rest is within noise.
 */
export const toComparisonMarkdown = (
  entries: { name: string; report: BenchReport }[],
  baselineIndex = 0,
  unit: TimeUnit = 'µs',
) => {
  const baseline = entries[baselineIndex];
  const runs = entries.map((entry) => entry.report.results);
  const indexes = runs.map(indexCases);

  const summaryCells = (report: BenchReport, index: number) => {
    if (index === baselineIndex) return ['baseline', '', ''];
    const { geomean, faster, slower } = summarize(
      baseline.report.results,
      report.results,
    );
    return [formatChange(geomean), String(faster), String(slower)];
  };

  const lines = [
    '## Reports',
    '',
    `| Report | Library | Date | Browser | Change vs ${baseline.name} | Faster (cases) | Slower (cases) |`,
    '| ------ | ------- | ---- | ------- | ------: | -----: | -----: |',
    ...entries.map(({ name, report }, index) => {
      const library = report.library
        ? describeLibrary(report.library)
        : String(report.environment.Library ?? '–');
      return `| ${name} | ${library} | ${report.environment.Date} | ${report.environment.Browser} | ${summaryCells(report, index).join(' | ')} |`;
    }),
    '',
    `Times are medians per keyRove call, in ${unit}. Changes are against ${baseline.name}; one in bold lies outside both runs' p10–p90 range.`,
  ];

  const rows = caseRows(runs);
  for (const section of [...new Set(rows.map((row) => row.section))]) {
    lines.push(
      '',
      `## ${section}`,
      '',
      `| Fixture | Case | ${entries.map((entry) => `${entry.name} (${unit})`).join(' | ')} |`,
      `| ------- | ---- | ${entries.map(() => '-----:').join(' | ')} |`,
      ...rows
        .filter((row) => row.section === section)
        .map(({ fixture, label }) => {
          const base = findCase(indexes[baselineIndex], fixture, label);
          const cells = runs.map((run, index) => {
            const found = findCase(indexes[index], fixture, label);
            if (!found) return skipReason(run, fixture, label) ? 'n/a' : '–';
            if (index === baselineIndex || !base) {
              return formatTime(found.median, unit);
            }
            const change = compareCases(base, found);
            const text = `${formatTime(found.median, unit)} (${formatChange(change.ratio)})`;
            return change.direction ? `**${text}**` : text;
          });
          return `| ${fixture} | ${label} | ${cells.join(' | ')} |`;
        }),
    );
  }

  return lines.join('\n');
};
