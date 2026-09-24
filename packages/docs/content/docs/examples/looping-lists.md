---
# Live page: https://keyrove.pages.dev/docs/examples/looping-lists
title: Looping lists
description: Make keyboard navigation wrap from the last item to the first and back again, and decide when a list should loop and when it should stop at its ends.
keywords: [looping, wrap around, list ends]
titleTag: Wrapping list navigation at the ends — keyrove
group: Examples
order: 11
---

By default, navigation stops at the first and last items. Add
`data-keyrove-loop` to the container to wrap between them:

- <kbd class="kbd">↓</kbd> from _Sign out_ moves to _Profile_.
- <kbd class="kbd">↑</kbd> from _Profile_ moves to _Sign out_.

You can sign out any time you like, but the arrows will never leave.
<kbd class="kbd">Tab</kbd> will.

<div data-demo="loop" data-demo-label="account menu"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const menu = document.querySelector<HTMLElement>('#account-menu')!;
menu.addEventListener('keydown', (e) => keyRove(e));
```

keyrove reads the attribute on every keypress. You can turn looping on or off
without changing the listener or reinitializing the group.

## Boolean value

Both `data-keyrove-loop` and `data-keyrove-loop="true"` enable looping.
Set `data-keyrove-loop="false"` to disable it. The same rule applies to all
boolean keyrove attributes, including `data-keyrove-item`, `data-keyrove-root`,
`data-keyrove-skip`, and `data-keyrove-roving-tabindex`.

In JSX, pass a boolean directly:

```tsx
<ul data-keyrove-loop={loop}>…</ul>
```

## Entering at either end

When no item is focused and the group's listener receives a directional key,
keyrove focuses the first navigable item. In a looping list, `prev` enters at
the last navigable item instead. With the default bindings:

- <kbd class="kbd">↓</kbd> enters at the first item.
- <kbd class="kbd">↑</kbd> enters at the last item.

This matches the optional arrow-key entry behavior in the
[APG menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
pattern.

<kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd>, and the page keys still require focus inside an item.

## Only next and prev wrap

Looping changes only `next` and `prev`:

- <kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> move to the first
  and last navigable items.
- <kbd class="kbd">PageUp</kbd> and <kbd class="kbd">PageDown</kbd> stop at
  either end if a jump would go past it.

If you rebind `next` and `prev` to <kbd class="kbd">J</kbd> and
<kbd class="kbd">K</kbd>, those keys wrap and the arrows return to their browser
defaults. See
[custom keys](/docs/examples/custom-keys).

## Skipped items keep their place

A wrap lands on the first or last navigable item, passing over items marked
`data-keyrove-skip` or `disabled`. See [skipped items](/docs/examples/skipped-items).

## Nowhere to go

If the only navigable item already has focus, `next` and `prev` leave it there.
keyrove still calls `preventDefault()`, but `onMove` does not fire.
For `next`, the [return value](/docs/api#return-value) is
`{ action: 'next', from, to: null }`, just as at the end of a non-looping list.

## Grids keep their edges

Looping applies only to lists. When `data-keyrove-cols` is greater than `1`,
the group is a [grid](/docs/examples/grid) and ignores `data-keyrove-loop`.
Cell moves continue across row boundaries, but stop at the first or last cell;
row moves stop at the top or bottom. At these edges, keyrove prevents the
browser's default action without moving focus. See the
[APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) for keyboard
navigation guidance.

## When a list should wrap

Wrapping works well for short menus, pickers, and tab lists where both ends
are visible.

For long, scrolling lists, keeping the ends helps users track their position.
Wrapping can unexpectedly jump the viewport back to the top and may be hard to
notice with a screen reader. Without looping, holding <kbd class="kbd">↓</kbd>
at the bottom keeps focus there and prevents the page from scrolling.
