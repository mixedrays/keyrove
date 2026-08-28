---
title: Grid
description: Declaring a column count switches Up and Down to whole-row moves and brings Left and Right into play.
group: Examples
order: 11
---

Add `data-keyrove-cols-length` to the root and the same list navigates as a
grid: <kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> move a whole row, so
focus lands on the item directly above or below, and <kbd class="kbd">←</kbd>
<kbd class="kbd">→</kbd> move one cell.

Focus stops at the edges instead of wrapping — arrowing left from the first
column stays put rather than jumping to the end of the row above.

<div data-demo="grid" data-demo-class="grid grid-cols-6 gap-1.5"></div>

```ts
document.querySelector('#grid').addEventListener('keydown', (e) => keyRove(e));
```

The column count is the one keyrove navigates by. Keep it in step with however
the grid is laid out — a CSS `grid-template-columns` of six and a
`data-keyrove-cols-length` of four will move focus in a way that does not match
what is on screen.

## Paging in a grid

`data-keyrove-page-length` counts _rows_ once a column count is set, so
<kbd class="kbd">PageDown</kbd> moves the same number of rows regardless of how
wide the grid is — and focus keeps the column it started in. The demo above uses
`2`, so a page is two rows of six.

## Responsive grids

The column count is read from the attribute on every keypress, not cached, so
updating it when a breakpoint changes is enough to keep navigation matching the
layout.

```ts
const media = window.matchMedia('(min-width: 768px)');

const syncColumns = () => {
  grid.setAttribute('data-keyrove-cols-length', media.matches ? '6' : '3');
};

media.addEventListener('change', syncColumns);
syncColumns();
```
