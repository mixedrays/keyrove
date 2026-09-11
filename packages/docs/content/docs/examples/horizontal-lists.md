---
title: Horizontal lists
description: One attribute turns a list sideways — Left and Right become the default keys, and they flip with the reading direction so forward follows the text.
titleTag: Horizontal list keyboard navigation — keyrove
group: Examples
order: 13
---

Filters along the top of an inbox, a segmented control, a strip of tabs: the
items sit side by side, and <kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd>
are the wrong keys for them. `data-keyrove-orientation="horizontal"` on the
root makes <kbd class="kbd">→</kbd> the next key and <kbd class="kbd">←</kbd>
the previous one. The up and down arrows go back to the browser, which here
means scrolling the page.

<div data-demo="orientation" data-demo-class="flex flex-wrap gap-1.5"></div>

```ts
document
  .querySelector('#filters')
  .addEventListener('keydown', (e) => keyRove(e));
```

Nothing else about the group changes. <kbd class="kbd">Home</kbd> and
<kbd class="kbd">End</kbd> still jump to the ends, <kbd class="kbd">PageUp</kbd>
and <kbd class="kbd">PageDown</kbd> still move a page, and
<kbd class="kbd">Tab</kbd> was never bound. The attribute swaps which physical
arrows are the _defaults_ for next and prev; the moves themselves are defined
in DOM order, as everywhere. The value is the literal `horizontal`, and a list
is vertical unless it says so.

## Right to left

The reason to prefer the attribute over binding `ArrowRight` and `ArrowLeft`
by hand is the reading direction. Under `dir="rtl"` the DOM order renders right
to left, so forward is to the left, and the defaults flip with it:
<kbd class="kbd">←</kbd> is next and <kbd class="kbd">→</kbd> is previous, each
arrow still moving focus the way it points on screen.

<div data-demo="rtl" data-demo-class="flex flex-wrap gap-1.5"></div>

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

That is the [custom keys](/docs/examples/custom-keys) toolbar, and the
difference between the two spellings is exactly the right-to-left case. Reach
for the attribute when the keys are the reading-direction arrows; spell them
out when they are anything else, or when they must not follow the text.

## Grids

A grid needs no orientation. Its next and prev moves already run along the
row, on the reading-direction arrows, and its row moves take
<kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd>. The attribute is ignored
once `data-keyrove-cols` is above `1`; see [grid](/docs/examples/grid), and
its [right-to-left](/docs/examples/grid#right-to-left-grids) section for how
the cell arrows flip.

## Wrapping a strip

A strip of tabs is the horizontal list most pages have, and the
[APG tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) wraps it:
<kbd class="kbd">→</kbd> on the last tab lands on the first. Add
`data-keyrove-loop` and the pair wraps. Wrapping follows the bindings rather
than the arrow keys, so under RTL it is <kbd class="kbd">←</kbd> that wraps
forward; see [looping lists](/docs/examples/looping-lists) for what does and
does not wrap.

## Telling users about it

keyrove reads its own attribute, not `aria-orientation`. A `role="toolbar"` or
`role="tablist"` is horizontal by default in ARIA, so nothing more is needed
there; a `role="listbox"` or `role="menu"` laid out sideways should carry
`aria-orientation="horizontal"` alongside, so assistive technology announces
the arrows the group actually answers to.
