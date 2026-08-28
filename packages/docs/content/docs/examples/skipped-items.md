---
title: Skipped items
description: Keeping headings, separators, and disabled entries in the DOM but out of the navigation order.
group: Examples
order: 13
---

Lists are rarely a flat run of equivalent items. Section headings, separators,
and disabled entries all belong in the markup and none of them should receive
focus.

`data-keyrove-skip` marks an item as passed over: it keeps its place in the DOM
order, but no key ever lands on it.

Arrow through the list — focus moves straight past the group headings.

<div data-demo="skip"></div>

The headings keep `data-keyrove-item` so that they stay part of the list
keyrove walks — that is what lets it step over them and land on the next real
entry, rather than treating the list as ending at the heading.

## Disabled elements

Anything carrying the `disabled` attribute is excluded automatically, with no
`data-keyrove-skip` needed:

```html
<button data-keyrove-item tabindex="0">Rename</button>
<button data-keyrove-item disabled>Delete</button>
<button data-keyrove-item tabindex="0">Duplicate</button>
```

Note that `disabled` only exists on form controls. A `<li>` or a `<div>` styled
to look disabled needs `data-keyrove-skip` — and `aria-disabled="true"`, which
keyrove does not write for you.

## Home and End

<kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> respect skipping too:
they land on the first and last _navigable_ items, not on a leading heading or a
trailing separator.
