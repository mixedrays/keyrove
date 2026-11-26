// The handler is called directly with a hand-built event, so neither fixture
// construction nor dispatch is timed. keyrove comes from its built `dist`, so
// the timed code is the code that ships.

import { keyRove, matchesCombo } from '@mixedrays/keyrove';
import type {
  KeyRoveEvent,
  KeyRoveOptions,
  MoveResult,
} from '@mixedrays/keyrove';

import {
  CASE_COUNT,
  COLUMN_KEYS,
  COLUMNS,
  DEFAULT_OPTIONS,
  FOCUS_KEY_COUNTS,
  ITEMS_PER_GROUP,
  LAYOUT_STATES,
  REFUSALS,
  SIZES,
} from './plan.ts';
import type {
  BenchCase,
  BenchOptions,
  ColumnLayout,
  ColumnSpec,
  Fixture,
  Outcome,
  RefusalSpec,
  RunBench,
  SkippedCase,
  Supports,
} from './types.ts';

const host = () => document.getElementById('fixture')!;

const noop = () => {};

// Written by the baseline, so the engine cannot drop the work it times.
let sink: unknown;

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

type PageSpec = {
  groups: number;
  focusKeys?: number;
  grid?: string;
  layout?: ColumnLayout;
};

type FixtureSpec = Omit<Fixture, 'name' | 'buildMs' | 'elements'>;

/** Three elements per item. */
const itemMarkup = (id: string, n: number, attributes = '') =>
  `<button data-keyrove-item id="${id}"${attributes}><span>Item ${n}</span><span>meta</span></button>`;

// `flex-wrap` holds four items a line, `flex row` all 20, `flex column` one.
const LAYOUT_STYLES: Record<ColumnLayout, { root: string; item?: string }> = {
  grid: { root: 'display:grid;grid-template-columns:repeat(4,4rem)' },
  'flex-wrap': {
    root: 'display:flex;flex-wrap:wrap;width:16rem',
    item: 'flex:0 0 25%;box-sizing:border-box',
  },
  'flex row': { root: 'display:flex' },
  'flex column': { root: 'display:flex;flex-direction:column' },
};

// Focus keys spread evenly over the page, each a distinct combo no case
// presses.
const pageMarkup = ({
  groups,
  focusKeys = 0,
  grid,
  layout = 'grid',
}: PageSpec) => {
  const total = groups * ITEMS_PER_GROUP;
  const every = focusKeys ? Math.floor(total / focusKeys) : 0;
  const styles = LAYOUT_STYLES[layout];
  const itemStyle = grid && styles.item ? ` style="${styles.item}"` : '';
  const parts: string[] = [];
  let n = 0;

  for (let g = 0; g < groups; g++) {
    const columns = grid
      ? ` data-keyrove-cols="${grid}" style="${styles.root}"`
      : '';
    parts.push(`<div class="group" id="g${g}" data-keyrove-root${columns}>`);

    for (let i = 0; i < ITEMS_PER_GROUP; i++, n++) {
      const key =
        every && n % every === 0 && n / every < focusKeys
          ? ` data-keyrove-focus-key="ctrl+alt+F${n / every + 1}"`
          : '';
      parts.push(itemMarkup(`g${g}i${i}`, i, `${key}${itemStyle}`));
    }
    parts.push('</div>');
  }

  return parts.join('');
};

// A visible item, `count` hidden ones, and a visible item.
const refusalMarkup = ({ count, hidden, roving, skip }: RefusalSpec) => {
  const stop = (holds: boolean) =>
    roving ? ` data-keyrove-roving-tabindex tabindex="${holds ? 0 : -1}"` : '';
  const style = hidden.replace(' ', '');
  const parts = [
    '<div class="group" id="g0" data-keyrove-root>',
    itemMarkup('first', 0, stop(true)),
  ];

  for (let i = 0; i < count; i++) {
    parts.push(
      itemMarkup(
        `hidden${i}`,
        i + 1,
        `${stop(false)} style="${style}"${skip ? ' data-keyrove-skip' : ''}`,
      ),
    );
  }
  parts.push(itemMarkup('last', count + 1, stop(false)), '</div>');

  return parts.join('');
};

