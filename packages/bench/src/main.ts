import { mountThemeToggle } from '../../docs/src/theme.ts';
import { icon } from './icons.ts';
import { CASE_COUNT, DEFAULT_OPTIONS } from './plan.ts';
import { toComparisonMarkdown, toMarkdown } from './report.ts';
import {
  browserEnvironment,
  browserMajor,
  browserName,
  formatTime,
  sortReports,
  TIME_UNITS,
  type TimeUnit,
} from './results.ts';
import type {
  BenchOptions,
  BenchProgress,
  BenchReport,
  LibraryInfo,
} from './types.ts';
import {
  escapeHtml,
  renderComparison,
  renderSingle,
  type Entry,
  type View,
} from './view.ts';

/**
 * The benchmark's page: run it in this browser, and read the reports in
 * `results/` and the run made here, one at a time or side by side.
 *
 * A run happens in harness.html, loaded into a frame of its own each time:
 * a fresh page holding only the fixture, as in the headless run, so nothing
 * on this page is part of what the cases count or scan.
 */

/** The library this page's harness was built against; see vite.config.ts. */
declare const __BENCH_LIBRARY__: LibraryInfo;

type SavedRun = {
  report: BenchReport;
  /** The tab was in the background at some point during the run. */
  wasHidden: boolean;
};

type Selection = {
  /** The reports shown, by entry id. */
  ids: string[];
  /** The report the others are compared against. */
  baseline: string | null;
};

const RUN_KEY = 'keyrove-bench-run';
const SELECTION_KEY = 'keyrove-bench-selection';
const UNIT_KEY = 'keyrove-bench-unit';
const RUN_ID = 'browser';

/** Shown at once by default: past that a comparison runs off the page. */
const DEFAULT_SHOWN = 5;

/*
 * Every report in results/, read when the page is built: `pnpm bench`
 * builds on start, so a report saved by the headless runner shows up the
 * next time it starts, and the dev server reloads as soon as one is added.
 */
const files = import.meta.glob<BenchReport>('../results/*.json', {
  eager: true,
  import: 'default',
});

const fileEntries: Entry[] = Object.entries(files).map(([path, report]) => {
  const name = path.slice(path.lastIndexOf('/') + 1, -'.json'.length);
  return {
    id: `file:${name}`,
    name: name === 'recorded' ? 'Recorded' : name,
    report,
  };
});

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;

const ui = {
  form: $<HTMLFormElement>('[data-run-form]'),
  run: $<HTMLButtonElement>('[data-run]'),
  stop: $<HTMLButtonElement>('[data-stop]'),
  settingsToggle: $<HTMLButtonElement>('[data-settings-toggle]'),
  settings: $<HTMLFieldSetElement>('[data-settings]'),
  reset: $<HTMLButtonElement>('[data-settings-reset]'),
  progress: $('[data-progress]'),
  progressBar: $<HTMLProgressElement>('[data-progress] progress'),
  progressCount: $('[data-progress-count]'),
  progressElapsed: $('[data-progress-elapsed]'),
  progressCase: $('[data-progress-case]'),
  status: $('[data-status]'),
  checks: $('[data-checks]'),
  source: $('[data-source]'),
  copy: $<HTMLButtonElement>('[data-copy]'),
  copyLabel: $('[data-copy-label]'),
  download: $<HTMLButtonElement>('[data-download]'),
  reportList: $('[data-report-list]'),
  baselineField: $('[data-baseline-field]'),
  baseline: $<HTMLSelectElement>('[data-baseline]'),
  notices: $('[data-notices]'),
  view: $('[data-view]'),
  fixturesDisclosure: $<HTMLDetailsElement>('[data-fixtures-disclosure]'),
  fixtures: $('[data-fixtures]'),
  environment: $('[data-environment]'),
  stage: $('[data-stage]'),
  stageFixture: $('[data-stage-fixture]'),
  stageCount: $('[data-stage-count]'),
  stageStop: $<HTMLButtonElement>('[data-stage-stop]'),
  stageBar: $('[data-stage-bar]'),
};

const settingInputs = Array.from(
  ui.settings.querySelectorAll<HTMLInputElement>('input'),
);
const unitInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>('input[name="unit"]'),
);

/* ---------- stored state ---------- */

/** Storage throws rather than no-ops where a browser has it switched off. */
const load = <T>(key: string): T | null => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
};

const store = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // It still holds until the page is left; it just will not outlive it.
  }
};

/** The last run in this browser, kept so a reload does not lose it. */
let run = load<SavedRun>(RUN_KEY);

const entries = (): Entry[] =>
  sortReports([
    ...fileEntries,
    ...(run
      ? [
          {
            id: RUN_ID,
            name: 'Your run',
            report: run.report,
            wasHidden: run.wasHidden,
          },
        ]
      : []),
  ]);

