---
title: Custom keys
description: Arrows are the default, not the rule — rebinding any move to any key combo.
group: Examples
order: 16
---

Nothing about keyrove is tied to the arrow keys. The keys that move focus are
attributes on the root, and `ArrowDown` / `ArrowUp` are simply what they fall
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

Rebinding is a markup change and nothing else — the `keyRove(e)` call is
identical whatever the group answers to.

For exactly this pair there is a more idiomatic spelling:
`data-keyrove-orientation="horizontal"` maps the defaults to
`ArrowRight`/`ArrowLeft` and flips them under RTL, so the "forward" arrow
follows the text direction instead of being hardcoded. Reach for the explicit
key attributes when the keys are anything other than the reading-direction
arrows — they win over orientation wherever both are set.

## Any key, not a shortlist

The attribute value is a combo — an optional set of modifiers and a
`KeyboardEvent.code` — matched against the event on every press, so there is no
set of supported keys to choose from:

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

## Modifiers

Prefix the code with any of `mod+`, `ctrl+`, `alt+`, `shift+`, `meta+` — in any
order and any case. `mod` resolves to `meta` on Apple platforms and `ctrl`
elsewhere:

```html
<ul
  data-keyrove-next-key="ctrl+ArrowRight"
  data-keyrove-prev-key="ctrl+ArrowLeft"
>
  …
</ul>
```

Matching is exact in both directions: a declared modifier is required, an
undeclared one is forbidden. A bare `KeyJ` binding means "J with nothing else
held", so <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">J</kbd> keeps its
browser default — and a `ctrl+KeyJ` binding never fires on a plain
<kbd class="kbd">J</kbd>.

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

## Home, End and the page keys

<kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd>,
<kbd class="kbd">PageUp</kbd> and <kbd class="kbd">PageDown</kbd> are defaults
too. `data-keyrove-home-key`, `data-keyrove-end-key`,
`data-keyrove-page-up-key` and `data-keyrove-page-down-key` rebind them by the
same rules — any combo, exact matching, the replaced default handed back to
the browser:

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

Whatever they are bound to, these moves act only once focus is inside an item
— they move _within_ a group and never enter one. Only the directional keys
do that.

## Grids

The attributes keep their meaning in a grid: `data-keyrove-next-key` and
`data-keyrove-prev-key` move one item — a _cell_ there, flowing across row
ends — and the row moves have their own pair, `data-keyrove-next-row-key` and
`data-keyrove-prev-row-key`, defaulting to `ArrowDown`/`ArrowUp`. The ends
split the same way: `data-keyrove-home-row-key`/`data-keyrove-end-row-key`
bind the focused row's ends (bare `Home`/`End` by default), while
`data-keyrove-home-key`/`data-keyrove-end-key` bind the whole grid's
(`ctrl+Home`/`ctrl+End` by default). Each pair rebinds independently, and
every replaced default goes back to its browser behaviour. A full vim-style
grid binds all four arrows:

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

One keypress still resolves to at most one action. An explicit binding that
names a key a default pair answers to — say
`data-keyrove-next-key="ArrowDown"` — takes the press, and the default row
move stands down. Explicit bindings are also literal under RTL: only the
_default_ cell arrows follow the
[reading direction](/docs/api#horizontal-groups-and-rtl), exactly as
orientation's defaults do for a list.

## An item's own key

Everything above binds a _move_ on the root. An item can also carry a key of
its own: `data-keyrove-focus-key="ctrl+shift+KeyE"` focuses that item from
anywhere the keydown reaches the listener, by the same combo grammar. It sits
ahead of the root's bindings, so it wins a collision with them.
[Focus keys](/docs/examples/focus-keys) has the rules in full.

## Editable elements are exempt

A key pressed inside an `input`, `textarea`, `select`, or `[contenteditable]`
element is never handled, whatever it is bound to. Arrows and
<kbd class="kbd">Home</kbd>/<kbd class="kbd">End</kbd> keep moving the caret,
and a letter binding like `KeyJ` does not swallow typing "j" into a field that
sits inside an item — navigation resumes once focus leaves the field.

## A binding worth avoiding

**`Tab` itself.** Binding `data-keyrove-next-key="Tab"` does work, and it costs
you the browser's own forward tab navigation for the whole group.
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> is a different combo,
so it stays native and remains the way out — but a group where the two
<kbd class="kbd">Tab</kbd> directions behave that differently is confusing. If
what you want is <kbd class="kbd">Tab</kbd> moving past a group rather than
through it, [roving tabindex](/docs/examples/roving-tabindex) is the mechanism
for that, and it leaves the key alone.
