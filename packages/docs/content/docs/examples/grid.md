---
title: Grid
description: Declaring a column count folds the items into rows — cell moves and row moves, each on its own rebindable pair.
group: Examples
order: 13
---

Add `data-keyrove-cols` to the root and the same list navigates as a grid:
<kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> move a whole row, so focus
lands on the item directly above or below, and <kbd class="kbd">←</kbd>
<kbd class="kbd">→</kbd> move one cell.

<div data-demo="grid" data-demo-class="grid grid-cols-6 gap-1.5"></div>

```ts
document
  .querySelector('#time-slots')
  .addEventListener('keydown', (e) => keyRove(e));
```

The demo sets `data-keyrove-cols="6"` and `data-keyrove-page-length="2"`, so a
page is two rows. The column count is the one keyrove navigates by, so keep it
in step with the layout: a CSS `grid-template-columns` of six and a
`data-keyrove-cols` of four will move focus in a way that does not match what is
on screen.

## Moves in a grid

| Move             | Default key                                                                                                      | Attribute                                                 | At the edge                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Next cell        | <kbd class="kbd">→</kbd>                                                                                         | `data-keyrove-next-key`                                   | Flows on to the next row's first cell; stops at the grid's last cell                          |
| Previous cell    | <kbd class="kbd">←</kbd>                                                                                         | `data-keyrove-prev-key`                                   | Flows back to the previous row's last cell; stops at the first cell                           |
| Next row         | <kbd class="kbd">↓</kbd>                                                                                         | `data-keyrove-next-row-key`                               | Same column; stops at the bottom                                                              |
| Previous row     | <kbd class="kbd">↑</kbd>                                                                                         | `data-keyrove-prev-row-key`                               | Same column; stops at the top                                                                 |
| Row start / end  | <kbd class="kbd">Home</kbd> / <kbd class="kbd">End</kbd>                                                         | `data-keyrove-home-row-key` / `data-keyrove-end-row-key`  | First / last navigable cell of the focused row                                                |
| Grid start / end | <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Home</kbd> / <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">End</kbd> | `data-keyrove-home-key` / `data-keyrove-end-key`          | First / last navigable cell of the grid                                                       |
| Page             | <kbd class="kbd">PageDown</kbd> / <kbd class="kbd">PageUp</kbd>                                                  | `data-keyrove-page-down-key` / `data-keyrove-page-up-key` | `page-length` rows, same column; an overshoot lands on the grid's last / first navigable cell |

- A cell move follows DOM order, like a caret in text, so the cell pair reaches
  every cell in the grid.
- Grids never wrap; [`data-keyrove-loop`](/docs/examples/looping-lists) is
  ignored.
- A grid is entered from outside by any of its four arrows, landing on the
  first cell.
- Rebind any move and the replaced default goes back to its browser behaviour;
  see [custom keys](/docs/examples/custom-keys#grids).

## Right-to-left grids

Under `dir="rtl"` the default cell arrows flip: <kbd class="kbd">←</kbd> is the
next cell and <kbd class="kbd">→</kbd> the previous, each still moving the way
it points on screen. The row arrows and any explicit binding stay put. See
[horizontal groups and RTL](/docs/api#horizontal-groups-and-rtl) for how the
direction is resolved.

## Responsive grids

The column count is read from the attribute on every keypress, not cached, so a
grid whose layout changes only needs the attribute kept current.
[Responsive grid](/docs/examples/responsive-grid) lets the stylesheet decide it.
