---
title: Responsive grid
description: Let CSS decide the column count and data-keyrove-cols="auto" count it on each keypress, so rows fold the way the layout does.
titleTag: Keyboard navigation for a responsive grid — keyrove
group: Examples
order: 15
---

A grid rarely keeps one column count. Six across on a desktop becomes three on
a tablet and two on a phone, and `data-keyrove-cols` has to say which of those
is on screen right now: it is what keyrove
[folds rows by](/docs/examples/grid), and a stale value sends
<kbd class="kbd">↓</kbd> to the wrong cell.

Rather than spelling the breakpoints out a second time in JavaScript, let the
stylesheet own them and have keyrove count the result. `data-keyrove-cols="auto"`
does that: on every keypress it reads the grid's computed
`grid-template-columns`, which lists one size per column however the rule was
written. Here a
[container query](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
picks the count. Drag the corner of the panel to narrow it, or narrow the
window, then arrow around: the rows fold as the columns do. The log names the
month focus landed on, so the count is readable without counting cells. At six
columns across, <kbd class="kbd">↓</kbd> takes January to July; at two, the
same key takes it to March.

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

`keyRove(e)` is unchanged, and so is the rule that it reads a group fresh on
every keypress. `auto` is counted at that moment, so there is nothing to
synchronise: no resize listener, no observer to disconnect, nothing that can be
stale by the time it is read. `getComputedStyle` resolves one property on one
element once per keypress, which costs nothing you would notice.

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

A grid built on `repeat(auto-fill, minmax(8rem, 1fr))` never states a count;
the browser decides how many tracks fit. `auto` needs nothing more for it: the
computed value lists the tracks the browser made, so they are counted the same
way.

## What auto counts

- The root has to be the grid container, and each item one cell of it: a grid
  item spanning one track, in DOM order. Spanning items, `subgrid` rows and
  wrappers around each row break the fold. With an `items` selector the items
  can sit anywhere under the root, and the same holds for them.
- Named lines in the template, such as `[full-start]`, are not columns and are
  not counted.
- A root that is not a grid container, such as a flex row or an element with
  nothing laid out, counts as one column, and the group navigates as a list.

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
