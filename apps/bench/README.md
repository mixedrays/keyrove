# keydown benchmark

Measures what one `keyRove` call costs in a real browser, on pages of
increasing size, with the listener on the group or on the document, for
unbound and bound keys, with and without focus keys, with fixed or `auto`
columns in grid and flex layouts, and for a move past a run of items that
refuse focus.

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
focus emulation, so the headless page behaves as a focused window. Each run
gets a fresh Chrome profile in the temp directory, removed once Chrome has
exited; if a profile or scratch directory can't be removed, the runner
names it in a warning and still prints and saves the report.

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
arrived in 2.4.0, `cols="auto"` in 2.5.0, and a move past an item that
refuses focus and `cols="auto"` on a flex layout after 2.6.1. Before running, the harness tries each feature on
the library, and a case whose feature is missing is recorded as not run
rather than timed. It would still run, but it would time
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
| `src/plan.ts`               | What a run covers: page sizes, focus-key counts, column layouts, refusal runs, timing.     |
| `harness.html`              | The page the cases run in. It holds the fixture and almost nothing else.                   |
| `index.html`, `src/main.ts` | The UI. Each run loads a fresh harness in a frame, so none of the UI's markup is measured. |
| `src/view.ts`               | The UI's results, one report or a comparison, as HTML.                                     |
| `scripts/run.ts`            | The headless runner. It loads the harness in Chrome over the DevTools protocol.            |
| `scripts/library.ts`        | Reads the library's source at a git ref, or from the working tree, and builds it.          |
| `src/report.ts`             | The Markdown tables, for one report or a comparison.                                       |
| `src/results.ts`            | Helpers for reading runs: case lookup, comparison, formatting.                             |
| `src/types.ts`              | The shape of a report, as `--json` writes it.                                              |
| `results/`                  | Saved reports. `recorded.json` is the run the Results below come from.                     |

The UI uses the docs site's stylesheet and theme helpers directly from
`apps/docs/src`, so it looks like the site with no copy to keep in step.

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
presses.

Column fixtures lay each M group out one way and set `data-keyrove-cols`:

| Layout      | Each group                       | `cols`      | What `auto` reads                |
| ----------- | -------------------------------- | ----------- | -------------------------------- |
| grid        | a four-column CSS grid           | `4`, `auto` | the grid's tracks                |
| flex-wrap   | a wrapping flex row, 4 to a line | `4`, `auto` | the first line's items: 4, and 1 |
| flex row    | one flex row of all 20           | `auto`      | the first line's items: all 20   |
| flex column | a flex column, 1 to a line       | `1`, `auto` | the first line's items: 1, and 1 |

The grids keep their earlier names, `M, cols="4"` and `M, cols="auto"`; the
flex fixtures are named by layout, such as `M, flex-wrap, cols="auto"`.

Refused-focus fixtures are one group each: a visible item, a run of 1 to
1,000 items hidden with `display: none` or `visibility: hidden`, and another
visible item. They are named by the run. In the `roving` one every item
carries `data-keyrove-roving-tabindex`, so the tab stop is carried onto each
hidden item and put back. In the `skipped` one the run carries
`data-keyrove-skip`.

Every press starts in the first group:

- **unbound:** `KeyQ`, which no binding matches.
- **bound, no move:** `End` on the last item, a consumed no-op.
- **bound, moves focus:** `ArrowDown`/`ArrowUp` between the first two items,
  or `ArrowRight`/`ArrowLeft` in a grid, a flex-wrap or a flex row, calling
  `focus()` every time.
- **layout dirtied:** on a column fixture, the unbound key and the move again,
  with the fixture's padding changed just before each press. A read of the
  layout in the handler then lays the page out first, as it would after
  another listener wrote to the DOM earlier in the same task. Each column
  fixture also times that change and one layout read with no handler at all:
  what the layout costs on that page.
- **moves past the run:** `ArrowDown`/`ArrowUp` between the two visible items
  of a refused-focus page, under a local listener. Each press tries `focus()`
  on every hidden item on the way, unless the run is skipped.

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
  markup.
- The page is cross-origin isolated, which gives `performance.now()` its
  finer resolution.
- Each case records what one call returned: `unhandled`, `consumed no-op` or
  `moved`. This confirms each case measures what its label says.
- The diagnostics time two parts of the focus-key lookup on their own: the
  document query for `[data-keyrove-focus-key]`, and `matchesCombo` over
  every declared combo.

## Results

Recorded on 2026-11-07 in headless Chrome by `pnpm bench:headless -- --record`.
The same run is in `results/recorded.json`.

