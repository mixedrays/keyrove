---
# Live page: https://keyrove.pages.dev/docs/examples/basic
title: Basic list
description: Add keyboard navigation to a list with one keydown listener, keep its normal tab order, and react to each move with onMove.
keywords: [list, arrow keys, page keys, onMove]
titleTag: Arrow key navigation for lists — keyrove
group: Examples
order: 10
---

Add `data-keyrove-item` and `tabindex="0"` to each list item, then attach a
`keydown` listener to the container.

<kbd class="kbd">Tab</kbd> to an item or click it to try the demo:

- <kbd class="kbd">↑</kbd> / <kbd class="kbd">↓</kbd> move one item.
- <kbd class="kbd">Home</kbd> / <kbd class="kbd">End</kbd> jump to the first or last item.
- <kbd class="kbd">PageUp</kbd> / <kbd class="kbd">PageDown</kbd> move in blocks.

<div data-demo="list" data-demo-class="-m-1 max-h-60 overflow-y-auto p-1" data-demo-label="countries"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const list = document.querySelector<HTMLElement>('#countries')!;
list.addEventListener('keydown', (e) => keyRove(e));
```

<kbd class="kbd">Tab</kbd> still visits every item. Use
[roving tabindex](/docs/examples/roving-tabindex) to make the list a single tab
stop, or [custom keys](/docs/examples/custom-keys) to change the bindings.

## Page length

Set `data-keyrove-page-length` on the container to choose how many items
<kbd class="kbd">PageUp</kbd> and <kbd class="kbd">PageDown</kbd> move. The
default is `10`; this twelve-item demo uses `5`. Jumps stop at the first or
last item.

At either end, pressing a key to move farther keeps focus in place and prevents
the browser's default action. See [looping lists](/docs/examples/looping-lists)
to wrap to the other end.

## Reacting to movement

Pass `onMove` in the second argument to run a callback after focus moves.
It only fires when focus actually changes. This argument also accepts
[settings](/docs/attributes-and-options) in place of HTML attributes.

```ts
list.addEventListener('keydown', (e) => {
  keyRove(e, {
    onMove: ({ action, to }) => console.log(action, '→', to),
  });
});
```

The readout at the top of the demo shows three outcomes:

- **Indigo:** focus moved; `onMove` fired.
- **Amber:** keyrove handled the key, but focus stayed in place.
- **Gray:** keyrove left the key to the browser.

Amber and gray readouts use `keyRove`'s [return value](/docs/api#return-value).
Other handlers can use it to check whether keyrove handled the key.
