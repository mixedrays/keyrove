/**
 * What one keydown costs keyRove, measured in a real browser.
 *
 * Every case builds its fixture first and then times the handler alone: the
 * handler is called directly with an event object, so neither fixture
 * construction nor event dispatch is in the numbers. Each case warms up,
 * picks a batch size that takes at least `minBatchMs`, and reports the
 * per-call time of `samples` such batches.
 *
 * Runs in `harness.html`, a page holding nothing but the fixture, so the
 * document it measures is the same wherever it runs: `scripts/run.ts` loads
 * that page in headless Chrome, and the UI loads it in a frame.
 *
 * keyrove comes from its built `dist`, through the package's own `exports`:
 * the code that is timed is the code that ships.
 */

import { keyRove, matchesCombo } from '@mixedrays/keyrove';
import type {
  KeyRoveEvent,
  KeyRoveOptions,
  MoveResult,
} from '@mixedrays/keyrove';

import {
  CASE_COUNT,
  DEFAULT_OPTIONS,
  FOCUS_KEY_COUNTS,
  GRIDS,
  ITEMS_PER_GROUP,
  SIZES,
} from './plan.ts';
import type {
  BenchCase,
  BenchOptions,
  Fixture,
  Outcome,
  RunBench,
  SkippedCase,
  Supports,
} from './types.ts';

const host = () => document.getElementById('fixture')!;

const noop = () => {};

// Written by the baseline, so the engine cannot drop the work it times.
let sink: unknown;

/** The event keyRove reads, built by hand so no dispatch is timed. */
const event = (
  code: string,
  target: EventTarget | null,
  currentTarget: EventTarget,
): KeyRoveEvent => ({
  code,
  key: code,
  target,
  currentTarget,
  preventDefault: noop,
});

type PageSpec = { groups: number; focusKeys?: number; grid?: string };

/**
 * A page of `groups` roots with 20 button items each, every item holding two
 * spans: three elements per item. `focusKeys` items spread evenly over the
 * page carry a focus key of their own, each a distinct combo that no case
 * presses. `grid` lays each group out as a four-column CSS grid, with `cols`
 * set to `4` or `auto`.
 */
const buildPage = ({ groups, focusKeys = 0, grid }: PageSpec) => {
  const start = performance.now();
  const total = groups * ITEMS_PER_GROUP;
  const every = focusKeys ? Math.floor(total / focusKeys) : 0;
  const parts: string[] = [];
  let n = 0;

  for (let g = 0; g < groups; g++) {
    const layout = grid
      ? ` data-keyrove-cols="${grid}" style="display:grid;grid-template-columns:repeat(4,4rem)"`
      : '';
    parts.push(`<div class="group" id="g${g}" data-keyrove-root${layout}>`);

    for (let i = 0; i < ITEMS_PER_GROUP; i++, n++) {
      const key =
        every && n % every === 0 && n / every < focusKeys
          ? ` data-keyrove-focus-key="ctrl+alt+F${n / every + 1}"`
          : '';
      parts.push(
        `<button data-keyrove-item id="g${g}i${i}"${key}><span>Item ${i}</span><span>meta</span></button>`,
      );
    }
    parts.push('</div>');
  }

  host().innerHTML = parts.join('');
  // Layout now, so the first timed call does not pay for it.
  void host().offsetHeight;

  return {
    buildMs: performance.now() - start,
    elements: document.getElementsByTagName('*').length,
  };
};

/** The same focus keys as `buildPage` declares, as a `focusKeys` map. */
const focusKeyMap = (count: number, values: 'elements' | 'selectors') => {
  const map: Record<string, string | Element> = {};
  const targets = Array.from(
    host().querySelectorAll('[data-keyrove-focus-key]'),
  );

  for (const target of targets.slice(0, count)) {
    const combo = target.getAttribute('data-keyrove-focus-key')!;
    map[combo] = values === 'selectors' ? `#${target.id}` : target;
  }

  return map;
};