/** The stored selection, less any report that has gone since. */
const loadSelection = (): Selection => {
  const ids = new Set(entries().map((entry) => entry.id));
  const stored = load<Selection>(SELECTION_KEY);
  const kept = stored?.ids.filter((id) => ids.has(id)) ?? [];

  if (kept.length) {
    return {
      ids: kept,
      baseline:
        stored?.baseline && kept.includes(stored.baseline)
          ? stored.baseline
          : null,
    };
  }

  return {
    ids: entries()
      .slice(0, DEFAULT_SHOWN)
      .map((entry) => entry.id),
    baseline: null,
  };
};

let selection = loadSelection();

/** The unit times are shown in: a per-viewer preference, µs unless changed. */
let unit: TimeUnit = ((stored) =>
  TIME_UNITS.includes(stored as TimeUnit) ? (stored as TimeUnit) : 'µs')(
  load<string>(UNIT_KEY),
);

const setSelection = (next: Selection) => {
  selection = next;
  store(SELECTION_KEY, selection);
  render();
};

/** The reports shown, in list order, and which of them is the baseline. */
const shown = () => {
  const chosen = entries().filter((entry) => selection.ids.includes(entry.id));
  const baselineIndex = Math.max(
    0,
    chosen.findIndex((entry) => entry.id === selection.baseline),
  );
  return { chosen, baselineIndex };
};

/* ---------- this browser ---------- */

/** The smallest step `performance.now()` takes here, in microseconds. */
const timerResolution = () => {
  let smallest = Infinity;
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    let next = performance.now();
    while (next === start) next = performance.now();
    smallest = Math.min(smallest, next - start);
  }

  return smallest * 1000;
};