### Environment

- Library: 2.6.0 (working tree at 3186092, with uncommitted changes)
- Browser: Chrome/156.0.8078.80 (headless), V8 15.6.75.27
- OS: darwin 25.2.0 arm64
- CPU: Apple M1 Pro × 10
- Memory: 16 GB
- Node: v25.2.1
- Cross-origin isolated: true
- Timing: 100 ms warmup, then 15 batches of ≥ 10 ms per case
- Date: 2026-11-07

### Fixtures

| Fixture                       | Groups | Items | Focus keys | Grid | Elements | Build (ms) |
| ----------------------------- | -----: | ----: | ---------: | ---- | -------: | ---------: |
| S                             |     10 |   200 |          0 | -    |      618 |       1.63 |
| M                             |    100 |  2000 |          0 | -    |     6108 |      11.45 |
| L                             |   1000 | 20000 |          0 | -    |    61008 |     128.90 |
| L, 0 focus keys               |   1000 | 20000 |          0 | -    |    61008 |     136.04 |
| L, 10 focus keys              |   1000 | 20000 |         10 | -    |    61008 |     107.09 |
| L, 100 focus keys             |   1000 | 20000 |        100 | -    |    61008 |     103.56 |
| L, 1000 focus keys            |   1000 | 20000 |       1000 | -    |    61008 |     130.81 |
| M, cols="4"                   |    100 |  2000 |          0 | 4    |     6108 |      13.63 |
| M, cols="auto"                |    100 |  2000 |          0 | auto |     6108 |      11.34 |
| M, flex-wrap, cols="4"        |    100 |  2000 |          0 | 4    |     6108 |      12.80 |
| M, flex-wrap, cols="auto"     |    100 |  2000 |          0 | auto |     6108 |      12.28 |
| M, flex row, cols="auto"      |    100 |  2000 |          0 | auto |     6108 |      11.91 |
| M, flex column, cols="1"      |    100 |  2000 |          0 | 1    |     6108 |       9.30 |
| M, flex column, cols="auto"   |    100 |  2000 |          0 | auto |     6108 |       9.37 |
| 1 × display: none             |      1 |     3 |          0 | -    |       18 |       0.32 |
| 10 × display: none            |      1 |    12 |          0 | -    |       45 |       0.21 |
| 100 × display: none           |      1 |   102 |          0 | -    |      315 |       0.37 |
| 1000 × display: none          |      1 |  1002 |          0 | -    |     3015 |       1.69 |
| 1000 × visibility: hidden     |      1 |  1002 |          0 | -    |     3015 |       5.61 |
| 1000 × display: none, roving  |      1 |  1002 |          0 | -    |     3015 |       3.14 |
| 1000 × display: none, skipped |      1 |  1002 |          0 | -    |     3015 |       1.50 |

### baseline

| Fixture | Case                     | Result | Median (µs) | p10–p90 (µs) |    Batch |
| ------- | ------------------------ | ------ | ----------: | -----------: | -------: |
| S       | harness only, no handler | -      |        0.00 |    0.00–0.00 | 16777216 |

### listener

| Fixture | Case                         | Result         | Median (µs) | p10–p90 (µs) | Batch |
| ------- | ---------------------------- | -------------- | ----------: | -----------: | ----: |
| S       | local, unbound               | unhandled      |        1.28 |    1.19–1.50 |  8192 |
| S       | local, bound, no move        | consumed no-op |        8.53 |    7.95–9.17 |  2048 |
| S       | local, bound, moves focus    | moved          |       22.51 |  21.83–24.92 |   512 |
| S       | document, unbound            | unhandled      |        1.21 |    1.17–1.44 |  8192 |
| S       | document, bound, no move     | consumed no-op |        8.63 |    8.10–9.20 |  2048 |
| S       | document, bound, moves focus | moved          |       22.24 |  21.56–25.40 |   512 |
| M       | local, unbound               | unhandled      |        1.25 |    1.13–1.30 | 16384 |
| M       | local, bound, no move        | consumed no-op |        8.30 |    7.87–9.13 |  2048 |
| M       | local, bound, moves focus    | moved          |       21.62 |  20.07–24.27 |   512 |
| M       | document, unbound            | unhandled      |        1.15 |    1.14–1.45 |  8192 |
| M       | document, bound, no move     | consumed no-op |        8.24 |    7.79–9.87 |  2048 |
| M       | document, bound, moves focus | moved          |       21.80 |  21.29–23.47 |   512 |
| L       | local, unbound               | unhandled      |        1.15 |    1.13–1.38 |  8192 |
| L       | local, bound, no move        | consumed no-op |        8.27 |    8.08–9.52 |  2048 |
| L       | local, bound, moves focus    | moved          |       22.40 |  21.91–22.81 |   512 |
| L       | document, unbound            | unhandled      |        1.14 |    1.12–1.37 |  8192 |
| L       | document, bound, no move     | consumed no-op |        8.47 |    7.84–9.52 |  2048 |
| L       | document, bound, moves focus | moved          |       21.76 |  21.45–23.32 |   512 |

