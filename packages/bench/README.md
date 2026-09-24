# keydown benchmark

Measures what one `keyRove` call costs in a real browser, on pages of
increasing size, with the listener on the group or on the document, for
unbound and bound keys, with and without focus keys, and with fixed or
`auto` columns.

It runs two ways: in a page you open in any browser, or in headless Chrome
from the command line. Both time the same code on the same page.

## Run

From the repository root:

```sh
pnpm bench                                   # open the UI: run it, read and compare reports
pnpm bench:headless                          # run the working tree's library in headless Chrome
pnpm bench:headless -- --ref v2.1.0          # run the library at a tag, saved as results/v2.1.0.json
pnpm bench:headless -- --name my-change      # run the working tree, saved as results/my-change.json
pnpm bench:headless -- --record              # run the working tree, saved as results/recorded.json
pnpm bench:headless -- --json out.json       # also write the report to any path
```

### In the browser

`pnpm bench` builds the library and opens the UI on a local server that
sends the cross-origin isolation headers. Press **Run benchmark**. A run
takes about 20 seconds; keep the tab in front while it runs, since browsers
throttle background tabs. Settings changes the timing (samples, minimum
batch, warmup). Runs with other settings than the defaults do not compare
like for like with runs that used them.

Under **Reports**, tick one report to read it, or several to compare them.
The list holds every file in `results/` and the last run made on the page.
The **µs / ms** switch sets the unit for every time on the page and for
what Copy Markdown copies; reports always store microseconds.
**Copy Markdown** copies whatever is shown, a report or a comparison, as
Markdown tables; **Download JSON** saves one report in the shape `--json`
writes, so a run made in the browser can go into `results/` too.

This is also how to measure Firefox or Safari: open the URL that
`pnpm bench` prints in that browser.

### Headless

`pnpm bench:headless` prints Markdown tables. Chrome or Chromium is found at
`CHROME_PATH`, else at its usual install locations. The runner turns on
focus emulation, so the headless page behaves as a focused window.