const platformName = () =>
  (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData?.platform || navigator.platform;

const renderChecks = () => {
  const resolution = timerResolution();
  // Chrome steps in 5 µs once isolated and 100 µs otherwise; Firefox in 20 µs
  // and 1 ms. Anything past 20 µs blurs the fastest cases into each other.
  const fine = resolution <= 20;
  const isolated = globalThis.crossOriginIsolated ?? false;

  const row = (term: string, value: string, ok = true, why = '') =>
    `<div class="run-check" ${ok ? '' : 'data-warn'}>
      <dt>${term}</dt>
      <dd>${ok ? '' : icon('warning', 'size-3.5')}${escapeHtml(value)}</dd>
      ${why ? `<p class="run-check-why">${escapeHtml(why)}</p>` : ''}
    </div>`;

  ui.checks.innerHTML = [
    row('Browser', browserName(navigator.userAgent)),
    row(
      'Timer steps',
      resolution >= 1000
        ? `${(resolution / 1000).toFixed(1)} ms`
        : `${Math.round(resolution)} µs`,
      fine,
      fine ? '' : 'Too coarse for the fastest cases.',
    ),
    row(
      'Cross-origin isolated',
      isolated ? 'Yes' : 'No',
      isolated,
      isolated ? '' : 'Serve with pnpm bench for finer timers.',
    ),
    row('CPU cores', String(navigator.hardwareConcurrency ?? 'unknown')),
  ].join('');
};

/* ---------- reports ---------- */

/** What tells two reports apart at a glance: library, date, browser. */
const describeEntry = ({ report }: Entry) => {
  const library = report.library;
  const browser = String(report.environment.Browser ?? '');

  return [
    library &&
      (library.ref
        ? `${library.version} · ${library.commit}`
        : `${library.version}, working tree${library.dirty ? ' with edits' : ''}`),
    report.environment.Date,
    `${browserMajor(browser)}${/headless/i.test(browser) ? ' headless' : ''}`,
  ]
    .filter(Boolean)
    .join(' · ');
};

/** The list of reports; drawn when the set changes, not on every tick. */
const renderReportList = () => {
  ui.reportList.innerHTML = entries()
    .map(
      (entry) => `<li>
        <label class="report-choice">
          <input type="checkbox" value="${escapeHtml(entry.id)}" />
          <span class="report-text">
            <span class="report-name">${escapeHtml(entry.name)}</span>
            <span class="report-meta">${escapeHtml(describeEntry(entry))}</span>
          </span>
        </label>
      </li>`,
    )
    .join('');
};

const syncPicker = (chosen: Entry[], baselineIndex: number) => {
  for (const input of ui.reportList.querySelectorAll('input')) {
    input.checked = selection.ids.includes(input.value);
  }

  ui.baselineField.hidden = chosen.length < 2;
  ui.baseline.innerHTML = chosen
    .map(
      (entry, index) =>
        `<option value="${escapeHtml(entry.id)}"${index === baselineIndex ? ' selected' : ''}>${escapeHtml(entry.name)}</option>`,
    )
    .join('');
};

const notice = (html: string) =>
  `<p class="notice">${icon('warning', 'size-4 mt-0.5')}<span>${html}</span></p>`;

const EMPTY: View = {
  source: 'No report chosen',
  notices: [],
  body: '<p class="empty-view">Tick a report above to see its results.</p>',
  fixtures: null,
  environment: '<p class="empty-view">No report chosen.</p>',
};

const currentView = (): View => {
  const { chosen, baselineIndex } = shown();
  if (chosen.length === 0) return EMPTY;
  if (chosen.length === 1) return renderSingle(chosen[0], unit);
  return renderComparison(chosen, baselineIndex, unit);
};

const render = () => {
  const { chosen, baselineIndex } = shown();
  const view = currentView();

  syncPicker(chosen, baselineIndex);
  for (const input of unitInputs) input.checked = input.value === unit;
  ui.source.textContent = view.source;
  ui.notices.innerHTML = view.notices.map(notice).join('');
  ui.view.innerHTML = view.body;
  ui.fixturesDisclosure.hidden = view.fixtures === null;
  ui.fixtures.innerHTML = view.fixtures ?? '';
  ui.environment.innerHTML = view.environment;

  // A report is a file to save; a comparison is only ever a table to paste.
  ui.copy.disabled = chosen.length === 0;
  ui.download.hidden = chosen.length !== 1;
};

/* ---------- export ---------- */

let copiedTimer: number | undefined;

const copyMarkdown = async () => {
  const { chosen, baselineIndex } = shown();
  const markdown =
    chosen.length === 1
      ? toMarkdown(chosen[0].report, unit)
      : toComparisonMarkdown(chosen, baselineIndex, unit);

  try {
    await navigator.clipboard.writeText(markdown);
    ui.copy.dataset.copied = '';
    ui.copyLabel.textContent = 'Copied';
  } catch {
    ui.copyLabel.textContent = 'Copy failed';
  }

  clearTimeout(copiedTimer);
  copiedTimer = window.setTimeout(() => {
    delete ui.copy.dataset.copied;
    ui.copyLabel.textContent = 'Copy Markdown';
  }, 2000);
};

/**
 * The shape `pnpm bench:headless -- --json` writes, so a run made here can
 * go into results/ beside the others.
 */
const downloadJson = () => {
  const [entry] = shown().chosen;
  if (!entry) return;
  const name =
    entry.id === RUN_ID
      ? `browser-${entry.report.environment.Date}.json`
      : `${entry.id.replace(/^file:/, '')}.json`;
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(entry.report, null, 2)}\n`], {
      type: 'application/json',
    }),
  );
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: name,
  });
  link.click();
  URL.revokeObjectURL(url);
};

/* ---------- settings ---------- */

const fillSettings = (options: BenchOptions) => {
  for (const input of settingInputs) {
    input.value = String(options[input.name as keyof BenchOptions]);
  }
};

const readSettings = (): BenchOptions =>
  Object.fromEntries(
    settingInputs.map((input) => [input.name, input.valueAsNumber]),
  ) as BenchOptions;

const setSettingsOpen = (open: boolean) => {
  ui.settings.hidden = !open;
  ui.settingsToggle.setAttribute('aria-expanded', String(open));
};

/* ---------- running ---------- */

let controller: AbortController | null = null;
let wasHidden = false;

const announce = (message: string, tone: 'info' | 'error' = 'info') => {
  ui.status.textContent = message;
  ui.status.dataset.tone = tone;
};

/** A fresh harness page in the stage, loaded and ready to run. */
const openStage = async () => {
  const frame = document.createElement('iframe');
  frame.title = 'Benchmark fixture';
  frame.src = new URL('harness.html', document.baseURI).href;
  const loaded = new Promise((resolve) =>
    frame.addEventListener('load', resolve, { once: true }),
  );

  ui.stageFixture.textContent = 'Loading…';
  ui.stage.hidden = false;
  ui.stage.append(frame);
  await loaded;

  // A frame the server could not answer holds the browser's error page,
  // whose origin is not this page's: `contentDocument` is null for it, where
  // reading off `contentWindow` would throw a cross-origin error that names
  // nothing the reader can act on.
  const view = frame.contentDocument?.defaultView;
  if (!view?.runBench) {
    throw new Error(
      'the benchmark page did not load. If the server has stopped, start it again with pnpm bench.',
    );
  }

  // The harness has no stylesheet, so its buttons follow whatever scheme
  // it is told; this keeps a dark page from showing a white frame. With no
  // explicit choice it follows the system, as this page does.
  view.document.documentElement.style.colorScheme =
    document.documentElement.dataset.theme ?? 'light dark';
  view.addEventListener('keydown', stopOnEscape);

  return { frame, runBench: view.runBench };
};

const closeStage = () => {
  ui.stage.querySelector('iframe')?.remove();
  ui.stage.hidden = true;
};

const stopOnEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && controller) {
    event.preventDefault();
    controller.abort();
  }
};

const setRunning = (running: boolean) => {
  document.documentElement.toggleAttribute('data-running', running);
  ui.run.hidden = running;
  ui.stop.hidden = !running;
  ui.settings.disabled = running;
  ui.progress.hidden = !running;
};

const showProgress = ({ completed, total, fixture, last }: BenchProgress) => {
  ui.progressBar.max = total;
  ui.progressBar.value = completed;
  ui.progressCount.textContent = `Case ${completed} of ${total}`;
  ui.stageFixture.textContent = fixture;
  ui.stageCount.textContent = `${completed}/${total}`;
  ui.stageBar.style.width = `${(completed / total) * 100}%`;
  ui.progressCase.textContent = last
    ? `${last.fixture.name} · ${last.label}: ${formatTime(last.median, unit)} ${unit}`
    : `Building ${fixture}…`;
};

const startRun = async () => {
  if (controller) return;

  if (!ui.form.checkValidity()) {
    setSettingsOpen(true);
    ui.form.reportValidity();
    return;
  }

  const options = readSettings();
  controller = new AbortController();
  wasHidden = document.hidden;
  setRunning(true);
  showProgress({ completed: 0, total: CASE_COUNT, fixture: '', last: null });
  ui.progressCase.textContent = 'Loading the harness…';
  announce(
    'Running. Focus moves into the fixture while cases run; press Escape to stop.',
  );

  const started = performance.now();
  const tick = () => {
    ui.progressElapsed.textContent = `${Math.round((performance.now() - started) / 1000)} s`;
  };
  tick();
  const ticker = window.setInterval(tick, 500);

  try {
    const { runBench } = await openStage();
    const results = await runBench({
      ...options,
      signal: controller.signal,
      onProgress: showProgress,
    });

    // Copied out of the frame's realm, which goes when the frame does.
    const copy = JSON.parse(JSON.stringify(results)) as typeof results;
    run = {
      report: {
        environment: browserEnvironment(copy, {
          platform: platformName(),
          date: new Date(),
          library: __BENCH_LIBRARY__,
        }),
        library: __BENCH_LIBRARY__,
        results: copy,
      },
      wasHidden,
    };
    store(RUN_KEY, run);
    renderReportList();

    // The new run joins whatever was shown, against the same baseline.
    const { chosen, baselineIndex } = shown();
    setSelection({
      ids: [...new Set([...selection.ids, RUN_ID])],
      baseline: chosen[baselineIndex]?.id ?? null,
    });

    const seconds = Math.round((performance.now() - started) / 1000);
    announce(
      `Finished ${copy.cases.length} cases in ${seconds} s. Your run is added to the results below.`,
    );
  } catch (error) {
    if (controller.signal.aborted) {
      announce('Stopped. Nothing from the partial run was kept.');
    } else {
      announce(
        `The run failed: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );
    }
  } finally {
    clearInterval(ticker);
    closeStage();
    controller = null;
    setRunning(false);
    // The run took focus into the frame, which has gone with it.
    ui.run.focus();
  }
};

