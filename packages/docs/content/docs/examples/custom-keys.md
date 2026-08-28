---
title: Custom keys
description: Arrows are the default, not the rule — rebinding the next and previous keys to any KeyboardEvent.code.
group: Examples
order: 14
---

Nothing about keyrove is tied to the arrow keys. The keys that move focus are
attributes on the root, and `ArrowDown` / `ArrowUp` are simply what they fall
back to. `data-keyrove-next-key` and `data-keyrove-prev-key` rebind them to any
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code).

A toolbar, for one, navigates left-to-right rather than up-and-down.
<kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd> move between the buttons here;
the up and down arrows are left to scroll the page.

<div data-demo="keys" data-demo-class="flex flex-wrap gap-1.5"></div>

```html
<div data-keyrove-next-key="ArrowRight" data-keyrove-prev-key="ArrowLeft">
  …
</div>
```

Rebinding is a markup change and nothing else — the `keyRove(e)` call is
identical whatever the group answers to.

## Any key, not a shortlist

The attribute value is passed straight through to a comparison against the
event's `code`, so there is no set of supported keys to choose from:

```html
<!-- vim-style, for a results list in a keyboard-first app -->
<ul data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">
  …
</ul>

<!-- game-style -->
<ul data-keyrove-next-key="KeyS" data-keyrove-prev-key="KeyW">
  …
</ul>

<!-- the number pad, for a kiosk with no arrow cluster -->
<ul data-keyrove-next-key="Numpad2" data-keyrove-prev-key="Numpad8">
  …
</ul>
```

Each root is read on its own, so two groups on the same page can answer to
completely different keys with one delegated listener serving both.

## Codes, not keys

These are `KeyboardEvent.code` values — physical keys — not `KeyboardEvent.key`
values. `KeyW` rather than `w`, and the code does not change with the keyboard
layout, so a binding chosen for QWERTY lands on the same physical key on AZERTY.

That cuts both ways, and it is the thing to weigh when picking a letter: a
binding is to a _position_ on the keyboard. `KeyJ` and `KeyK` sit under the
right hand on QWERTY, which is the whole point of the vim bindings; on Dvorak
those same positions are `c` and `t`.

## Everything else keeps its default

Only bound keys are acted on, and `preventDefault()` is called only for those.
With `KeyJ` and `KeyK` above, the arrow keys stop moving focus entirely and go
back to scrolling the page.

<kbd class="kbd">Tab</kbd> and
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> are never bound by
default, which is what lets custom keys sit alongside
[native tab navigation](/docs/introduction#tab-still-works) rather than in place
of it.

### Two things that are not rebindable

<kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd>,
<kbd class="kbd">PageUp</kbd> and <kbd class="kbd">PageDown</kbd> are fixed —
there is no attribute for them. So is the grid's cell movement, below.

## Interaction with grids

In a grid, <kbd class="kbd">←</kbd> and <kbd class="kbd">→</kbd> already move
one cell. Binding one of them as the next or previous key hands it to that
binding instead — the cell move gives way, so the two never both fire on one
keypress.

Binding a _non_-arrow pair leaves cell movement alone: with `KeyJ` and `KeyK` on
a grid root, <kbd class="kbd">J</kbd> and <kbd class="kbd">K</kbd> move a whole
row while <kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd> still move a cell.

## Two bindings worth avoiding

The comparison is on the code alone — no check on what the event's target is,
and no modifier awareness — which makes two choices misbehave in ways worth
knowing before you make them.

**A printable key, in a group that contains a text field.** `preventDefault()`
runs whichever element the keydown came from, so with `KeyJ` bound, typing "j"
into an input inside that root is swallowed and focus jumps instead. Reserve
letter bindings for groups made of buttons and links, or scope the root so the
field sits outside it.

**`Tab` itself.** Binding `data-keyrove-next-key="Tab"` does work, and it costs
you the browser's own tab navigation for the whole group — including the way out
of it. If what you want is <kbd class="kbd">Tab</kbd> moving past a group rather
than through it, [roving tabindex](/docs/examples/roving-tabindex) is the
mechanism for that, and it leaves the key alone.
