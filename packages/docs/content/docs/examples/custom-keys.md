---
title: Custom keys
description: Rebinding the next and previous keys, for toolbars and any group that reads horizontally.
group: Examples
order: 14
---

A toolbar navigates left-to-right, not up-and-down. `data-keyrove-next-key` and
`data-keyrove-prev-key` on the root rebind which keys move focus; both take
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
values.

<div data-demo="keys"></div>

<kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd> move between the buttons; the
up and down arrows are left to scroll the page.

## Markup

```html
<div
  id="toolbar"
  data-keyrove-next-key="ArrowRight"
  data-keyrove-prev-key="ArrowLeft"
>
  <button data-keyrove-item tabindex="0">Bold</button>
  <button data-keyrove-item tabindex="0">Italic</button>
  <button data-keyrove-item tabindex="0">Underline</button>
</div>
```

## Codes, not keys

These are `KeyboardEvent.code` values — physical keys — not `KeyboardEvent.key`
values. `KeyW` rather than `w`, and the code does not change with the keyboard
layout, so a binding chosen for QWERTY lands on the same physical key on AZERTY.

```html
<div data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">…</div>
```

Anything not bound is left alone: with `KeyJ` and `KeyK` above, the arrow keys
stop moving focus entirely.

## Interaction with grids

In a grid, <kbd class="kbd">←</kbd> and <kbd class="kbd">→</kbd> already move
one cell. Binding one of them as the next or previous key hands it to that
binding instead — the cell move gives way, so the two never both fire on one
keypress.