/* ---------- wiring ---------- */

mountThemeToggle();
renderChecks();
fillSettings(DEFAULT_OPTIONS);
for (const element of document.querySelectorAll('[data-case-count]')) {
  element.textContent = String(CASE_COUNT);
}
renderReportList();
render();

ui.form.addEventListener('submit', (event) => {
  event.preventDefault();
  void startRun();
});
ui.stop.addEventListener('click', () => controller?.abort());
ui.stageStop.addEventListener('click', () => controller?.abort());
document.addEventListener('keydown', stopOnEscape);
document.addEventListener('visibilitychange', () => {
  if (controller && document.hidden) wasHidden = true;
});

ui.settingsToggle.addEventListener('click', () =>
  setSettingsOpen(ui.settingsToggle.getAttribute('aria-expanded') !== 'true'),
);
ui.reset.addEventListener('click', () => fillSettings(DEFAULT_OPTIONS));

// One listener for the whole list, which is redrawn after a run.
ui.reportList.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  const ids = input.checked
    ? [...selection.ids, input.value]
    : selection.ids.filter((id) => id !== input.value);
  setSelection({ ...selection, ids });
});
for (const input of unitInputs) {
  input.addEventListener('change', () => {
    unit = input.value as TimeUnit;
    store(UNIT_KEY, unit);
    render();
  });
}
ui.baseline.addEventListener('change', () =>
  setSelection({ ...selection, baseline: ui.baseline.value }),
);

ui.copy.addEventListener('click', () => void copyMarkdown());
ui.download.addEventListener('click', downloadJson);