### focus keys

| Fixture            | Case                            | Result    | Median (µs) |  p10–p90 (µs) | Batch |
| ------------------ | ------------------------------- | --------- | ----------: | ------------: | ----: |
| L, 0 focus keys    | 0 × attribute scan              | unhandled |        1.15 |     1.10–1.35 |  8192 |
| L, 0 focus keys    | 0 × focusKeys map, elements     | unhandled |        0.95 |     0.92–1.00 | 16384 |
| L, 0 focus keys    | 0 × focusKeys map, selectors    | unhandled |        0.95 |     0.91–1.03 | 16384 |
| L, 10 focus keys   | 10 × attribute scan             | unhandled |       16.42 |   15.87–17.01 |  1024 |
| L, 10 focus keys   | 10 × focusKeys map, elements    | unhandled |        3.27 |     3.17–3.35 |  4096 |
| L, 10 focus keys   | 10 × focusKeys map, selectors   | unhandled |        3.86 |     3.77–3.97 |  4096 |
| L, 100 focus keys  | 100 × attribute scan            | unhandled |       69.06 |   68.26–70.62 |   256 |
| L, 100 focus keys  | 100 × focusKeys map, elements   | unhandled |       42.11 |   41.37–43.55 |   256 |
| L, 100 focus keys  | 100 × focusKeys map, selectors  | unhandled |       50.16 |   49.63–50.92 |   256 |
| L, 1000 focus keys | 1000 × attribute scan           | unhandled |      657.81 | 605.94–737.50 |    16 |
| L, 1000 focus keys | 1000 × focusKeys map, elements  | unhandled |      460.47 | 436.88–470.16 |    32 |
| L, 1000 focus keys | 1000 × focusKeys map, selectors | unhandled |      742.50 | 725.31–795.00 |    16 |
| L, 1000 focus keys | 1000 on page, local listener    | unhandled |        2.53 |     2.46–3.63 |  2048 |

### diagnostics

| Fixture            | Case                                      | Result | Median (µs) |  p10–p90 (µs) |   Batch |
| ------------------ | ----------------------------------------- | ------ | ----------: | ------------: | ------: |
| L, 0 focus keys    | 0 × querySelectorAll over the document    | -      |        0.08 |     0.08–0.11 |  131072 |
| L, 0 focus keys    | 0 × matchesCombo, none matching           | -      |        0.01 |     0.01–0.01 | 2097152 |
| L, 10 focus keys   | 10 × querySelectorAll over the document   | -      |        9.15 |     8.96–9.34 |    2048 |
| L, 10 focus keys   | 10 × matchesCombo, none matching          | -      |        1.05 |     1.04–1.06 |   16384 |
| L, 100 focus keys  | 100 × querySelectorAll over the document  | -      |       24.03 |   23.00–24.90 |     512 |
| L, 100 focus keys  | 100 × matchesCombo, none matching         | -      |       23.71 |   22.99–24.01 |     512 |
| L, 1000 focus keys | 1000 × querySelectorAll over the document | -      |      110.16 | 107.58–114.96 |     128 |
| L, 1000 focus keys | 1000 × matchesCombo, none matching        | -      |      229.30 | 226.72–236.56 |      64 |

### columns

