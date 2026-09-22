---
title: Custom keys
description: Change navigation keys, add modifier combinations, bind several keys to one move, or disable a binding.
titleTag: Custom key bindings for navigation — keyrove
group: Examples
order: 12
---

Set `data-keyrove-next-key` and `data-keyrove-prev-key` on the root to change
the navigation keys. Values are
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
values, with optional [modifiers](#modifiers).

This toolbar uses <kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd> to move between buttons. <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd> keep their
browser behavior.

<div data-demo="keys" data-demo-class="flex flex-wrap gap-1"></div>

```html
<div data-keyrove-next-key="ArrowRight" data-keyrove-prev-key="ArrowLeft">
  …
</div>
```

The handler stays `keyRove(e)`. Only bound keys are handled. Press <kbd class="kbd">↓</kbd> in the
toolbar to see an unhandled key in the log; the browser can still scroll.

## Horizontal lists

For <kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd> navigation that follows text direction, use:

```html
<div data-keyrove-orientation="horizontal">…</div>
```

It makes `ArrowRight` / `ArrowLeft` the defaults and flips them under RTL, so
the "forward" arrow follows the text. Reach for the explicit key attributes when
the keys are anything other than the reading-direction arrows; they win over
orientation wherever both are set.
[Horizontal lists](/docs/examples/horizontal-lists) shows both directions.

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

## Several keys for one move

A binding replaces the default, so the vim-style list above gives up the
arrows: <kbd class="kbd">↓</kbd> goes back to scrolling the page. To keep them,
list both, separated by commas. The move answers to any key in the list:

```html
<ul
  data-keyrove-next-key="ArrowDown, KeyJ"
  data-keyrove-prev-key="ArrowUp, KeyK"
>
  …
</ul>
```

```ts
keyRove(e, { keys: { next: 'ArrowDown, KeyJ', prev: 'ArrowUp, KeyK' } });
```

A list is as literal as a single combo, so the arrow you keep is the one you
name. Nothing flips under RTL, and nothing is added back for you.

## Modifiers

Prefix the code with any of `mod+`, `ctrl+`, `alt+`, `shift+`, `meta+`; the
longer `control`, `option`, `cmd` and `command` spell the same modifiers. `mod`
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

Matching is exact in both directions. A bare `KeyJ` means "<kbd class="kbd">J</kbd> with nothing else
held", so <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">J</kbd> keeps its
browser default, and a `ctrl+KeyJ` binding never fires on a plain
<kbd class="kbd">J</kbd>. The full grammar is in the
[API reference](/docs/api#combos).

## Codes, not keys

These are `KeyboardEvent.code` values, physical keys, not `KeyboardEvent.key`
values: `KeyW` rather than `w`. The code does not change with the keyboard
layout, so a binding chosen for QWERTY lands on the same physical key on AZERTY.

Choose letter bindings with keyboard layout in mind. For example, the physical
positions `KeyJ` and `KeyK` produce `c` and `t` on Dvorak.

## <kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd> and the page keys

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

## Switching a move off

Some groups should not have every move. The
[APG toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) has no page
keys, so <kbd class="kbd">PageDown</kbd> on one of its buttons should scroll
the page, not jump to the last button. `none` binds a move to no key and
hands its default back to the browser:

```html
<div
  role="toolbar"
  data-keyrove-orientation="horizontal"
  data-keyrove-page-up-key="none"
  data-keyrove-page-down-key="none"
>
  …
</div>
```

```ts
keyRove(e, {
  orientation: 'horizontal',
  keys: { pageUp: 'none', pageDown: 'none' },
});
```

Every other move keeps its key. An empty attribute is not the same thing: it
counts as unset, so the move keeps its default.

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
its own, and so can an element that is not one:
`data-keyrove-focus-key="ctrl+shift+KeyE"` focuses it from anywhere under the
listener and outranks the root's bindings.
[Focus keys](/docs/examples/focus-keys) has the rules in full.

## Editable elements are exempt

Movement bindings do not run inside text fields, selects or editable content.
Those elements keep their editing keys. Modified focus shortcuts are an
exception; see [editable targets](/docs/examples/editable-targets) and the
[API rules](/docs/api#editable-targets).

## A binding worth avoiding

**`Tab` itself.** `data-keyrove-next-key="Tab"` works, and it costs the group
the browser's own forward tab navigation.
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> is a different combo, so
it stays native and remains the way out, but a group where the two
<kbd class="kbd">Tab</kbd> directions behave that differently is confusing. If
you want <kbd class="kbd">Tab</kbd> to move past a group rather than through it,
[roving tabindex](/docs/examples/roving-tabindex) does that and leaves the key
alone.
