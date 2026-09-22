/**
 * What one keydown costs keyRove, measured in a real browser.
 *
 * Every case builds its fixture first and then times the handler alone: the
 * handler is called directly with an event object, so neither fixture
 * construction nor event dispatch is in the numbers. Each case warms up,
 * picks a batch size that takes at least `minBatchMs`, and reports the
 * per-call time of `samples` such batches.
 *
 * Loaded by `index.html`. `run.mjs` calls `runBench()` in headless Chrome; the
 * page's Run button does the same in any browser.
 */

import { keyRove, matchesCombo } from '../dist/index.js';

const ITEMS_PER_GROUP = 20;
const SIZES = [
  ['S', 10],
  ['M', 100],
  ['L', 1000],
];

const host = () => document.getElementById('fixture');

const noop = () => {};

// Written by the baseline, so the engine cannot drop the work it times.
let sink;

/** The event keyRove reads, built by hand so no dispatch is timed. */
const event = (code, target, currentTarget) => ({
  code,
  key: code,
  target,
  currentTarget,
  preventDefault: noop,
});

/**
 * A page of `groups` roots with 20 button items each, every item holding two
 * spans: three elements per item. `focusKeys` items spread evenly over the
 * page carry a focus key of their own, each a distinct combo that no case
 * presses. `grid` lays each group out as a four-column CSS grid, with `cols`
 * set to `4` or `auto`.
 */
const buildPage = ({ groups, focusKeys = 0, grid = null }) => {
  const start = performance.now();
  const total = groups * ITEMS_PER_GROUP;
  const every = focusKeys ? Math.floor(total / focusKeys) : 0;
  const parts = [];
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
const focusKeyMap = (count, values) => {
  const map = {};
  const targets = Array.from(
    host().querySelectorAll('[data-keyrove-focus-key]'),
  );

  for (const target of targets.slice(0, count)) {
    const combo = target.getAttribute('data-keyrove-focus-key');
    map[combo] = values === 'selectors' ? `#${target.id}` : target;
  }

  return map;
};

const quantile = (sorted, q) =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

/** Per-call time of `fn`, in microseconds, over `samples` timed batches. */
const measure = (fn, { samples, minBatchMs, warmupMs }) => {
  const warmupEnd = performance.now() + warmupMs;
  while (performance.now() < warmupEnd) fn();

  let batch = 1;
  for (;;) {
    const start = performance.now();
    for (let i = 0; i < batch; i++) fn();
    if (performance.now() - start >= minBatchMs) break;
    batch *= 2;
  }

  const perCall = [];
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
const outcome = (result) =>
  result === null ? 'unhandled' : result.to ? 'moved' : 'consumed no-op';

/**
 * The three keys each fixture is pressed with, from group 0: an unbound key,
 * a bound key with nowhere to go (End on the last item), and a bound key
 * that moves focus back and forth between the first two items.
 */
const keys = (group, { prev = 'ArrowUp', next = 'ArrowDown' } = {}) => {
  const first = group.firstElementChild;
  const last = group.lastElementChild;

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

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve));

export const runBench = async ({
  samples = 15,
  minBatchMs = 10,
  warmupMs = 100,
} = {}) => {
  const options = { samples, minBatchMs, warmupMs };
  const fixtures = [];
  const cases = [];

  /** Times one press from `start`, with the listener on `currentTarget`. */
  const run = async (
    section,
    label,
    fixture,
    start,
    currentTarget,
    code,
    config,
  ) => {
    start.focus();
    const call = () =>
      keyRove(event(code(), document.activeElement, currentTarget), config);
    const result = outcome(call());
    start.focus();
    const timing = measure(call, options);
    cases.push({ section, label, fixture, result, ...timing });
    await yieldToBrowser();
  };

  const page = async (name, spec) => {
    host().innerHTML = '';
    await yieldToBrowser();
    const built = buildPage(spec);
    const fixture = { name, ...spec, ...built };
    fixtures.push(fixture);

    return { fixture, group: document.getElementById('g0') };
  };

  // A: listener placement, by key and page size, with no focus keys.
  for (const [name, groups] of SIZES) {
    const { fixture, group } = await page(name, { groups });

    // The floor, once: the harness building the event and calling nothing.
    if (name === 'S') {
      const first = group.firstElementChild;
      const timing = measure(() => {
        sink = event('KeyQ', first, group);
      }, options);
      cases.push({
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
    ]) {
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
  for (const count of [0, 10, 100, 1000]) {
    const { fixture, group } = await page(`L, ${count} focus keys`, {
      groups: 1000,
      focusKeys: count,
    });
    const first = group.firstElementChild;
    const unbound = () => 'KeyQ';

    await run(
      'focus keys',
      `${count} × attribute scan`,
      fixture,
      first,
      document,
      unbound,
    );
    await run(
      'focus keys',
      `${count} × focusKeys map, elements`,
      fixture,
      first,
      document,
      unbound,
      { focusKeys: focusKeyMap(count, 'elements') },
    );
    await run(
      'focus keys',
      `${count} × focusKeys map, selectors`,
      fixture,
      first,
      document,
      unbound,
      { focusKeys: focusKeyMap(count, 'selectors') },
    );

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
    const combos = Array.from(
      document.querySelectorAll('[data-keyrove-focus-key]'),
      (target) => target.getAttribute('data-keyrove-focus-key'),
    );
    const press = event('KeyQ', first, document);
    cases.push({
      section: 'diagnostics',
      label: `${count} × querySelectorAll over the document`,
      fixture,
      result: '-',
      ...measure(() => {
        sink = document.querySelectorAll('[data-keyrove-focus-key]').length;
      }, options),
    });
    cases.push({
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
  for (const grid of ['4', 'auto']) {
    const { fixture, group } = await page(`M, cols="${grid}"`, {
      groups: 100,
      grid,
    });

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

  host().innerHTML = '';

  return {
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
    options,
    fixtures,
    cases,
  };
};

window.runBench = runBench;