const refusalName = ({ count, hidden, roving, skip }: RefusalSpec) =>
  `${count} × ${hidden}${roving ? ', roving' : ''}${skip ? ', skipped' : ''}`;

// The grids keep their earlier names, so saved results still compare.
const columnName = ({ layout, cols }: ColumnSpec) =>
  layout === 'grid' ? `M, cols="${cols}"` : `M, ${layout}, cols="${cols}"`;

let dirtied = false;

// Forces the next layout read to relayout, as when another listener wrote to
// the DOM earlier in the same task.
const dirtyLayout = () => {
  dirtied = !dirtied;
  host().style.paddingLeft = dirtied ? '1px' : '';
};

const build = (markup: () => string) => {
  const start = performance.now();
  host().innerHTML = markup();
  // Layout now, so the first timed call does not pay for it.
  void host().offsetHeight;

  return {
    buildMs: performance.now() - start,
    elements: document.getElementsByTagName('*').length,
  };
};

/** The same focus keys as `pageMarkup` declares, as a `focusKeys` map. */
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

const outcome = (result: MoveResult | null): Outcome =>
  result === null ? 'unhandled' : result.to ? 'moved' : 'consumed no-op';

type Press = [key: string, start: HTMLElement, code: () => string];

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

// Features are probed, not read off a version: the runner benchmarks any git
// ref. A case whose feature is missing would time the wrong thing, so it skips.
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

  // Two items a line in a flex-wrap row, which has no grid tracks: ArrowDown
  // lands a row down only if `auto` counts the items on the first line.
  const wrapColumns = tryIt(() => {
    host().innerHTML = `<div data-keyrove-root data-keyrove-cols="auto" style="display:flex;flex-wrap:wrap;width:8rem">${'<button data-keyrove-item style="flex:0 0 50%;box-sizing:border-box">x</button>'.repeat(4)}</div>`;
    const root = host().firstElementChild!;
    const items = Array.from(root.querySelectorAll('button'));
    items[0].focus();
    return keyRove(event('ArrowDown', items[0], root))?.to === items[2];
  });

  // A hidden item between two others: ArrowDown reaches the third only if
  // the move walks on past the item that refuses focus.
  const refusedFocus = tryIt(() => {
    host().innerHTML =
      '<div data-keyrove-root><button data-keyrove-item>a</button><button data-keyrove-item hidden>b</button><button data-keyrove-item>c</button></div>';
    const root = host().firstElementChild!;
    const items = Array.from(root.querySelectorAll('button'));
    items[0].focus();
    return keyRove(event('ArrowDown', items[0], root))?.to === items[2];
  });

  host().innerHTML = '';
  return { focusKeysMap, autoColumns, refusedFocus, wrapColumns };
};

const NO_FOCUS_KEYS_MAP = 'this version has no focusKeys option';
const NO_AUTO_COLUMNS = 'this version cannot read columns from the layout';
const NO_WRAP_COLUMNS =
  'this version reads a layout with no grid tracks as a list, so the key does not move';
