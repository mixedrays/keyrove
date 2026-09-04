---
title: Skipped items
description: Keeping headings, separators, and disabled entries in the DOM but out of the navigation order.
group: Examples
order: 15
---

`data-keyrove-skip` marks an item as passed over: it keeps its place in the
sequence, but no key ever lands on it. Arrow through the list; focus moves
straight past the group headings.

<div data-demo="skip"></div>

The headings keep `data-keyrove-item` and add `data-keyrove-skip`, so they hold
a place in the sequence keyrove walks while focus never stops on them. Dropping
`data-keyrove-item` from a heading also works in a list; in a grid, a skipped
cell keeps its column while an unmarked one shifts every cell after it.

## Disabled elements

Anything carrying the `disabled` attribute is excluded automatically, with no
`data-keyrove-skip` needed:

```html
<button data-keyrove-item tabindex="0">Rename</button>
<button data-keyrove-item disabled>Delete</button>
<button data-keyrove-item tabindex="0">Duplicate</button>
```

`disabled` only exists on form controls. A `<li>` or a `<div>` styled to look
disabled needs `data-keyrove-skip`, and `aria-disabled="true"`, which keyrove
does not write for you.

Unlike a skipped item, a disabled one leaves the sequence entirely, so in a grid
it shifts the cells after it. To keep a dead cell's slot, use
`aria-disabled="true"` with `data-keyrove-skip` instead of `disabled`.

## Home and End

<kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> respect skipping too:
they land on the first and last _navigable_ items, not on a leading heading or a
trailing separator.
