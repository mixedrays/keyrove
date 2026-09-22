# keydown benchmark

Measures what one `keyRove` call costs in a real browser, on pages of
increasing size, with the listener on the group or on the document, for
unbound and bound keys, with and without focus keys, and with fixed or
`auto` columns.

## Run

From `packages/keyrove`:

```sh
pnpm bench                        # build, then run in headless Chrome
pnpm bench -- --json results.json # also write the raw results
pnpm bench -- --serve             # serve the page to run it in another browser
```

From the repository root, `pnpm bench` does the same. A run takes about 20
seconds and prints Markdown tables. Chrome or Chromium is found at
`CHROME_PATH`, else at its usual install locations. The runner needs no
dependency beyond Node and Chrome.

With `--serve`, open the printed URL in any browser and press Run. The page is
served with cross-origin isolation, as in the automated run.

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
- The page is cross-origin isolated, which gives `performance.now()` its
  finer resolution. The runner turns on focus emulation, so the headless page
  behaves as a focused window.
- Each case records what one call returned: `unhandled`, `consumed no-op` or
  `moved`. This confirms each case measures what its label says.
- The diagnostics time two parts of the focus-key lookup on their own: the
  document query for `[data-keyrove-focus-key]`, and `matchesCombo` over
  every declared combo.

## Results

Recorded on 2026-09-22 with `pnpm bench`.

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
  zero-match attribute query may not exist in other engines. Use `--serve`
  to measure Firefox or Safari.
- The numbers come from one desktop machine, and absolute times scale with
  the hardware.
- Direct calls leave out event dispatch and propagation, which the browser
  pays whatever the handler does.
- The move cases focus two adjacent visible buttons, so scrolling into view
  is not exercised.

## CI

The benchmark does not gate CI. Record baselines on the target runners
before choosing thresholds, since shared runners vary from run to run.
