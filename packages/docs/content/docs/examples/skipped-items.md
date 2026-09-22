---
title: Skipped items
description: Skip headings and unavailable items while preserving grid positions, or exclude disabled elements entirely.
titleTag: Skipping disabled items and headings — keyrove
group: Examples
order: 17
---

Add `data-keyrove-skip` to pass over an item during navigation while keeping
its position in the sequence. Try the arrows here: focus skips the headings.

<div data-demo="skip"></div>

The headings keep `data-keyrove-item` and add `data-keyrove-skip`. Removing
`data-keyrove-item` also excludes a heading from a list, but in a grid it
shifts the positions of later cells. A skipped cell keeps its slot.

Skipping does not remove an item's native Tab stop; set its tabindex as
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

Native `disabled` behavior applies to supported form controls. For a `<li>`
or `<div>`, use `data-keyrove-skip` and `aria-disabled="true"`; keyrove does
not write ARIA states or prevent your activation handlers from running.

keyrove excludes any element carrying `disabled` from its item sequence. In
a grid, this shifts later cells. To retain a disabled cell's slot, use
`aria-disabled="true"` with `data-keyrove-skip` instead.

## Home and End

<kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> respect skipping too:
they land on the first and last _navigable_ items, not on a leading heading or a
trailing separator.

If every item is skipped, some moves currently fall back to the first or last
item. See [the edge rules](/docs/api#edges-and-looping). To prevent that,
return an empty `items` collection or skip calling `keyRove` until an item is
eligible. Typeahead and roving initialization do not use this fallback.
