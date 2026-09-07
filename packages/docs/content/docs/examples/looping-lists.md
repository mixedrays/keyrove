---
title: Looping lists
description: Wrapping a list at its ends, so next past the last item lands on the first — and why a grid, and most long lists, should keep their edges.
group: Examples
order: 11
---

A list stops at its ends. Next on the last item is claimed and moves nothing:
the key belonged to the group, so the browser never sees it, and focus stays
where it is. For a menu that is the wrong answer — five entries a user holds as
a ring should not have a bottom to get stuck at.

`data-keyrove-loop` on the root wraps the two directional moves instead.
<kbd class="kbd">↓</kbd> from _Sign out_ lands on _Profile_, and
<kbd class="kbd">↑</kbd> from _Profile_ lands on _Sign out_.

<div data-demo="loop"></div>

```ts
document
  .querySelector('#account-menu')
  .addEventListener('keydown', (e) => keyRove(e));
```

The call is the one every other page makes. Wrapping is a property of the
group, read off the root on each keypress like every other attribute, so a list
can start or stop looping between two presses with nothing to re-initialise.

## Presence, not a value

The attribute is read with `hasAttribute`, so the bare spelling above is the
intended one and _any_ value means the same thing: `data-keyrove-loop=""` loops,
and so does `data-keyrove-loop="false"`. Removing the attribute is what turns
wrapping off.

That is worth a second look wherever the markup is generated, because a boolean
tends to be stringified rather than dropped:

```tsx
// `false` becomes the string "false" — the attribute is present, so it loops.
<ul data-keyrove-loop={loop}>…</ul>

// `undefined` leaves the attribute out, which is what turns wrapping off.
<ul data-keyrove-loop={loop ? '' : undefined}>…</ul>
```

## Entering at either end

The four directional keys also _enter_ a group: pressed while nothing inside it
is focused, they move focus to the first item. A looping list is entered as the
circle it is, so the prev key enters at the _last_ item instead — down opens the
menu at the top, up opens it at the bottom, the convention the
[APG menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
describes for opening a menu from its trigger.

That only applies to the keys that enter. The moves that act within a group are
unchanged by looping, and by the attribute's absence just as much.

## Only next and prev wrap

Everything else keeps its edges, whatever the list is bound to:

- <kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> are absolute — the
  first and last navigable items, so there is no end for them to go past.
- <kbd class="kbd">PageUp</kbd> and <kbd class="kbd">PageDown</kbd> clamp: a
  jump that overshoots lands on that end rather than carrying on round it. A
  page is a request to travel as far as possible, not a stride to be continued.

Wrapping follows the bindings rather than the arrow keys. Rebind next and prev
to <kbd class="kbd">J</kbd> and <kbd class="kbd">K</kbd> and those are the keys
that wrap, while the arrows go back to scrolling the page — see
[custom keys](/docs/examples/custom-keys).

## Skipped items keep their place

A wrap lands on the first or last _navigable_ item. A heading marked
`data-keyrove-skip` at either end of the list is stepped over exactly as one in
the middle is, and so is anything `disabled` — see
[skipped items](/docs/examples/skipped-items). A list is a circle of the items
that can hold focus, not of every element in it.

## Nowhere to go

A group with a single navigable item is the edge case both directions at once:
the wrap resolves to the item that already has focus, so nothing moves. The
press is still consumed — `preventDefault()` is called, `onMove` does not fire,
and the [return value](/docs/api#return-value) is
`{ action: 'next', from, to: null }`, the same claimed no-op a list without the
attribute reports at its ends.

## Grids keep their edges

`data-keyrove-loop` is a list attribute. Once `data-keyrove-cols` is above `1`
the group is a [grid](/docs/examples/grid) and the attribute is ignored: a cell
move at the grid's last cell, and a row move at the bottom row, are consumed
no-ops. Cell moves already flow across row ends, so within a row there is no
edge to wrap at — and the grid's own corners stay put, per the
[APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), where a
wrap would cost the reader their bearings in two dimensions rather than one.

## When a list should wrap

Wrapping suits a group held as a ring rather than a line: a menu, a context
menu, a small picker, a set of tabs. Few enough items that both ends are on
screen at once, and where "past the last one" carries no information worth
reporting.

It suits a long list much less. In a scrolling list the ends _are_ information
— reaching the bottom is how a user knows they have seen everything — and a
wrap answers a keypress that looked like one step by throwing the viewport back
to the top. Screen-reader users get the least warning of it: the item arrived at
is announced, the journey to it is not. Leaving the ends alone costs nothing in
the meantime, because a clamped list still consumes the key: the page does not
scroll out from under a reader holding <kbd class="kbd">↓</kbd> at the bottom.
