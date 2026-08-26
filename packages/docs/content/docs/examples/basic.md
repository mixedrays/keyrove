---
title: Basic list
description: The default behaviour — arrows step one item, Home and End jump to the ends, PageUp and PageDown move in blocks.
group: Examples
order: 10
---

A list needs two things: `data-keyrove-item` on every navigable element, and a
keydown listener on the container.

<div data-demo="list"></div>

Click an item to focus it, then use <kbd class="kbd">↑</kbd>
<kbd class="kbd">↓</kbd>, <kbd class="kbd">Home</kbd> / <kbd class="kbd">End</kbd>,
and <kbd class="kbd">PageUp</kbd> / <kbd class="kbd">PageDown</kbd>.

## Markup

```html
<ul id="menu" data-keyrove-page-length="5">
  <li data-keyrove-item tabindex="0">Item 1</li>
  <li data-keyrove-item tabindex="0">Item 2</li>
  <li data-keyrove-item tabindex="0">Item 3</li>
</ul>
```

```ts
import { keyRove } from '@mixedrays/keyrove';

document.querySelector('#menu').addEventListener('keydown', (e) => keyRove(e));
```

## Page length

`data-keyrove-page-length` sets how far <kbd class="kbd">PageUp</kbd> and
<kbd class="kbd">PageDown</kbd> move. It defaults to `10`; the demo above uses
`5` so the jump is visible in a short list.

A page jump that would land past the end clamps to the last navigable item
rather than doing nothing, so <kbd class="kbd">PageDown</kbd> always makes
progress until focus reaches the end.

## Reacting to movement

The optional second argument takes callbacks that fire _after_ focus has moved,
and only when it actually moved.

```ts
list.addEventListener('keydown', (e) => {
  keyRove(e, {
    callbacks: {
      next: ({ focused }) => console.log('moved to', focused),
      prev: ({ focused }) => console.log('moved to', focused),
    },
  });
});
```

The log under each demo on this site is wired up exactly that way.
