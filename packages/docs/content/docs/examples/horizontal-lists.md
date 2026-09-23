---
# Live page: https://keyrove.pages.dev/docs/examples/horizontal-lists
title: Horizontal lists
description: Navigate a horizontal list or toolbar with the Left and Right arrow keys, with defaults that follow the text direction in right-to-left layouts.
titleTag: Horizontal list keyboard navigation — keyrove
group: Examples
order: 13
---

Set `data-keyrove-orientation="horizontal"` on a list's root to use
<kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd>. In left-to-right text, <kbd class="kbd">→</kbd> moves to the next item and <kbd class="kbd">←</kbd> to the
previous one. <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd> keep their browser behavior.

<div data-demo="orientation" data-demo-class="flex flex-wrap gap-1.5" data-demo-label="mail filters"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

document
  .querySelector('#filters')
  .addEventListener('keydown', (e) => keyRove(e));
```

<kbd class="kbd">Home</kbd>/<kbd class="kbd">End</kbd> still jump to the ends, <kbd class="kbd">PageUp</kbd>/<kbd class="kbd">PageDown</kbd> still move a page, and <kbd class="kbd">Tab</kbd>
keeps its default behavior. Moves follow DOM order. Lists are vertical unless
the orientation is set to the literal value `horizontal`.

## Right to left

Under `dir="rtl"`, the defaults reverse: <kbd class="kbd">←</kbd> is next and <kbd class="kbd">→</kbd> is previous.
This keeps navigation aligned with items laid out in right-to-left order.

<div data-demo="rtl" data-demo-class="flex flex-wrap gap-1.5" data-demo-label="right-to-left filters"></div>

Compare the readouts: <kbd class="kbd">→</kbd> reports `next` in the first bar and `prev` in the RTL
bar. The action names describe movement through DOM order.

The direction comes from the nearest `dir` attribute at or above the root, and
otherwise from the computed style, so a `dir` on `<html>` is enough for every
group on the page. Like every other attribute it is read on the keypress, so a
page that switches language switches its arrows with it. The
[API reference](/docs/api#horizontal-groups-and-rtl) has the resolution rules.

## Explicit keys stay literal

An explicit `data-keyrove-next-key` or `data-keyrove-prev-key` wins over the
orientation, and it is never flipped: it names a physical key and means that
key in either direction.

```html
<!-- Right is next and Left is previous, in LTR and in RTL alike -->
<div data-keyrove-next-key="ArrowRight" data-keyrove-prev-key="ArrowLeft">
  …
</div>
```

Use orientation for arrows that follow text direction. Use explicit bindings
for fixed keys; see [custom keys](/docs/examples/custom-keys).

## Grids

A grid needs no orientation. Its next and prev moves already run along the
row, on the reading-direction arrows, and its row moves take
<kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd>. The attribute is ignored
once `data-keyrove-cols` is above `1`; see [grid](/docs/examples/grid), and
its [right-to-left](/docs/examples/grid#right-to-left-grids) section for how
the cell arrows flip.

## Wrapping a strip

Add `data-keyrove-loop` to wrap next/previous at the ends. Under RTL, <kbd class="kbd">←</kbd>
wraps forward. See [looping lists](/docs/examples/looping-lists) for entry
behavior and the moves that do not wrap.

## Telling users about it

keyrove reads its own attribute, not `aria-orientation`. A `role="toolbar"` or
`role="tablist"` is horizontal by default in ARIA, so nothing more is needed
there; a `role="listbox"` or `role="menu"` laid out sideways should carry
`aria-orientation="horizontal"` alongside, so assistive technology announces
the arrows the group actually answers to.
