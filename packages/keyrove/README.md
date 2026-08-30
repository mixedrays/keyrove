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
<div data-keyrove-next-key="ctrl+ArrowRight" data-keyrove-prev-key="ctrl+ArrowLeft">…</div>
```

Anything not bound is left entirely alone, browser defaults included. `Home`,
`End`, `PageUp` and `PageDown` are handled whenever pressed without modifiers;
in a grid, `ArrowLeft` and `ArrowRight` move one cell unless you have bound
them to something else.

## Tab still works

keyrove moves focus with `element.focus()` and never touches <kbd>Tab</kbd>, so
sequential focus navigation is unaffected. Items with `tabindex="0"` stay
ordinary tab stops that arrows _also_ reach. Opt into
`data-keyrove-roving-tabindex` when a group should instead be a single tab stop
that <kbd>Tab</kbd> moves past rather than through.

## Attributes

| Attribute                      | On   | Default     | Meaning                                                                        |
| ------------------------------ | ---- | ----------- | ------------------------------------------------------------------------------ |
| `data-keyrove-item`            | item | —           | Marks an element as navigable.                                                 |
| `data-keyrove-skip`            | item | —           | Passed over when moving; stays in the DOM order.                               |
| `data-keyrove-roving-tabindex` | item | —           | Moves the `tabindex="0"` tab stop with focus.                                  |
| `data-keyrove-root`            | root | —           | Marks the navigation root explicitly, instead of using the listener's element. |
| `data-keyrove-cols-length`     | root | `1`         | A value above 1 switches the group to grid navigation.                         |
| `data-keyrove-page-length`     | root | `10`        | Items per page jump — whole rows in a grid.                                    |
| `data-keyrove-next-key`        | root | `ArrowDown` | Combo that moves forward, e.g. `KeyJ` or `ctrl+ArrowRight`.                     |
| `data-keyrove-prev-key`        | root | `ArrowUp`   | Combo that moves back.                                                          |

Every attribute name is also exported as a constant (`KEYROVE_ATTR_ITEM`,
`KEYROVE_ATTR_COLS_LENGTH`, …).

## Options

```ts
keyRove(e, {
  callbacks: {
    next: ({ focused }) => {},
    prev: ({ focused }) => {},
    home: ({ focused }) => {},
    end: ({ focused }) => {},
    pageUp: ({ focused }) => {},
    pageDown: ({ focused }) => {},
  },
});
```

Callbacks fire after focus has moved, and only when it actually moved.

`toggleTabIndex({ root, isActive })` is exported for cases where you manage the
tab stop yourself — restoring it after re-rendering a list, for instance.

## License

MIT
