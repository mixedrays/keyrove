---
title: Basic list
description: The default behaviour — arrows step one item, Home and End jump to the ends, PageUp and PageDown move in blocks, and Tab still does what Tab does.
group: Examples
order: 10
---

A list needs two things: `data-keyrove-item` on every navigable element, and a
keydown listener on the container. <kbd class="kbd">Tab</kbd> to an item or
click it, then use <kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd>,
<kbd class="kbd">Home</kbd> / <kbd class="kbd">End</kbd>, and
<kbd class="kbd">PageUp</kbd> / <kbd class="kbd">PageDown</kbd>.

<div data-demo="list" data-demo-class="max-h-60 overflow-y-auto"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

document
  .querySelector('#countries')
  .addEventListener('keydown', (e) => keyRove(e));
```

Both routes in work because neither is taken away: `tabindex="0"` makes each
item a real tab stop, and keyrove adds arrow movement on top.
<kbd class="kbd">Tab</kbd> still walks the list item by item here; see
[roving tabindex](/docs/examples/roving-tabindex) to make the whole group one
stop instead. The arrows are only the default keys: two attributes on the root
put any key in their place, see [custom keys](/docs/examples/custom-keys).

## Page length

`data-keyrove-page-length` sets how far <kbd class="kbd">PageUp</kbd> and
<kbd class="kbd">PageDown</kbd> move. It defaults to `10`; the demo sets `5` so
the jump is visible in twelve items. A jump past the end lands on the last item
rather than doing nothing.

The ends themselves are where a list stops: next on the last item is claimed
but moves nothing. See [looping lists](/docs/examples/looping-lists) for
wrapping round to the other end instead.

## Reacting to movement

The optional second argument takes `onMove`, fired _after_ focus has moved, and
only when it actually moved.

```ts
list.addEventListener('keydown', (e) => {
  keyRove(e, {
    onMove: ({ action, from, to }) => console.log(action, '→', to),
  });
});
```

The log under each demo on this site is wired up that way. `keyRove` also
[returns what it did](/docs/api#return-value), so handlers sharing a listener
can chain on it.
