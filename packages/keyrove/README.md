# @mixedrays/keyrove

[![npm](https://img.shields.io/npm/v/@mixedrays/keyrove?color=4f46e5)](https://www.npmjs.com/package/@mixedrays/keyrove)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@mixedrays/keyrove?color=4f46e5)](https://bundlephobia.com/package/@mixedrays/keyrove)
[![license](https://img.shields.io/npm/l/@mixedrays/keyrove?color=4f46e5)](https://github.com/mixedrays/keyrove/blob/main/LICENSE)

Framework-agnostic keyboard navigation for lists and grids, driven by `data-*`
attributes.

**[Documentation](https://keyrove.pages.dev)** ·
[API reference](https://keyrove.pages.dev/docs/api) ·
[Examples](https://keyrove.pages.dev/docs/examples/basic)

Arrow keys are the default binding, not the whole library: the keys that move
focus are `data-*` attributes on the root, so any
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
can drive a group. And because keyrove moves real DOM focus and only calls
`preventDefault()` on the keys it is bound to, native <kbd>Tab</kbd> /
<kbd>Shift</kbd>+<kbd>Tab</kbd> navigation keeps working alongside it.

```sh
pnpm add @mixedrays/keyrove
```

## Features

- **Framework-agnostic:** takes DOM events and React, Vue, or Svelte synthetic
  events, with no adapter and no dependencies.
- **Configurable key bindings:** `data-keyrove-next-key`/`data-keyrove-prev-key`
  — and the grid's `data-keyrove-next-row-key`/`data-keyrove-prev-row-key` —
  take any `KeyboardEvent.code`, with exact modifier combos and platform-aware
  `mod`.
- **Lists and grids:** arrows, <kbd>Home</kbd>/<kbd>End</kbd> and
  <kbd>PageUp</kbd>/<kbd>PageDown</kbd> out of the box; `data-keyrove-cols`
  folds the items into rows — Up/Down move a whole row, Left/Right move a cell
  — and `data-keyrove-loop` wraps a list at its ends.
- **Horizontal and RTL groups:** `data-keyrove-orientation="horizontal"`
  re-points a list's defaults at <kbd>←</kbd>/<kbd>→</kbd> — and a grid's
  default cell arrows follow the reading direction too, flipped under RTL from
  the nearest `dir`.
- **Native focus behavior:** moves real DOM focus and calls `preventDefault()`
  only on the keys it is bound to, so unbound keys and
  <kbd>Tab</kbd>/<kbd>Shift</kbd>+<kbd>Tab</kbd> are left untouched.
- **Roving tabindex:** `data-keyrove-roving-tabindex` moves the `tabindex="0"`
  tab stop with focus, so <kbd>Tab</kbd> enters and leaves a group instead of
  walking through every item in it.
- **Skippable items:** `data-keyrove-skip` and `disabled` keep headings,
  separators, and dead entries in the DOM but out of the navigation order.
- **Nested roots:** `data-keyrove-root` scopes a group and the nearest one
  wins, so a single delegated listener can serve a list inside a list.
- **Editable control awareness:** the caret and value keys stay with inputs,
  textareas, selects, and `contenteditable` regions — while inputs those keys
  do nothing on, like a checkbox or a button, keep navigating.
- **Typeahead:** `createTypeahead()` adds case-insensitive type-to-focus,
  matching `data-keyrove-typeahead` or the item's own text.

## Usage

Mark navigable elements with `data-keyrove-item`, give them a tab stop, and pass
the container's keydown event to `keyRove`.

```html
<ul id="menu">
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
  <li data-keyrove-item tabindex="0">Sent</li>
</ul>
```

```ts
import { keyRove } from '@mixedrays/keyrove';

document.querySelector('#menu').addEventListener('keydown', (e) => keyRove(e));
```

`keyRove` accepts anything shaped like a keydown event, so React, Vue and
Svelte synthetic events work without an adapter:

```tsx
<ul onKeyDown={(e) => keyRove(e)}>
  {items.map((item) => (
    <li key={item.id} data-keyrove-item tabIndex={0}>
      {item.label}
    </li>
  ))}
</ul>
```

## Keys

`ArrowDown` and `ArrowUp` move forward and back by default. Rebind either on the
root — `KeyJ`/`KeyK`, `KeyW`/`KeyS`, `ArrowRight`/`ArrowLeft` for a toolbar:

```html
<div data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">…</div>
```

For the toolbar case there is a shorthand that also respects the text
direction: `data-keyrove-orientation="horizontal"` maps the default keys to
`ArrowRight`/`ArrowLeft`, flipped under RTL. An explicit
`data-keyrove-next-key`/`data-keyrove-prev-key` still wins over it.

A binding is a combo: zero or more of `mod+` / `ctrl+` / `alt+` / `shift+` /
`meta+` (any order, any case) followed by a
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code).
`mod` resolves to `meta` on Apple platforms and `ctrl` elsewhere. Matching is
exact — declared modifiers are required, undeclared ones are forbidden — so a
bare `ArrowDown` binding leaves shortcuts like <kbd>Ctrl</kbd>+<kbd>ArrowDown</kbd>
with their browser defaults. Keys are matched on `e.code`, the physical key, so
bindings hold across keyboard layouts. No `code` value contains a `+` — the
plus key itself is `Equal` (or `NumpadAdd`) — so the separator is unambiguous.
The matcher is exported as `matchesCombo(e, combo)` for your own handlers.

```html
<div
  data-keyrove-next-key="ctrl+ArrowRight"
  data-keyrove-prev-key="ctrl+ArrowLeft"
>
  …
</div>
```

Next and prev always mean one item through the DOM order. Declare
`data-keyrove-cols` and the same items fold into rows: `next-key`/`prev-key`
keep moving one item — a _cell_ there, on the reading-direction arrows by
default — while `data-keyrove-next-row-key`/`data-keyrove-prev-row-key` move a
whole row, defaulting to `ArrowDown`/`ArrowUp`.

Anything not bound is left entirely alone, browser defaults included. `Home`,
`End`, `PageUp` and `PageDown` are handled when pressed without modifiers and
focus is already inside an item — they move within a group, never into one. In
a grid, `Home`/`End` jump to the ends of the focused row and
`ctrl+Home`/`ctrl+End` to the grid's first and last cell.

At the ends of a list the bound keys are consumed but focus stays put. Add
`data-keyrove-loop` on the root and next on the last item wraps to the first,
and vice versa. Grids keep their edges — they never wrap.

Keys pressed inside an editable element — `textarea`, `select`,
`[contenteditable]`, or an `input` whose keys act natively (text entry,
`number`, `range`, `radio`, …) — are never handled: arrows and `Home`/`End`
keep moving the caret or value, and a letter binding like `KeyJ` does not
swallow typing into a field that sits within an item. Inputs where those keys
are inert — a `checkbox`, a `button` — still navigate.

## Tab still works

keyrove moves focus with `element.focus()` and never touches <kbd>Tab</kbd>, so
sequential focus navigation is unaffected. Items with `tabindex="0"` stay
ordinary tab stops that arrows _also_ reach. Opt into
`data-keyrove-roving-tabindex` when a group should instead be a single tab stop
that <kbd>Tab</kbd> moves past rather than through.

## Typeahead

`createTypeahead` adds type-to-focus: printable characters accumulate in a
buffer (reset after 500 ms of silence), and focus jumps to the first item
whose label starts with what was typed, case-insensitively.

```ts
import { keyRove, createTypeahead } from '@mixedrays/keyrove';

const typeahead = createTypeahead(); // { resetMs?, onMove? }

list.addEventListener('keydown', (e) => keyRove(e) || typeahead(e));
```

It is a factory because a buffer is state and `keyRove` itself stays
stateless — create one handler per listener. Chain it after `keyRove` so
bound keys win: a `KeyJ` binding keeps navigating and never enters the
buffer. The label is the item's `data-keyrove-typeahead` attribute, falling
back to its trimmed text. Matching reads `e.key` — the typed character —
unlike key bindings, which stay on the physical `e.code`. Typing inside
editable elements is never captured, modified presses (Ctrl/Alt/Meta) are
left to their shortcuts, and a space only counts once a match is underway.
The handler returns `{ action: 'typeahead', from, to }` or `null`, the same
contract as `keyRove` — and `onMove` fires after a real move, exactly as
`keyRove`'s does, so both handlers can feed the same follow-focus logic.

## Attributes

| Attribute                      | On   | Default     | Meaning                                                                                     |
| ------------------------------ | ---- | ----------- | ------------------------------------------------------------------------------------------- |
| `data-keyrove-item`            | item | —           | Marks an element as navigable.                                                              |
| `data-keyrove-skip`            | item | —           | Passed over when moving; stays in the DOM order.                                            |
| `data-keyrove-roving-tabindex` | item | —           | Moves the `tabindex="0"` tab stop with focus.                                               |
| `data-keyrove-root`            | root | —           | Marks the navigation root explicitly, instead of using the listener's element.              |
| `data-keyrove-cols`            | root | `1`         | Column count; above 1 the group navigates as a grid.                                        |
| `data-keyrove-page-length`     | root | `10`        | Items per page jump — whole rows in a grid.                                                 |
| `data-keyrove-next-key`        | root | axis arrow  | Combo for the next item — the next cell, in a grid. E.g. `KeyJ` or `ctrl+ArrowRight`.       |
| `data-keyrove-prev-key`        | root | axis arrow  | Combo for the previous item.                                                                |
| `data-keyrove-next-row-key`    | root | `ArrowDown` | Combo for the next row, same column. Grids only.                                            |
| `data-keyrove-prev-row-key`    | root | `ArrowUp`   | Combo for the previous row. Grids only.                                                     |
| `data-keyrove-loop`            | root | —           | Next/prev wrap past the ends of a list. Grids never wrap.                                   |
| `data-keyrove-orientation`     | root | —           | `horizontal` maps a list's default keys to `ArrowRight`/`ArrowLeft`, RTL-aware.             |
| `data-keyrove-typeahead`       | item | text        | Label for type-to-focus, when the item's own text is not it.                                |

The next/prev defaults follow the group's axis: `ArrowDown`/`ArrowUp` in a
vertical list, the reading-direction arrows in a horizontal list or a grid.

Every attribute name is also exported as a constant (`KEYROVE_ATTR_ITEM`,
`KEYROVE_ATTR_COLS`, `KEYROVE_ATTR_NEXT_ROW_KEY`, `KEYROVE_ATTR_LOOP`, …).

## Options and return value

```ts
const result = keyRove(e, {
  onMove: ({ action, from, to }) => {},
});
```

`onMove` fires after focus has moved, and only when it actually moved: a
consumed key with nowhere to go — the end of a list, the edge of a grid —
fires nothing. `action` names the move: `'next' | 'prev' | 'home' | 'end' |
'pageUp' | 'pageDown'`, plus the grid-only `'nextRow' | 'prevRow' | 'homeRow'
| 'endRow'` — a row move and a cell move never report the same token. `from`
is the item focus left (`null` when the group was entered from outside) and
`to` the item it landed on.

`keyRove` returns `null` when it left the key untouched, and `{ action, from,
to }` when it consumed it — with `to: null` for a consumed no-op at an edge. A
non-null result means the key is claimed, so handlers chain with `||`:

```ts
element.addEventListener('keydown', (e) => keyRove(e) || myOwnHandler(e));
```

`toggleTabIndex({ root, isActive })` is exported for cases where you manage the
tab stop yourself — restoring it after re-rendering a list, for instance.

## License

MIT
