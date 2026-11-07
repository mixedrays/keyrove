---
# Live page: https://keyrove.pages.dev/docs/examples/responsive-grid
title: Responsive grid
description: Keyboard navigation for a responsive CSS grid, with the column count read from the layout on every keypress so breakpoints stay in CSS.
keywords: [responsive grid, css grid, breakpoints, column count]
titleTag: Keyboard navigation for a responsive grid — keyrove
group: Examples
order: 15
---

Set `data-keyrove-cols="auto"` on the grid container to read its column count
from CSS on every keypress. Navigation then follows layout changes without
copying breakpoints into JavaScript.

This demo uses a
[container query](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries).
Drag the corner of the dashed frame or narrow the window, then try the arrows.
With six columns, <kbd class="kbd">↓</kbd> moves from January to July; with two, it moves to March.

<div data-demo="responsive" data-demo-label="month picker"></div>

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

`auto` reads the root's computed `grid-template-columns` during each call, or,
where that has no tracks to count, the positions of the items on the first
line. No resize listener or observer is needed to keep the count current.

Only a press that could move reads the layout: an arrow, Home/End, a page key,
or a key a move is bound to. Any other key, and a focus key, reads none, so
typing into typeahead never asks the browser for the layout.

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

- On a CSS grid, the root must be the grid container, with one item per cell
  in DOM order. Each item must span one track. Spanning items, subgrids and
  row wrappers do not match this navigation model, including when `items`
  selects descendants.
- Named lines, such as `[full-start]`, are not counted as columns.
- If the computed value does not resolve to a list of pixel track sizes — a
  flex container, a block of inline-block items, or a grid that is not laid
  out — `auto` counts the items on the first line instead; see
  [wrapping layouts](#wrapping-layouts). Where nothing is laid out at all, as
  in jsdom, that count is one and the group navigates as a list.

## Wrapping layouts

A `flex-wrap` row, or inline-block items in a block container, has no track
list, so `auto` counts the items laid out on the first line: from the first
item, every item that starts above the first item's bottom edge. Items of
different heights centred on one line (`align-items: center`) count as that
line. Only the first line is measured, plus one item, so the cost grows with
the column count rather than with the group.

```html
<div data-keyrove-cols="auto" style="display: flex; flex-wrap: wrap">
  <button data-keyrove-item>…</button>
  …
</div>
```

The count follows the layout. A card gallery whose cards wrap by width folds
by however many fit, without a stylesheet stating the number. Some outcomes
follow from it:

- A single-line flex row is a one-row grid of all its items, so its next and
  previous keys are <kbd class="kbd">←</kbd> and <kbd class="kbd">→</kbd>, and
  <kbd class="kbd">↑</kbd> and <kbd class="kbd">↓</kbd> are row moves with
  nowhere to go. For a toolbar, use `data-keyrove-orientation="horizontal"`
  rather than `auto`.
- A `flex-direction: column` root stacks its items, so its first line holds
  one and it stays a list.
- The item sequence is document order. `flex-direction: row-reverse`,
  `wrap-reverse` and `order` change only what is on screen, so the fold no
  longer matches it.
- An item with no box, such as one with `display: none`, ends the count: it
  takes no place on screen but keeps one in the sequence. Leave hidden items
  out of a wrapping group's items, with `items` or by removing the item
  attribute.
- The first line is counted from the first item, skipped items included, as
  skipped items keep their place in the fold.

## When the first line is not representative

Where the first line holds a different number of items from the rest, such as
a wide featured card at the start, count the columns yourself and copy the
count in right before the call. Here the stylesheet publishes it as `--cols`:

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
same handler is all the synchronization this needs. If something else needs
the attribute between keypresses, such as a test asserting on it, a
`ResizeObserver` on the container can make the same copy whenever the size
changes.
