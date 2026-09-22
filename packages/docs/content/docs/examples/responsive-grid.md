---
title: Responsive grid
description: Read a CSS grid’s column count on each keypress with data-keyrove-cols="auto".
titleTag: Keyboard navigation for a responsive grid — keyrove
group: Examples
order: 15
---

Set `data-keyrove-cols="auto"` on the grid container to read its column count
from CSS on every keypress. Navigation then follows layout changes without
copying breakpoints into JavaScript.

This demo uses a
[container query](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries).
Drag the panel's corner or narrow the window, then try the arrows. With six
columns, <kbd class="kbd">↓</kbd> moves from January to July; with two, it moves to March.

<div data-demo="responsive" data-demo-class="resize-x overflow-hidden min-w-64 max-w-full"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

// <div id="months" data-keyrove-cols="auto">
document
  .querySelector('#months')
  .addEventListener('keydown', (e) => keyRove(e));
```

Or, where the markup is not yours, as an option:

```ts
keyRove(e, { items: '.month', cols: 'auto' });
```

The demo's grid carries `data-keyrove-root` only because the site's listener
sits on the panel around it. With the listener on the grid itself, as above, the
attribute is not needed.

## Counted on every keypress

`auto` reads the root's computed `grid-template-columns` during each call.
No resize listener or observer is needed to keep the count current.

## The stylesheet owns the breakpoints

The panel declares itself a container with `container-type: inline-size`; the
grid inside sets `--cols` and lays itself out with
`grid-template-columns: repeat(var(--cols), minmax(0, 1fr))`; each `@container`
rule changes the property and nothing else. Add a breakpoint, or move one, and
navigation follows without a JavaScript edit.

The query measures the panel's width, so the grid also adapts when placed in a
sidebar. The panel is the query container because an element cannot query its
own size.

## When the count is implicit

A grid built on `repeat(auto-fill, minmax(8rem, 1fr))` never states a count;
the browser decides how many tracks fit. `auto` needs nothing more for it: the
computed value lists the tracks the browser made, so they are counted the same
way.

## What auto counts

- The root must be the grid container, with one item per cell in DOM order.
  Each item must span one track. Spanning items, subgrids and row wrappers do
  not match this navigation model, including when `items` selects descendants.
- Named lines, such as `[full-start]`, are not counted as columns.
- If the computed value does not resolve to a list of pixel track sizes, the
  count falls back to one and the group navigates as a list. This includes a
  flex container or a grid that is not laid out.

## Layouts that are not grids

A `flex-wrap` row has no track list to count, so `auto` sees one column. Copy
the count in yourself instead, right before the call. Here the stylesheet
publishes it as `--cols`:

```ts
months.addEventListener('keydown', (e) => {
  months.setAttribute(
    'data-keyrove-cols',
    getComputedStyle(months).getPropertyValue('--cols'),
  );
  keyRove(e);
});
```

keyrove reads the attribute fresh on every keypress, so refreshing it in the
same handler is all the synchronisation this needs. If something else needs
the attribute between keypresses, such as a test asserting on it, a
`ResizeObserver` on the container can make the same copy whenever the size
changes.