| Fixture                     | Case                                            | Result    | Median (µs) |    p10–p90 (µs) | Batch |
| --------------------------- | ----------------------------------------------- | --------- | ----------: | --------------: | ----: |
| M, cols="4"                 | cols="4", unbound                               | unhandled |        1.19 |       1.17–1.43 |  8192 |
| M, cols="4"                 | cols="4", unbound, layout dirtied               | unhandled |        1.37 |       1.35–1.61 |  8192 |
| M, cols="4"                 | cols="4", bound, moves focus                    | moved     |       26.50 |     25.49–27.51 |   512 |
| M, cols="4"                 | cols="4", bound, moves focus, layout dirtied    | moved     |     1084.69 | 1040.31–1342.81 |    16 |
| M, cols="4"                 | layout dirtied, then read, no handler           | -         |      973.12 |  947.19–1236.56 |    16 |
| M, cols="auto"              | cols="auto", unbound                            | unhandled |        1.26 |       1.15–1.32 | 16384 |
| M, cols="auto"              | cols="auto", unbound, layout dirtied            | unhandled |        1.33 |       1.31–1.54 |  8192 |
| M, cols="auto"              | cols="auto", bound, moves focus                 | moved     |       28.54 |     28.13–29.22 |   512 |
| M, cols="auto"              | cols="auto", bound, moves focus, layout dirtied | moved     |     1033.12 | 1003.13–1302.19 |    16 |
| M, cols="auto"              | layout dirtied, then read, no handler           | -         |      994.69 |  939.06–1248.44 |    16 |
| M, flex-wrap, cols="4"      | cols="4", unbound                               | unhandled |        1.17 |       1.14–1.39 |  8192 |
| M, flex-wrap, cols="4"      | cols="4", unbound, layout dirtied               | unhandled |        1.36 |       1.33–1.57 |  8192 |
| M, flex-wrap, cols="4"      | cols="4", bound, moves focus                    | moved     |       26.41 |     25.52–27.51 |   512 |
| M, flex-wrap, cols="4"      | cols="4", bound, moves focus, layout dirtied    | moved     |       50.37 |     49.75–52.09 |   256 |
| M, flex-wrap, cols="4"      | layout dirtied, then read, no handler           | -         |       20.05 |     19.62–20.47 |   512 |
| M, flex-wrap, cols="auto"   | cols="auto", unbound                            | unhandled |        1.18 |       1.15–1.40 |  8192 |
| M, flex-wrap, cols="auto"   | cols="auto", unbound, layout dirtied            | unhandled |        1.35 |       1.32–1.60 |  8192 |
| M, flex-wrap, cols="auto"   | cols="auto", bound, moves focus                 | moved     |       30.18 |     29.58–35.42 |   512 |
| M, flex-wrap, cols="auto"   | cols="auto", bound, moves focus, layout dirtied | moved     |       55.49 |     54.96–56.27 |   256 |
| M, flex-wrap, cols="auto"   | layout dirtied, then read, no handler           | -         |       19.59 |     19.56–19.80 |   512 |
| M, flex row, cols="auto"    | cols="auto", unbound                            | unhandled |        1.16 |       1.13–1.38 |  8192 |
| M, flex row, cols="auto"    | cols="auto", unbound, layout dirtied            | unhandled |        1.33 |       1.30–1.56 |  8192 |
| M, flex row, cols="auto"    | cols="auto", bound, moves focus                 | moved     |       36.44 |     35.97–42.33 |   512 |
| M, flex row, cols="auto"    | cols="auto", bound, moves focus, layout dirtied | moved     |      823.75 |   796.25–954.37 |    16 |
| M, flex row, cols="auto"    | layout dirtied, then read, no handler           | -         |      755.94 |   736.56–899.37 |    16 |
| M, flex column, cols="1"    | cols="1", unbound                               | unhandled |        1.15 |       1.14–1.38 |  8192 |
| M, flex column, cols="1"    | cols="1", unbound, layout dirtied               | unhandled |        1.32 |       1.30–1.55 |  8192 |
| M, flex column, cols="1"    | cols="1", bound, moves focus                    | moved     |       24.41 |     24.01–25.75 |   512 |
| M, flex column, cols="1"    | cols="1", bound, moves focus, layout dirtied    | moved     |     3570.00 | 3202.50–4273.75 |     4 |
| M, flex column, cols="1"    | layout dirtied, then read, no handler           | -         |     3490.00 | 3087.50–4225.00 |     4 |
| M, flex column, cols="auto" | cols="auto", unbound                            | unhandled |        1.17 |       1.14–1.40 |  8192 |
| M, flex column, cols="auto" | cols="auto", unbound, layout dirtied            | unhandled |        1.31 |       1.31–1.54 |  8192 |
| M, flex column, cols="auto" | cols="auto", bound, moves focus                 | moved     |       27.28 |     26.92–28.05 |   512 |
| M, flex column, cols="auto" | cols="auto", bound, moves focus, layout dirtied | moved     |     3450.00 | 3200.00–4547.50 |     4 |
| M, flex column, cols="auto" | layout dirtied, then read, no handler           | -         |     3343.75 | 3108.75–4696.25 |     4 |

### refused focus

