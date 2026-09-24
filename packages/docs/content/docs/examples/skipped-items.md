---
# Live page: https://keyrove.pages.dev/docs/examples/skipped-items
title: Skipped items
description: Skip headings and unavailable items during keyboard navigation while preserving grid positions, or exclude disabled elements entirely.
keywords: [skipped items, disabled elements, headings]
titleTag: Skipping disabled items and headings — keyrove
group: Examples
order: 17
---

Add `data-keyrove-skip` to pass over an item during navigation while keeping
its position in the sequence. Try the arrows here: focus skips the headings.

<div data-demo="skip" data-demo-label="file finder"></div>

The headings keep `data-keyrove-item` and add `data-keyrove-skip`. Removing
`data-keyrove-item` also excludes a heading from a list, but in a grid it
shifts the positions of later cells. A skipped cell keeps its slot.

Skipping does not remove an item's native <kbd class="kbd">Tab</kbd> stop; set its tabindex as
needed. An explicit `focusKeys` mapping can still reach a skipped target;
see [configuration differences](/docs/attributes-and-options#configuration-differences).

## Disabled elements

Anything carrying the `disabled` attribute is excluded automatically, with no
`data-keyrove-skip` needed:

```html
<button data-keyrove-item tabindex="0">Rename</button>
<button data-keyrove-item disabled>Delete</button>
<button data-keyrove-item tabindex="0">Duplicate</button>
```

Excluded items leave the sequence, so in a grid a disabled cell shifts every
later cell. To keep its slot, use `aria-disabled="true"` with
`data-keyrove-skip` instead. Use the same pair for a `<li>` or `<div>`, since
native `disabled` behavior applies only to supported form controls. keyrove
does not write ARIA states or prevent your activation handlers from running.

## <kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd>

<kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> respect skipping too:
they land on the first and last _navigable_ items, not on a leading heading or a
trailing separator.

If every item is skipped, no move lands anywhere. Arrows pressed from outside
the group keep their browser default, and keys pressed from a focused item are
consumed without moving. Typeahead and roving initialization behave the same
way. See [the edge rules](/docs/api#edges-and-looping).