const NO_REFUSED_FOCUS =
  'this version stops at an item that refuses focus instead of moving past it';

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

  /** `before` runs ahead of every press, inside the timing. */
  const run = async (
    section: string,
    label: string,
    fixture: Fixture,
    start: HTMLElement,
    currentTarget: EventTarget,
    code: () => string,
    config?: KeyRoveOptions,
    before?: () => void,
  ) => {
    signal?.throwIfAborted();
    start.focus();
    const call = () => {
      before?.();
      return keyRove(
        event(code(), document.activeElement, currentTarget),
        config,
      );
    };
    const result = outcome(call());
    start.focus();
    const timing = measure(call, options);
    record({ section, label, fixture, result, ...timing });
    await yieldToBrowser();
  };

  const page = async <Spec extends FixtureSpec>(
    name: string,
    spec: Spec,
    markup: (spec: Spec) => string,
  ) => {
    signal?.throwIfAborted();
    host().innerHTML = '';
    await yieldToBrowser();
    const built = build(() => markup(spec));
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
      const { fixture, group } = await page(name, { groups }, pageMarkup);

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
      const { fixture, group } = await page(
        `L, ${count} focus keys`,
        { groups: 1000, focusKeys: count },
        pageMarkup,
      );
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

    // C: a fixed column count against `auto`, which reads the layout, in a
    // grid and in flex layouts, on a laid-out page and with the layout
    // dirtied before each press.
    for (const column of COLUMNS) {
      const { layout, cols } = column;
      const name = columnName(column);
      const auto = cols === 'auto';
      const labels = COLUMN_KEYS.flatMap((key) =>
        LAYOUT_STATES.map((state) => `cols="${cols}", ${key}${state}`),
      );
      const forced = 'layout dirtied, then read, no handler';

      if (auto && !supports.autoColumns) {
        for (const label of [...labels, forced]) {
          skip({
            section: 'columns',
            label,
            fixture: name,
            reason: NO_AUTO_COLUMNS,
          });
        }
        continue;
      }

      const { fixture, group } = await page(
        name,
        { groups: 100, grid: cols },
        (spec) => pageMarkup({ ...spec, layout }),
      );
      const moves =
        layout === 'flex column'
          ? { prev: 'ArrowUp', next: 'ArrowDown' }
          : { prev: 'ArrowLeft', next: 'ArrowRight' };
      // Without first-line counting, a flex row with `auto` is a list, where
      // ArrowRight is unbound.
      const movesHere =
        !auto ||
        layout === 'grid' ||
        layout === 'flex column' ||
        supports.wrapColumns;

      for (const [key, start, code] of keys(group, moves)) {
        if (key === 'bound, no move') continue;

        for (const state of LAYOUT_STATES) {
          const label = `cols="${cols}", ${key}${state}`;

          if (key !== 'unbound' && !movesHere) {
            skip({
              section: 'columns',
              label,
              fixture: name,
              reason: NO_WRAP_COLUMNS,
            });
            continue;
          }

          await run(
            'columns',
            label,
            fixture,
            start,
            group,
            code,
            undefined,
            state ? dirtyLayout : undefined,
          );
          host().style.paddingLeft = '';
        }
      }

      // What the dirtied layout costs to read on this page, with no handler:
      // the most a layout read in the handler can add to a press.
      signal?.throwIfAborted();
      record({
        section: 'columns',
        label: forced,
        fixture,
        result: '-',
        ...measure(() => {
          dirtyLayout();
          sink = host().offsetHeight;
        }, options),
      });
      host().style.paddingLeft = '';
      await yieldToBrowser();
    }

    // D: a move past a run of items that refuse focus, local listener. Each
    // press goes from one visible item to the other, past the whole run.
    for (const refusal of REFUSALS) {
      const name = refusalName(refusal);
      const label = 'local, moves past the run';

      // Skipped items are never tried, in any version.
      if (!refusal.skip && !supports.refusedFocus) {
        skip({
          section: 'refused focus',
          label,
          fixture: name,
          reason: NO_REFUSED_FOCUS,
        });
        continue;
      }

      const { fixture, group } = await page(
        name,
        { groups: 1, items: refusal.count + 2 },
        () => refusalMarkup(refusal),
      );
      const first = group.firstElementChild as HTMLElement;

      await run('refused focus', label, fixture, first, group, () =>
        document.activeElement === first ? 'ArrowDown' : 'ArrowUp',
      );
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
