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

Both ways in work because both are still available: `tabindex="0"` makes each
item a real tab stop, and keyrove adds movement on top without taking anything
away. <kbd class="kbd">Tab</kbd> keeps walking the list item by item here — see
[roving tabindex](/docs/examples/roving-tabindex) for making the whole group one
stop instead.

<div data-demo="list" data-demo-class="max-h-60 overflow-y-auto"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

document
  .querySelector('#countries')
  .addEventListener('keydown', (e) => keyRove(e));
```

## The arrows are a default

<kbd class="kbd">↑</kbd> and <kbd class="kbd">↓</kbd> are what a group answers
to when you have not said otherwise. Two attributes on the root swap them for
anything else:

```html
<ul id="countries" data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">
  …
</ul>
```

The listener does not change, and the keys you did not bind — the arrows now
included — go back to their browser behaviour. See
[custom keys](/docs/examples/custom-keys).

## Page length

`data-keyrove-page-length` sets how far <kbd class="kbd">PageUp</kbd> and
<kbd class="kbd">PageDown</kbd> move. It defaults to `10`; the demo above uses
`5` so the jump is visible in a short list.

A page jump that would land past the end clamps to the last navigable item
rather than doing nothing, so <kbd class="kbd">PageDown</kbd> always makes
progress until focus reaches the end.

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

The log under each demo on this site is wired up exactly that way. `keyRove`
also [returns what it did](/docs/api#return-value) — `null` for an untouched
key, the move for a consumed one — so handlers sharing a listener can chain
with `keyRove(e) || myOwnHandler(e)`.
