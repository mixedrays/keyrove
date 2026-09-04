---
title: Custom keys
description: Arrows are the default, not the rule — rebinding any move to any key combo.
group: Examples
order: 12
---

Nothing about keyrove is tied to the arrow keys. The keys that move focus are
attributes on the root, and `ArrowDown` / `ArrowUp` are only what they fall
back to. `data-keyrove-next-key` and `data-keyrove-prev-key` rebind them to any
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code),
with or without [modifiers](#modifiers).

A toolbar, for one, navigates left-to-right rather than up-and-down.
<kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd> move between the buttons here;
the up and down arrows are left to scroll the page.

<div data-demo="keys" data-demo-class="flex flex-wrap gap-1.5"></div>

```html
<div data-keyrove-next-key="ArrowRight" data-keyrove-prev-key="ArrowLeft">
  …
</div>
```

Rebinding is a markup change and nothing else. The `keyRove(e)` call is
identical whatever the group answers to, and only the bound keys are acted on:
with <kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd> bound, the up and down
arrows go back to scrolling the page, and <kbd class="kbd">Tab</kbd> was never
bound in the first place.

## Horizontal lists

For this exact pair there is a shorter spelling that also respects the text
direction:

```html
<div data-keyrove-orientation="horizontal">…</div>
```

It makes `ArrowRight` / `ArrowLeft` the defaults and flips them under RTL, so
the "forward" arrow follows the text. Reach for the explicit key attributes when
the keys are anything other than the reading-direction arrows; they win over
orientation wherever both are set.

## Any key, not a shortlist

The attribute value is a combo, an optional set of modifiers and a
`KeyboardEvent.code`, matched against the event on every press. There is no set
of supported keys to choose from:

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
different keys with one delegated listener serving both.

## Modifiers

Prefix the code with any of `mod+`, `ctrl+`, `alt+`, `shift+`, `meta+`. `mod`
is <kbd class="kbd">Cmd</kbd> on Apple platforms and <kbd class="kbd">Ctrl</kbd>
elsewhere:

```html
<ul
  data-keyrove-next-key="ctrl+ArrowRight"
  data-keyrove-prev-key="ctrl+ArrowLeft"
>
  …
</ul>
```

Matching is exact in both directions. A bare `KeyJ` means "J with nothing else
held", so <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">J</kbd> keeps its
browser default, and a `ctrl+KeyJ` binding never fires on a plain
<kbd class="kbd">J</kbd>. The full grammar is in the
[API reference](/docs/api#combos).

## Codes, not keys

These are `KeyboardEvent.code` values, physical keys, not `KeyboardEvent.key`
values: `KeyW` rather than `w`. The code does not change with the keyboard
layout, so a binding chosen for QWERTY lands on the same physical key on AZERTY.

That cuts both ways, and it is the thing to weigh when picking a letter: a
binding is to a _position_ on the keyboard. `KeyJ` and `KeyK` sit under the
right hand on QWERTY, which is the whole point of the vim bindings; on Dvorak
those same positions are `c` and `t`.

## Home, End and the page keys

<kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd>,
<kbd class="kbd">PageUp</kbd> and <kbd class="kbd">PageDown</kbd> are defaults
too. `data-keyrove-home-key`, `data-keyrove-end-key`,
`data-keyrove-page-up-key` and `data-keyrove-page-down-key` rebind them by the
same [rules](/docs/api#keys):

```html
<!-- vim-style, all the way down -->
<ul
  data-keyrove-next-key="KeyJ"
  data-keyrove-prev-key="KeyK"
  data-keyrove-home-key="KeyG"
  data-keyrove-end-key="shift+KeyG"
  data-keyrove-page-down-key="ctrl+KeyD"
  data-keyrove-page-up-key="ctrl+KeyU"
>
  …
</ul>
```

Whatever they are bound to, these moves act only once focus is inside an item.
Only the directional keys
[enter a group](/docs/api#consumed-and-untouched-keys).

## Grids

The attributes keep their meaning in a grid, and the row and grid-wide moves get
pairs of their own:

| Move                                 | Attribute                                                 | Default (LTR)              |
| ------------------------------------ | --------------------------------------------------------- | -------------------------- |
| Next / previous cell                 | `data-keyrove-next-key` / `data-keyrove-prev-key`         | `ArrowRight` / `ArrowLeft` |
| Next / previous row, same column     | `data-keyrove-next-row-key` / `data-keyrove-prev-row-key` | `ArrowDown` / `ArrowUp`    |
| First / last cell of the focused row | `data-keyrove-home-row-key` / `data-keyrove-end-row-key`  | `Home` / `End`             |
| First / last cell of the grid        | `data-keyrove-home-key` / `data-keyrove-end-key`          | `ctrl+Home` / `ctrl+End`   |

Each pair rebinds independently. A full vim-style grid binds all four arrows:

```html
<div
  data-keyrove-cols="6"
  data-keyrove-prev-key="KeyH"
  data-keyrove-next-key="KeyL"
  data-keyrove-prev-row-key="KeyK"
  data-keyrove-next-row-key="KeyJ"
>
  …
</div>
```

As always, [one keypress resolves to one action](/docs/api#precedence): bind
`data-keyrove-next-key="ArrowDown"` and the default row move stands down.
Explicit bindings are literal under RTL, too; only the
[default arrows follow the reading direction](/docs/api#horizontal-groups-and-rtl).

## An item's own key

Everything above binds a _move_ on the root. An item can also carry a combo of
its own: `data-keyrove-focus-key="ctrl+shift+KeyE"` focuses it from anywhere
under the listener and outranks the root's bindings.
[Focus keys](/docs/examples/focus-keys) has the rules in full.

## Editable elements are exempt

A key pressed inside a text field, `select` or `contenteditable` region is never
handled, whatever it is bound to. Arrows and
<kbd class="kbd">Home</kbd>/<kbd class="kbd">End</kbd> keep moving the caret,
and a `KeyJ` binding does not swallow typing "j" into a field inside an item;
navigation resumes once focus leaves the field. Which targets count, and the one
exception for a chorded focus key, are in the
[API reference](/docs/api#editable-targets).

## A binding worth avoiding

**`Tab` itself.** `data-keyrove-next-key="Tab"` works, and it costs the group
the browser's own forward tab navigation.
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> is a different combo, so
it stays native and remains the way out, but a group where the two
<kbd class="kbd">Tab</kbd> directions behave that differently is confusing. If
you want <kbd class="kbd">Tab</kbd> to move past a group rather than through it,
[roving tabindex](/docs/examples/roving-tabindex) does that and leaves the key
alone.
