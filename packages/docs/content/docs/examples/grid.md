---
title: Grid
description: Declaring a column count folds the items into rows — cell moves and row moves, each on its own rebindable pair.
group: Examples
order: 11
---

Add `data-keyrove-cols` to the root and the same list navigates as a grid:
<kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> move a whole row, so focus
lands on the item directly above or below, and <kbd class="kbd">←</kbd>
<kbd class="kbd">→</kbd> move one cell.

A cell move follows the items in DOM order: arrowing right at the end of a row
flows on to the first cell of the next row, like a caret in text, and stops
only at the grid's first and last cell. Row moves keep their column and stop
at the top and bottom edges. Grids never wrap — `data-keyrove-loop` is
ignored — and, like a list, a grid is entered from outside by any of its four
directional keys, landing on the first cell.

The four moves answer to four bindings. `data-keyrove-next-key` and
`data-keyrove-prev-key` mean exactly what they mean in a list — one item, here
a cell — and default to the reading-direction arrows. The row moves have their
own pair, `data-keyrove-next-row-key` and `data-keyrove-prev-row-key`,
defaulting to <kbd class="kbd">↓</kbd> <kbd class="kbd">↑</kbd>. Rebind any of
them and the replaced default arrow goes back to its browser behaviour — see
[custom keys](/docs/examples/custom-keys#grids).

<div data-demo="grid" data-demo-class="grid grid-cols-6 gap-1.5"></div>

```ts
document
  .querySelector('#time-slots')
  .addEventListener('keydown', (e) => keyRove(e));
```

The column count is the one keyrove navigates by. Keep it in step with however
the grid is laid out — a CSS `grid-template-columns` of six and a
`data-keyrove-cols` of four will move focus in a way that does not match what
is on screen.

## Right-to-left grids

The default cell arrows follow the reading direction, resolved from the
nearest `dir` attribute: under `dir="rtl"` DOM order renders right-to-left, so
<kbd class="kbd">←</kbd> moves to the next cell and <kbd class="kbd">→</kbd>
to the previous one — each arrow keeps moving focus the way it points on
screen. The row arrows never flip, and an explicit binding is always literal,
whatever the direction.

## Home and End in a grid

Bare <kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> jump to the
first and last navigable cell of the _focused row_;
<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Home</kbd> and
<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">End</kbd> to the grid's first and
last cell — the APG grid pattern. In a list, which has no second scope for
them, the modified pair keeps its browser default.

## Paging in a grid

`data-keyrove-page-length` counts _rows_ once a column count is set, so
<kbd class="kbd">PageDown</kbd> moves the same number of rows regardless of how
wide the grid is — and focus keeps the column it started in. The demo above uses
`2`, so a page is two rows of six.

## Responsive grids

The column count is read from the attribute on every keypress, not cached, so
updating it when the layout changes is enough to keep navigation matching the
layout. The surest way to know when it changed is to let the stylesheet decide
the count in the first place and read it back — see
[responsive grid](/docs/examples/responsive-grid).