const quantile = (sorted: number[], q: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

/** Per-call time of `fn`, in microseconds, over `samples` timed batches. */
const measure = (
  fn: () => void,
  { samples, minBatchMs, warmupMs }: BenchOptions,
) => {
  const warmupEnd = performance.now() + warmupMs;
  while (performance.now() < warmupEnd) fn();

  let batch = 1;
  for (;;) {
    const start = performance.now();
    for (let i = 0; i < batch; i++) fn();
    if (performance.now() - start >= minBatchMs) break;
    batch *= 2;
  }

  const perCall: number[] = [];
  for (let s = 0; s < samples; s++) {
    const start = performance.now();
    for (let i = 0; i < batch; i++) fn();
    perCall.push(((performance.now() - start) / batch) * 1000);
  }
  perCall.sort((a, b) => a - b);

  return {
    batch,
    median: quantile(perCall, 0.5),
    p10: quantile(perCall, 0.1),
    p90: quantile(perCall, 0.9),
  };
};

/** What one call returned, so a case can be checked for what it claims. */
const outcome = (result: MoveResult | null): Outcome =>
  result === null ? 'unhandled' : result.to ? 'moved' : 'consumed no-op';

type Press = [key: string, start: HTMLElement, code: () => string];

/**
 * The three keys each fixture is pressed with, from group 0: an unbound key,
 * a bound key with nowhere to go (End on the last item), and a bound key
 * that moves focus back and forth between the first two items.
 */
const keys = (
  group: HTMLElement,
  { prev = 'ArrowUp', next = 'ArrowDown' } = {},
): Press[] => {
  const first = group.firstElementChild as HTMLElement;
  const last = group.lastElementChild as HTMLElement;

  return [
    ['unbound', first, () => 'KeyQ'],
    ['bound, no move', last, () => 'End'],
    [
      'bound, moves focus',
      first,
      () => (document.activeElement === first ? next : prev),
    ],
  ];
};

const yieldToBrowser = () =>
  new Promise<void>((resolve) => setTimeout(resolve));

/**
 * Which of the features some cases time the library has, found by trying
 * each rather than by reading a version: the runner benchmarks any git ref,
 * and a commit between two releases has no version of its own. A version
 * without a feature would still run its case, but the case would time
 * something other than its label, so it is skipped instead.
 */
const probe = (): Supports => {
  const tryIt = (check: () => boolean) => {
    try {
      return check();
    } catch {
      return false;
    }
  };

  // A focus key given in the option and nowhere in the markup moves focus
  // only if the option is read.
  const focusKeysMap = tryIt(() => {
    host().innerHTML =
      '<div data-keyrove-root><button data-keyrove-item>a</button></div><button>b</button>';
    const [item, target] = Array.from(host().querySelectorAll('button'));
    item.focus();
    const result = keyRove(
      { ...event('F24', item, document), ctrlKey: true, altKey: true },
      { focusKeys: { 'ctrl+alt+F24': target } },
    );
    return result?.to === target;
  });

  // Two columns laid out and none declared: ArrowDown lands a row down
  // only if the columns are read from the layout.
  const autoColumns = tryIt(() => {
    host().innerHTML = `<div data-keyrove-root data-keyrove-cols="auto" style="display:grid;grid-template-columns:repeat(2,4rem)">${'<button data-keyrove-item>x</button>'.repeat(4)}</div>`;
    const root = host().firstElementChild!;
    const items = Array.from(root.querySelectorAll('button'));
    items[0].focus();
    return keyRove(event('ArrowDown', items[0], root))?.to === items[2];
  });

  host().innerHTML = '';
  return { focusKeysMap, autoColumns };
};

const NO_FOCUS_KEYS_MAP = 'this version has no focusKeys option';
const NO_AUTO_COLUMNS = 'this version cannot read columns from the layout';

export const runBench: RunBench = async ({
  samples = DEFAULT_OPTIONS.samples,
  minBatchMs = DEFAULT_OPTIONS.minBatchMs,
  warmupMs = DEFAULT_OPTIONS.warmupMs,
  onProgress,
  signal,
} = {}) => {
  const options = { samples, minBatchMs, warmupMs };
  const fixtures: Fixture[] = [];
  const cases: BenchCase[] = [];
  const skipped: SkippedCase[] = [];
  const supports = probe();

  // A skipped case counts toward progress, so a run always reaches its total.
  const completed = () => cases.length + skipped.length;

  const record = (entry: BenchCase) => {
    cases.push(entry);
    onProgress?.({
      completed: completed(),
      total: CASE_COUNT,
      fixture: entry.fixture.name,
      last: entry,
    });
  };

  const skip = (entry: SkippedCase) => {
    skipped.push(entry);
    onProgress?.({
      completed: completed(),
      total: CASE_COUNT,
      fixture: entry.fixture,
      last: null,
    });
  };

  /** Times one press from `start`, with the listener on `currentTarget`. */
  const run = async (
    section: string,
    label: string,
    fixture: Fixture,
    start: HTMLElement,
    currentTarget: EventTarget,
    code: () => string,
    config?: KeyRoveOptions,
  ) => {
    signal?.throwIfAborted();
    start.focus();
    const call = () =>
      keyRove(event(code(), document.activeElement, currentTarget), config);
    const result = outcome(call());
    start.focus();
    const timing = measure(call, options);
    record({ section, label, fixture, result, ...timing });
    await yieldToBrowser();
  };

  const page = async (name: string, spec: PageSpec) => {
    signal?.throwIfAborted();
    host().innerHTML = '';
    await yieldToBrowser();
    const built = buildPage(spec);
    const fixture: Fixture = { name, ...spec, ...built };
    fixtures.push(fixture);
    onProgress?.({
      completed: completed(),
      total: CASE_COUNT,
      fixture: name,
      last: null,
    });

    return { fixture, group: document.getElementById('g0')! };
  };

  try {
    // A: listener placement, by key and page size, with no focus keys.
    for (const [name, groups] of SIZES) {
      const { fixture, group } = await page(name, { groups });

      // The floor, once: the harness building the event and calling nothing.
      if (name === 'S') {
        const first = group.firstElementChild;
        const timing = measure(() => {
          sink = event('KeyQ', first, group);
        }, options);
        record({
          section: 'baseline',
          label: 'harness only, no handler',
          fixture,
          result: '-',
          ...timing,
        });
      }

      for (const [listener, currentTarget] of [
        ['local', group],
        ['document', document],
      ] as const) {
        for (const [key, start, code] of keys(group)) {
          await run(
            'listener',
            `${listener}, ${key}`,
            fixture,
            start,
            currentTarget,
            code,
          );
        }
      }
    }

    // B: focus-key lookup on the large page, document listener, unbound key.
    for (const count of FOCUS_KEY_COUNTS) {
      const { fixture, group } = await page(`L, ${count} focus keys`, {
        groups: 1000,
        focusKeys: count,
      });
      const first = group.firstElementChild as HTMLElement;
      const unbound = () => 'KeyQ';

      await run(
        'focus keys',
        `${count} × attribute scan`,
        fixture,
        first,
        document,
        unbound,
      );
      for (const values of ['elements', 'selectors'] as const) {
        const label = `${count} × focusKeys map, ${values}`;
        if (!supports.focusKeysMap) {
          skip({
            section: 'focus keys',
            label,
            fixture: fixture.name,
            reason: NO_FOCUS_KEYS_MAP,
          });
          continue;
        }
        await run('focus keys', label, fixture, first, document, unbound, {
          focusKeys: focusKeyMap(count, values),
        });
      }

      if (count === 1000) {
        await run(
          'focus keys',
          `${count} on page, local listener`,
          fixture,
          first,
          group,
          unbound,
        );
      }

      // Where the time goes: the scan alone, and matching the press against
      // every declared combo alone. Both are parts of the attribute-scan case.
      signal?.throwIfAborted();
      const combos = Array.from(
        document.querySelectorAll('[data-keyrove-focus-key]'),
        (target) => target.getAttribute('data-keyrove-focus-key')!,
      );
      const press = event('KeyQ', first, document);
      record({
        section: 'diagnostics',
        label: `${count} × querySelectorAll over the document`,
        fixture,
        result: '-',
        ...measure(() => {
          sink = document.querySelectorAll('[data-keyrove-focus-key]').length;
        }, options),
      });
      record({
        section: 'diagnostics',
        label: `${count} × matchesCombo, none matching`,
        fixture,
        result: '-',
        ...measure(() => {
          sink = combos.some((combo) => matchesCombo(press, combo));
        }, options),
      });
      await yieldToBrowser();
    }

    // C: a fixed column count against `auto`, which reads the layout.
    for (const grid of GRIDS) {
      const name = `M, cols="${grid}"`;
      if (grid === 'auto' && !supports.autoColumns) {
        for (const key of ['unbound', 'bound, moves focus']) {
          skip({
            section: 'columns',
            label: `cols="${grid}", ${key}`,
            fixture: name,
            reason: NO_AUTO_COLUMNS,
          });
        }
        continue;
      }

      const { fixture, group } = await page(name, { groups: 100, grid });

      for (const [key, start, code] of keys(group, {
        prev: 'ArrowLeft',
        next: 'ArrowRight',
      })) {
        if (key === 'bound, no move') continue;
        await run(
          'columns',
          `cols="${grid}", ${key}`,
          fixture,
          start,
          group,
          code,
        );
      }
    }
  } finally {
    host().innerHTML = '';
  }

  return {
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
    options,
    supports,
    fixtures,
    cases,
    skipped,
  };
};