| Fixture                       | Case                      | Result | Median (µs) |    p10–p90 (µs) | Batch |
| ----------------------------- | ------------------------- | ------ | ----------: | --------------: | ----: |
| 1 × display: none             | local, moves past the run | moved  |       21.85 |     21.35–23.19 |   512 |
| 10 × display: none            | local, moves past the run | moved  |       27.47 |     27.23–30.32 |   512 |
| 100 × display: none           | local, moves past the run | moved  |       85.59 |     82.58–98.48 |   128 |
| 1000 × display: none          | local, moves past the run | moved  |      629.84 |   612.81–688.12 |    32 |
| 1000 × visibility: hidden     | local, moves past the run | moved  |      620.16 |   608.44–697.97 |    32 |
| 1000 × display: none, roving  | local, moves past the run | moved  |     1408.12 | 1350.63–1643.75 |     8 |
| 1000 × display: none, skipped | local, moves past the run | moved  |      331.72 |   323.75–368.13 |    32 |

## Findings

1. **Page size and listener placement do not change the cost when there are
   no focus keys.** From 200 to 20,000 items, and with the listener on the
   group or on the document, an unbound key costs about 1.2 µs. A bound key
   with nowhere to go costs about 8.5 µs, and a move, including the browser's
   `focus()`, costs about 22 µs. A move reads only the target's group. Chrome
   answers the document query for focus keys in about 0.1 µs when nothing
   matches, even on 61,000 elements.
2. **Focus keys in the listener's reach are the one cost that grows with the
   page.** It grows linearly with their number and is paid on every keydown
   the listener handles, unbound keys included. Under a document listener,
   attribute scanning costs 16 µs for 10 focus keys, 69 µs for 100 and
   0.66 ms for 1,000. A local listener stays at 2.5 µs with 1,000 focus keys
   elsewhere on the page. A `focusKeys` map of elements is cheaper (0.46 ms
   at 1,000). A map of selectors is the most expensive (0.74 ms), because
   each selector is queried on every press.
3. **At 1,000 focus keys, matching the press is the largest share.** Testing
   the press against every combo with `matchesCombo` takes 229 µs, over a
   third of the 0.66 ms total, and the document query takes 110 µs. The rest
   is reading and filtering each target.
4. **Columns cost nothing on a key no move is bound to, and a few
   microseconds on a move.** An unbound key reads no layout, so it costs
   about 1.2 µs whatever the columns, `auto` included. A move with
   `cols="auto"` costs 2 µs more than with a fixed count in a grid, 3–4 µs
   more in a flex-wrap row of four or a flex column, and 10 µs more in a flex
   row of 20, where it reads the box of every item on the line.
5. **A layout that has changed since the last read is laid out by moves
   alone, whatever the column count.** With the layout dirtied before each
   press, an unbound key still costs about 1.3 µs on every column page. A
   move costs one layout of the page, from 20 µs (flex-wrap rows of a fixed
   width) to 3.5 ms (a flex column), with a fixed count as with `auto`: the
   browser's `focus()` lays the page out either way.
6. **A run of items that refuse focus costs one pass over it, and `skip` is
   still the fast path.** A move past 1,000 hidden items that are not skipped
   tries `focus()` on each and costs 0.63 ms with `display: none` and
   0.62 ms with `visibility: hidden`. It costs 1.4 ms when each item carries
   a roving stop, which is carried onto it and put back. From 100 to 1,000
   items the cost grows 7.4 times. The same 1,000 items marked skipped cost
   0.33 ms, since no move tries to focus them.

## Conclusion

No change is warranted. The costliest realistic case measured, 100 focus
keys under a document listener, stays under 0.1 ms per keydown. Only the
synthetic 1,000 focus keys reach 0.5–0.7 ms, and a move past 1,000 hidden
items that are not skipped 0.6–1.4 ms. That is under a 16 ms frame,
and would stay under 10 ms on a CPU ten times slower. Caching items or
bindings would give up reading the current DOM on every press, and nothing
measured here pays for it: page size and listener placement make no
difference.

`cols="auto"` reads the layout only for a press that could move. A move lays
the page out in `focus()` anyway, so `auto` adds no layout of its own to it.
The one press where `auto` lays out a changed page that a fixed count would
not is a bound key with nowhere to go, such as End on the last item.

If pages with hundreds of focus keys under one listener become a real use
case, the measured follow-up is to memoize each combo string's parsed form
inside `matchesCombo`. Parsing is a pure function of the string, so the
cache needs no DOM invalidation. It targets the largest share measured, 229
of 658 µs at 1,000 focus keys. Run this benchmark before and after such a
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