To update the recorded run, run with `--record`. Then replace the tables
under [Results](#results) with the printed output.

## Comparing versions

To see how releases compare, benchmark each one, then open the UI:

```sh
pnpm bench:headless -- --ref v2.1.0 --ref v2.2.0 --ref v2.3.0
pnpm bench
```

Each `--ref` is a tag, branch or commit, and each is saved as
`results/<ref>.json`. Three take under a minute. `--name` saves a single run
under another name; the working tree with your edits is compared against a
release this way:

```sh
pnpm bench:headless -- --ref v2.5.0
pnpm bench:headless -- --name my-change
```

Nothing is checked out. The benchmark is newer than most releases, so a
checkout of an old tag would take the benchmark with it. Instead the runner
reads the library's source at the ref out of git into a scratch directory,
builds it, and runs the current benchmark against it. Every library, the
working tree's included, is built the same way, with the settings
keyrove's own build uses, so two reports differ only in the library's
source.

Some cases time features older versions lack: the `focusKeys` option
arrived in 2.4.0 and `cols="auto"` in 2.5.0. Before running, the harness
tries each feature on the library, and a case whose feature is missing is
recorded as not run rather than timed. It would still run, but it would time
something other than its label. In a comparison those cases read n/a.

In the UI, the comparison starts with a summary of each report against the
baseline, which you choose under **Compare against**. **Overall** is the
geometric mean of the change over every case both reports measured.
**Faster** and **Slower** count the cases whose p10–p90 range does not
overlap the baseline's. The tables below it give every report's median per
case, and mark a change in the same way: an arrow and a colour where the
ranges part, grey where they overlap and the difference is noise.

Compare reports from one machine and one browser. The UI warns when the
reports differ in either, or in their timing settings. The UI reads
`results/` when it is built, which `pnpm bench` does on start, so restart it
to see reports saved since.

## Layout

| Path                        | What it is                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `src/keydown.ts`            | The benchmark: probes the library's features, builds each fixture, and times the cases.    |
| `src/plan.ts`               | What a run covers: page sizes, focus-key counts, grids, default timing.                    |
| `harness.html`              | The page the cases run in. It holds the fixture and almost nothing else.                   |
| `index.html`, `src/main.ts` | The UI. Each run loads a fresh harness in a frame, so none of the UI's markup is measured. |
| `src/view.ts`               | The UI's results, one report or a comparison, as HTML.                                     |
| `scripts/run.ts`            | The headless runner. It loads the harness in Chrome over the DevTools protocol.            |
| `scripts/library.ts`        | Reads the library's source at a git ref, or from the working tree, and builds it.          |
| `src/report.ts`             | The Markdown tables, for one report or a comparison.                                       |
| `src/results.ts`            | Helpers for reading runs: case lookup, comparison, formatting.                             |
| `src/types.ts`              | The shape of a report, as `--json` writes it.                                              |
| `results/`                  | Saved reports. `recorded.json` is the run the Results below come from.                     |

The UI uses the docs site's stylesheet and theme toggle directly from
`packages/docs/src`, so it looks like the site with no copy to keep in step.

The reports in `results/` and the modules in `src/` other than `main.ts` do
not touch the page, so another package can import them to show the numbers,
as a docs page would.

## Fixtures

Each fixture is a page of `data-keyrove-root` groups, each holding 20
`<button data-keyrove-item>` items with two spans inside, so three elements
per item:

| Fixture | Groups |  Items | Elements |
| ------- | -----: | -----: | -------: |
| S       |     10 |    200 |     ~620 |
| M       |    100 |  2,000 |   ~6,100 |
| L       |  1,000 | 20,000 |  ~61,000 |

Focus-key fixtures spread 10, 100 or 1,000 `data-keyrove-focus-key`
attributes evenly over the L page, each a distinct combo that no case
presses. Grid fixtures lay each M group out as a four-column CSS grid with
`data-keyrove-cols` set to `4` or `auto`.

Every press starts in the first group:

- **unbound:** `KeyQ`, which no binding matches.
- **bound, no move:** `End` on the last item, a consumed no-op.
- **bound, moves focus:** `ArrowDown`/`ArrowUp` between the first two items,
  or `ArrowRight`/`ArrowLeft` in a grid, calling `focus()` every time.

## Method

- Fixtures are built before timing, and their build time is reported
  separately.
- `keyRove` is called directly with a hand-built event object whose
  `currentTarget` is the group (a local listener) or `document`. Event
  dispatch is not timed.
- Each case warms up for 100 ms, doubles its batch size until a batch takes
  at least 10 ms, then times 15 batches. Tables give the median and the
  p10–p90 range of the per-call time.
- The cases run in `harness.html`, which holds the fixture and almost
  nothing else. The headless runner loads it directly, and the UI loads a
  fresh copy in a frame for each run, so neither counts or scans any UI
  markup. The harness has five fewer elements than the page the recorded run
  used, so a new run's element counts are that much lower.
- The page is cross-origin isolated, which gives `performance.now()` its
  finer resolution.
- Each case records what one call returned: `unhandled`, `consumed no-op` or
  `moved`. This confirms each case measures what its label says.
- The diagnostics time two parts of the focus-key lookup on their own: the
  document query for `[data-keyrove-focus-key]`, and `matchesCombo` over
  every declared combo.

## Results

Recorded on 2026-09-22 in headless Chrome, by what is now
`pnpm bench:headless`. The same run is in `results/recorded.json`.

### Environment

- Browser: Chrome/153.0.8010.53 (headless), V8 15.3.76.13
- OS: darwin 25.2.0 arm64
- CPU: Apple M1 Pro × 10
- Memory: 16 GB
- Node: v25.2.1
- Cross-origin isolated: true
- Timing: 100 ms warmup, then 15 batches of ≥ 10 ms per case
- Date: 2026-09-22

### Fixtures

| Fixture            | Groups | Items | Focus keys | Grid | Elements | Build (ms) |
| ------------------ | -----: | ----: | ---------: | ---- | -------: | ---------: |
| S                  |     10 |   200 |          0 | -    |      624 |       1.59 |
| M                  |    100 |  2000 |          0 | -    |     6114 |      11.82 |
| L                  |   1000 | 20000 |          0 | -    |    61014 |     139.89 |
| L, 0 focus keys    |   1000 | 20000 |          0 | -    |    61014 |     172.39 |
| L, 10 focus keys   |   1000 | 20000 |         10 | -    |    61014 |     117.89 |
| L, 100 focus keys  |   1000 | 20000 |        100 | -    |    61014 |     144.97 |
| L, 1000 focus keys |   1000 | 20000 |       1000 | -    |    61014 |     109.96 |
| M, cols="4"        |    100 |  2000 |          0 | 4    |     6114 |      15.01 |
| M, cols="auto"     |    100 |  2000 |          0 | auto |     6114 |      14.97 |

### baseline

| Fixture | Case                     | Result | Median (µs) | p10–p90 (µs) |   Batch |
| ------- | ------------------------ | ------ | ----------: | -----------: | ------: |
| S       | harness only, no handler | -      |        0.00 |    0.00–0.01 | 2097152 |

### listener

| Fixture | Case                         | Result         | Median (µs) | p10–p90 (µs) | Batch |
| ------- | ---------------------------- | -------------- | ----------: | -----------: | ----: |
| S       | local, unbound               | unhandled      |        2.68 |    2.64–2.93 |  4096 |
| S       | local, bound, no move        | consumed no-op |        9.43 |   8.60–10.01 |  1024 |
| S       | local, bound, moves focus    | moved          |       24.70 |  23.30–27.14 |   512 |
| S       | document, unbound            | unhandled      |        2.69 |    2.63–3.00 |  4096 |
| S       | document, bound, no move     | consumed no-op |        9.85 |   9.45–10.28 |  2048 |
| S       | document, bound, moves focus | moved          |       23.31 |  22.33–25.07 |   512 |
| M       | local, unbound               | unhandled      |        2.56 |    2.55–2.69 |  4096 |
| M       | local, bound, no move        | consumed no-op |        9.18 |    8.50–9.70 |  2048 |
| M       | local, bound, moves focus    | moved          |       22.57 |  22.17–27.47 |   512 |
| M       | document, unbound            | unhandled      |        2.57 |    2.55–2.63 |  4096 |
| M       | document, bound, no move     | consumed no-op |        8.73 |   8.37–10.59 |  1024 |
| M       | document, bound, moves focus | moved          |       22.49 |  22.22–26.24 |   512 |
| L       | local, unbound               | unhandled      |        2.59 |    2.57–2.62 |  4096 |
| L       | local, bound, no move        | consumed no-op |        9.09 |    9.01–9.83 |  2048 |
| L       | local, bound, moves focus    | moved          |       22.16 |  21.82–22.90 |   512 |
| L       | document, unbound            | unhandled      |        2.57 |    2.55–2.65 |  4096 |
| L       | document, bound, no move     | consumed no-op |        8.77 |   8.50–10.00 |  2048 |
| L       | document, bound, moves focus | moved          |       24.50 |  23.91–25.21 |   512 |

### focus keys

| Fixture            | Case                            | Result    | Median (µs) |  p10–p90 (µs) | Batch |
| ------------------ | ------------------------------- | --------- | ----------: | ------------: | ----: |
| L, 0 focus keys    | 0 × attribute scan              | unhandled |        2.65 |     2.60–2.76 |  4096 |
| L, 0 focus keys    | 0 × focusKeys map, elements     | unhandled |        2.42 |     2.35–2.50 |  8192 |
| L, 0 focus keys    | 0 × focusKeys map, selectors    | unhandled |        2.36 |     2.33–2.40 |  8192 |
| L, 10 focus keys   | 10 × attribute scan             | unhandled |       18.32 |   17.74–18.87 |  1024 |
| L, 10 focus keys   | 10 × focusKeys map, elements    | unhandled |        4.41 |     4.34–4.47 |  4096 |
| L, 10 focus keys   | 10 × focusKeys map, selectors   | unhandled |        4.97 |     4.92–5.06 |  2048 |
| L, 100 focus keys  | 100 × attribute scan            | unhandled |       68.46 |   67.71–68.81 |   256 |
| L, 100 focus keys  | 100 × focusKeys map, elements   | unhandled |       41.27 |   40.41–42.68 |   256 |
| L, 100 focus keys  | 100 × focusKeys map, selectors  | unhandled |       49.73 |   49.41–50.10 |   256 |
| L, 1000 focus keys | 1000 × attribute scan           | unhandled |      575.78 | 560.00–599.22 |    32 |
| L, 1000 focus keys | 1000 × focusKeys map, elements  | unhandled |      420.31 | 412.50–429.37 |    32 |
| L, 1000 focus keys | 1000 × focusKeys map, selectors | unhandled |      855.00 | 795.31–905.94 |    16 |
| L, 1000 focus keys | 1000 on page, local listener    | unhandled |        3.43 |     3.24–4.42 |  4096 |

### diagnostics

| Fixture            | Case                                      | Result | Median (µs) |  p10–p90 (µs) |   Batch |
| ------------------ | ----------------------------------------- | ------ | ----------: | ------------: | ------: |
| L, 0 focus keys    | 0 × querySelectorAll over the document    | -      |        0.09 |     0.08–0.13 |  131072 |
| L, 0 focus keys    | 0 × matchesCombo, none matching           | -      |        0.01 |     0.01–0.01 | 2097152 |
| L, 10 focus keys   | 10 × querySelectorAll over the document   | -      |        9.74 |    9.44–10.12 |    1024 |
| L, 10 focus keys   | 10 × matchesCombo, none matching          | -      |        1.09 |     1.08–1.11 |   16384 |
| L, 100 focus keys  | 100 × querySelectorAll over the document  | -      |       24.15 |   23.53–25.67 |     512 |
| L, 100 focus keys  | 100 × matchesCombo, none matching         | -      |       24.44 |   24.03–25.01 |     512 |
| L, 1000 focus keys | 1000 × querySelectorAll over the document | -      |      141.60 | 122.81–309.26 |     128 |
| L, 1000 focus keys | 1000 × matchesCombo, none matching        | -      |      287.81 | 278.12–305.08 |      64 |

### columns

| Fixture        | Case                            | Result    | Median (µs) | p10–p90 (µs) | Batch |
| -------------- | ------------------------------- | --------- | ----------: | -----------: | ----: |
| M, cols="4"    | cols="4", unbound               | unhandled |        5.03 |    4.95–5.24 |  2048 |
| M, cols="4"    | cols="4", bound, moves focus    | moved     |       26.89 |  26.68–27.72 |   512 |
| M, cols="auto" | cols="auto", unbound            | unhandled |        6.75 |    6.56–7.25 |  2048 |
| M, cols="auto" | cols="auto", bound, moves focus | moved     |       29.86 |  28.81–32.46 |   512 |

## Findings

1. **Page size and listener placement do not change the cost when there are
   no focus keys.** From 200 to 20,000 items, and with the listener on the
   group or on the document, an unbound key costs about 2.6 µs. A bound key
   with nowhere to go costs about 9 µs, and a move, including the browser's
   `focus()`, costs 22–25 µs. A move reads only the target's group. Chrome
   answers the document query for focus keys in about 0.1 µs when nothing
   matches, even on 61,000 elements.
2. **Focus keys in the listener's reach are the one cost that grows.** It
   grows linearly with their number and is paid on every keydown the listener
   handles, unbound keys included. Under a document listener, attribute
   scanning costs 18 µs for 10 focus keys, 68 µs for 100 and 0.58 ms for
   1,000. A local listener stays at 3.4 µs with 1,000 focus keys elsewhere on
   the page. A `focusKeys` map of elements is cheaper (0.42 ms at 1,000). A
   map of selectors is the most expensive (0.86 ms), because each selector
   is queried on every press.
3. **At 1,000 focus keys, matching the press is the largest share.** Testing
   the press against every combo with `matchesCombo` takes 288 µs, about half
   of the 0.58 ms total, and the document query takes 142 µs. The rest is
   reading and filtering each target and building the binding table.
4. **Columns and direction cost a few microseconds.** `cols="auto"` adds
   1.7–3 µs over a fixed count. A grid's unbound key costs about 2.4 µs more
   than a list's, because its default next/prev keys read the computed
   direction when no `dir` attribute is set.

## Conclusion

No change is warranted. The costliest realistic case measured, 100 focus
keys under a document listener, stays under 0.1 ms per keydown. Only the
synthetic 1,000 focus keys reach 0.4–0.9 ms. That is under a 16 ms frame,
and would stay under 10 ms on a CPU ten times slower. Caching items or
bindings would give up reading the current DOM on every press, and nothing
measured here pays for it: page size and listener placement make no
difference.

If pages with hundreds of focus keys under one listener become a real use
case, the measured follow-up is to memoize each combo string's parsed form
inside `matchesCombo`. Parsing is a pure function of the string, so the
cache needs no DOM invalidation. It targets the largest share measured, 288
of 576 µs at 1,000 focus keys. Run this benchmark before and after such a
change.

## Limitations

- The automated run uses Chrome only. Chrome's fast answer for a
  zero-match attribute query may not exist in other engines. Use `pnpm bench`
  and open its URL in Firefox or Safari to measure them.
- The numbers come from one desktop machine, and absolute times scale with
  the hardware.
- Direct calls leave out event dispatch and propagation, which the browser
  pays whatever the handler does.
- The move cases focus two adjacent visible buttons, so scrolling into view
  is not exercised.

## CI

The benchmark does not gate CI. Record baselines on the target runners
before choosing thresholds, since shared runners vary from run to run.
