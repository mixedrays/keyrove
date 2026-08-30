# @mixedrays/keyrove

Framework-agnostic keyboard navigation for lists and grids, driven by `data-*`
attributes.

Arrow keys are the default binding, not the whole library: the keys that move
focus are `data-*` attributes on the root, so any
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
can drive a group. And because keyrove moves real DOM focus and only calls
`preventDefault()` on the keys it is bound to, native <kbd>Tab</kbd> /
<kbd>Shift</kbd>+<kbd>Tab</kbd> navigation keeps working alongside it.

```sh
pnpm add @mixedrays/keyrove
```

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

Anything not bound is left entirely alone, browser defaults included. `Home`,
`End`, `PageUp` and `PageDown` are handled when pressed without modifiers and
focus is already inside an item — they move within a group, never into one; in
a grid, `ArrowLeft` and `ArrowRight` move one cell unless you have bound them
to something else.

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
| `data-keyrove-cols-length`     | root | `1`         | A value above 1 switches the group to grid navigation.                                      |
| `data-keyrove-page-length`     | root | `10`        | Items per page jump — whole rows in a grid.                                                 |
| `data-keyrove-next-key`        | root | `ArrowDown` | Combo that moves forward, e.g. `KeyJ` or `ctrl+ArrowRight`.                                 |
| `data-keyrove-prev-key`        | root | `ArrowUp`   | Combo that moves back.                                                                      |
| `data-keyrove-loop`            | root | —           | Next/prev wrap past the ends of a list. Grids never wrap.                                   |
| `data-keyrove-orientation`     | root | —           | `horizontal` maps the default keys to `ArrowRight`/`ArrowLeft`, RTL-aware. Grids ignore it. |
| `data-keyrove-typeahead`       | item | text        | Label for type-to-focus, when the item's own text is not it.                                |

Every attribute name is also exported as a constant (`KEYROVE_ATTR_ITEM`,
`KEYROVE_ATTR_COLS_LENGTH`, `KEYROVE_ATTR_LOOP`, `KEYROVE_ATTR_ORIENTATION`, …).

## Options and return value

```ts
const result = keyRove(e, {
  onMove: ({ action, from, to }) => {},
});
```

`onMove` fires after focus has moved, and only when it actually moved: a
consumed key with nowhere to go — the end of a list, the edge of a grid —
fires nothing. `action` is one of `'next' | 'prev' | 'home' | 'end' |
'pageUp' | 'pageDown'`; `from` is the item focus left (`null` when the group
was entered from outside) and `to` the item it landed on.

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
