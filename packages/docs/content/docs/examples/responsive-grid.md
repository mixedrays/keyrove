---
title: Responsive grid
description: Let a container query decide the column count and hand it to keyrove before each keypress, so rows fold the way the layout does.
group: Examples
order: 14
---

A grid rarely keeps one column count. Six across on a desktop becomes three on
a tablet and two on a phone, and `data-keyrove-cols` has to say which of those
is on screen right now: it is what keyrove
[folds rows by](/docs/examples/grid), and a stale value sends
<kbd class="kbd">↓</kbd> to the wrong cell.

Rather than spelling the breakpoints out a second time in JavaScript, let the
stylesheet own them and read the result back. A
[container query](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
sets one custom property, `--cols`, and both the grid's layout and keyrove
follow it. Drag the corner of the panel to narrow it, or narrow the window, then
arrow around: the rows fold as the columns do.

<div data-demo="responsive" data-demo-class="resize-x overflow-hidden min-w-64 max-w-full"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const months = document.querySelector('#months');

months.addEventListener('keydown', (e) => {
  months.setAttribute(
    'data-keyrove-cols',
    getComputedStyle(months).getPropertyValue('--cols'),
  );
  keyRove(e);
});
```

The demo's grid carries `data-keyrove-root` only because the site's listener
sits on the panel around it. With the listener on the grid itself, as above, the
attribute is not needed.

## One line before the call

`keyRove(e)` is unchanged. The line above it copies `--cols` into
`data-keyrove-cols`, and because keyrove reads the attribute fresh on every
keypress, refreshing it in the same handler is all the synchronisation there is:
no resize listener, no observer to disconnect, nothing that can be stale by the
time it is read. `getComputedStyle` resolves one property on one element once
per keypress, which costs nothing you would notice.

If something else needs the attribute right _between_ keypresses, a test
asserting on it or another script reading it, a `ResizeObserver` on the panel
makes the same copy whenever the size changes, and once when it starts
observing:

```ts
const picker = document.querySelector('#month-picker');

const syncColumns = () => {
  months.setAttribute(
    'data-keyrove-cols',
    getComputedStyle(months).getPropertyValue('--cols'),
  );
};

new ResizeObserver(syncColumns).observe(picker);
```

## The stylesheet owns the breakpoints

The panel declares itself a container with `container-type: inline-size`; the
grid inside sets `--cols` and lays itself out with
`grid-template-columns: repeat(var(--cols), minmax(0, 1fr))`; each `@container`
rule changes the property and nothing else. Add a breakpoint, or move one, and
navigation follows without a JavaScript edit.

The query measures the panel, not the viewport, so the same grid dropped into a
sidebar gets the sidebar's column count, which a media query could not give it.
The container is the panel rather than the grid because an element cannot query
its own size.

## When the count is implicit

A grid built on `repeat(auto-fill, minmax(8rem, 1fr))` has no `--cols` to read;
the browser decides how many tracks fit. Count them instead: the computed
`grid-template-columns` of a grid container lists one size per column, however
the rule was written.

```ts
months.addEventListener('keydown', (e) => {
  const tracks = getComputedStyle(months).gridTemplateColumns.split(' ');

  months.setAttribute('data-keyrove-cols', String(tracks.length));
  keyRove(e);
});
```

Same listener, same timing; only where the number comes from has changed.
