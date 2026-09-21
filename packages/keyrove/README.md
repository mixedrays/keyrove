# @mixedrays/keyrove

[![npm](https://img.shields.io/npm/v/@mixedrays/keyrove?color=4f46e5)](https://www.npmjs.com/package/@mixedrays/keyrove)
[![minzipped size](https://img.shields.io/bundlejs/size/%40mixedrays%2Fkeyrove?color=4f46e5&label=minzipped%20size)](https://bundlejs.com/?q=%40mixedrays%2Fkeyrove)
[![license](https://img.shields.io/npm/l/@mixedrays/keyrove?color=4f46e5)](https://github.com/mixedrays/keyrove/blob/main/LICENSE)

Framework-agnostic keyboard navigation for lists, grids and trees, driven by
`data-*` attributes or a plain options object.

**[Documentation](https://keyrove.pages.dev)** ·
[Attributes and options](https://keyrove.pages.dev/docs/attributes-and-options) ·
[API reference](https://keyrove.pages.dev/docs/api) ·
[Examples](https://keyrove.pages.dev/docs/examples/basic)

A group — its items, its keys, its columns — is described in `data-keyrove-*`
attributes where you write the markup, or in an options object where you don't:
every attribute has an option of the same name, and the two mix field by field.

Arrow keys are the default binding, not the whole library: the keys that move
focus are settings like any other, so any
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
- **Attributes or options:** every attribute has an option of the same name, so
  a group whose markup you don't own — a component library's menu, a CMS's
  output — is described in JavaScript instead:
  `keyRove(e, { items: '[role="menuitem"]', loop: true })` navigates a menu
  that carries no keyrove attributes at all. Each field falls back to its
  attribute on its own, so the two can be mixed.
- **Stateless:** `keyRove` is a plain function of one keydown event — no
  instance to mount, nothing to dispose. It reads the group on every press, so
  a list that re-renders needs no re-initialising.
- **Configurable key bindings:** every move — next/prev, the grid's row moves,
  Home/End and the page jumps — takes any `KeyboardEvent.code`, as a
  `data-keyrove-*-key` attribute or under the `keys` option, with exact
  modifier combos and platform-aware `mod`.
- **Focus keys:** `data-keyrove-focus-key` (or the `focusKeys` option) gives an
  element a combo of its own — `ctrl+shift+KeyE`, or just `KeyE` — that focuses
  it from anywhere under the listener: another group, a nested root, even a
  text field when the combo holds a modifier. It need not be an item, so a panel
  reached by its key stays out of the arrow order.
- **Lists, grids and trees:** arrows, <kbd>Home</kbd>/<kbd>End</kbd> and
  <kbd>PageUp</kbd>/<kbd>PageDown</kbd> out of the box; `data-keyrove-cols`
  folds the items into rows — Up/Down move a whole row, Left/Right move a cell
  — and `data-keyrove-loop` wraps a list at its ends. A tree is a list whose
  closed folders' rows are skipped, through `data-keyrove-skip` or a `skip`
  selector such as `'[hidden] [role="treeitem"]'`, so the arrows walk the rows
  on screen; opening and closing folders on <kbd>→</kbd>/<kbd>←</kbd> is a few
  lines of your own, chained after `keyRove` with `||` — see the
  [tree view](https://keyrove.pages.dev/docs/examples/tree-view) example.
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
  matching a `label` of your own, `data-keyrove-typeahead`, or the item's own
  text — and takes the same options object as `keyRove`.

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

Where the markup is not yours to change, name the same settings in the call
instead. This is the same list, with nothing on its items but `tabindex="0"`:

```ts
document
  .querySelector('#menu')
  .addEventListener('keydown', (e) => keyRove(e, { items: 'li' }));
```

Each setting falls back to its attribute on its own, so the two mix freely —
see [Attributes and options](#attributes-and-options).

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
root, or in the call — `KeyJ`/`KeyK`, `KeyW`/`KeyS`, `ArrowRight`/`ArrowLeft`
for a toolbar:

```html
<div data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">…</div>
```

```ts
keyRove(e, { keys: { next: 'KeyJ', prev: 'KeyK' } });
```

Every `data-keyrove-*-key` attribute below is a field of `keys` named after its
move — `data-keyrove-next-row-key` is `keys.nextRow` — and `keys` is read move
by move, so a move it leaves out keeps its attribute and then its default.

For the toolbar case there is a shorthand that also respects the text
direction: `data-keyrove-orientation="horizontal"`, or
`orientation: 'horizontal'`, maps the default keys to `ArrowRight`/`ArrowLeft`,
flipped under RTL. An explicit next/prev binding still wins over it.

A binding is a combo: zero or more of `mod+` / `ctrl+` / `alt+` / `shift+` /
`meta+` (any order, any case) followed by a
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code).
`mod` resolves to `meta` on Apple platforms and `ctrl` elsewhere, and the longer
`control`, `option`, `cmd` and `command` spell the same modifiers. Matching is
exact — declared modifiers are required, undeclared ones are forbidden — so a
bare `ArrowDown` binding leaves shortcuts like <kbd>Ctrl</kbd>+<kbd>ArrowDown</kbd>
with their browser defaults. Keys are matched on `e.code`, the physical key, so
bindings hold across keyboard layouts. The matcher is exported as
`matchesCombo(e, combo)` for your own handlers.

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
`End`, `PageUp` and `PageDown` are defaults like the arrows —
`data-keyrove-home-key`, `data-keyrove-end-key`, `data-keyrove-page-up-key` and
`data-keyrove-page-down-key` rebind them — and whatever they are bound to they
act only once focus is already inside an item: they move within a group, never
into one. In a grid, bare `Home`/`End` jump to the ends of the focused row
(`data-keyrove-home-row-key`/`data-keyrove-end-row-key`) and
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

## Focus keys

Every move above is relative to where focus is. `data-keyrove-focus-key` is the
absolute kind: the combo focuses its element from anywhere the keydown reaches
the listener — a sibling group, a nested root, or, when the combo holds
<kbd>Ctrl</kbd>/<kbd>Alt</kbd>/<kbd>Meta</kbd>, a text field.

```html
<div id="panels">
  <section
    data-keyrove-root
    data-keyrove-focus-key="ctrl+shift+KeyE"
    tabindex="-1"
  >
    …
  </section>
  <section
    data-keyrove-root
    data-keyrove-focus-key="ctrl+shift+KeyB"
    tabindex="-1"
  >
    …
  </section>
</div>
```

The element need not be an item. An item stays in its group's arrow order, and
the jump carries the roving tab stop like any move. Any other element — the
panels above — is reached by its key alone, from outside any group: `from` is
`null` and no tab stop moves. Each panel is a root, so an arrow pressed on it
enters its own items rather than the first item under the listener.

The listener's placement is the reach — on `document`, the keys are page-wide.
A focus key sits ahead of the root's bindings and the defaults, so it wins any
collision; two elements naming one combo resolve to the first in DOM order; a
skipped or disabled element's key is inert. The move reports `'focus'`.

In JavaScript, `focusKeys` maps each combo to an element, or to a selector
resolved within the listener's reach. A map replaces the attribute scan rather
than adding to it, so one declaration answers for the whole listener:

```ts
panels.addEventListener('keydown', (e) =>
  keyRove(e, {
    focusKeys: { 'ctrl+shift+KeyE': '#editor', 'ctrl+shift+KeyB': '#browser' },
  }),
);
```

## Tab still works

keyrove moves focus with `element.focus()` and never touches <kbd>Tab</kbd>, so
sequential focus navigation is unaffected. Items with `tabindex="0"` stay
ordinary tab stops that arrows _also_ reach. Opt into
`data-keyrove-roving-tabindex`, or `rovingTabindex: true`, when a group should
instead be a single tab stop that <kbd>Tab</kbd> moves past rather than
through.

## Typeahead

`createTypeahead` adds type-to-focus: printable characters accumulate in a
buffer (reset after 500 ms of silence), and focus jumps to the first item
whose label starts with what was typed, case-insensitively.

```ts
import { keyRove, createTypeahead } from '@mixedrays/keyrove';

const typeahead = createTypeahead(); // { resetMs?, matchMode?, label?, onMove?, … }

list.addEventListener('keydown', (e) => keyRove(e) || typeahead(e));
```

The buffer is state, which `keyRove` itself never holds, so create one handler
per listener and chain it after `keyRove`: bound keys win, and a `KeyJ` binding
keeps navigating instead of entering the buffer. The label is what a `label`
option returns, falling back to the item's `data-keyrove-typeahead` attribute
and then its trimmed text. Matching
reads `e.key` — the typed character — unlike key bindings, which stay on the
physical `e.code`. Typing inside editable elements is never captured, modified
presses (Ctrl/Alt/Meta) are left to their shortcuts, and a space only counts
once a match is underway. The handler returns
`{ action: 'typeahead', from, to }` or `null`, the same contract as `keyRove`,
and its `onMove` fires after a real move exactly as `keyRove`'s does, so both
handlers can feed the same follow-focus logic.

`createTypeahead` also takes the settings that bear on finding an item —
`items`, `root`, `skip` and `rovingTabindex` — under the same names and with the
same fallbacks, so a group described in JavaScript hands one object to both
handlers, and they cannot disagree about what an item is:

```ts
const config = { items: '[role="menuitem"]', loop: true, rovingTabindex: true };
const typeahead = createTypeahead(config);

menu.addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
```

Repeated characters normally extend the prefix: `S`, then `S`, looks for an
item starting with `ss`. For menus that cycle through same-letter items, pass
`{ matchMode: 'cycle' }`: a single character moves to the next item after the
focused one that starts with it, wrapping, so repeated `S` presses step through
the `S` items at any pace. A different character typed before the buffer
resets still refines the prefix.

## Attributes and options

Every setting can be written in two places: as an attribute in the markup, or
as an option in the call. Both are read on every keypress, one field at a time,
options first — a field the options object leaves out falls back to its
attribute, and then to its default. A call with no options reads exactly the
markup, and mixing the two is ordinary rather than a halfway state:

```ts
keyRove(e); // everything from the markup
keyRove(e, { loop: true }); // items from the markup, looping from here
keyRove(e, { items: '[role="menuitem"]', loop: true }); // nothing from the markup
```

Reach for attributes where you write the HTML: the group is described where it
is built, so a list becomes a grid by gaining an attribute, and one delegated
listener serves any number of groups that describe themselves. Reach for
options where you don't — a component library's menu, a CMS's output — and for
settings you compute: an object built at the call site is as live as an
attribute, so `keyRove(e, { cols: columnsNow() })` re-folds the grid between
presses.

| Attribute                      | Option           | On   | Default     | Meaning                                                                                                                           |
| ------------------------------ | ---------------- | ---- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `data-keyrove-item`            | `items`          | item | —           | Marks an element as navigable. As an option: a selector run inside the root, or `(root) => Element[]`.                            |
| `data-keyrove-skip`            | `skip`           | item | —           | Passed over when moving; stays in the DOM order. As an option: a selector or `(element) => boolean`.                              |
| `data-keyrove-roving-tabindex` | `rovingTabindex` | item | —           | Moves the `tabindex="0"` tab stop with focus. As an option: one boolean for the whole group.                                      |
| `data-keyrove-root`            | `root`           | root | —           | Marks the navigation root explicitly, instead of using the listener's element. As an option: the selector a root answers to.      |
| `data-keyrove-cols`            | `cols`           | root | `1`         | Column count; above 1 the group navigates as a grid.                                                                              |
| `data-keyrove-page-length`     | `pageLength`     | root | `10`        | Items per page jump — whole rows in a grid.                                                                                       |
| `data-keyrove-next-key`        | `keys.next`      | root | axis arrow  | Combo for the next item — the next cell, in a grid. E.g. `KeyJ` or `ctrl+ArrowRight`.                                             |
| `data-keyrove-prev-key`        | `keys.prev`      | root | axis arrow  | Combo for the previous item.                                                                                                      |
| `data-keyrove-next-row-key`    | `keys.nextRow`   | root | `ArrowDown` | Combo for the next row, same column. Grids only.                                                                                  |
| `data-keyrove-prev-row-key`    | `keys.prevRow`   | root | `ArrowUp`   | Combo for the previous row. Grids only.                                                                                           |
| `data-keyrove-home-key`        | `keys.home`      | root | `Home`      | Combo for the first item — the grid's first cell, `ctrl+Home` there by default.                                                   |
| `data-keyrove-end-key`         | `keys.end`       | root | `End`       | Combo for the last item — the grid's last cell, `ctrl+End` there by default.                                                      |
| `data-keyrove-home-row-key`    | `keys.homeRow`   | root | `Home`      | Combo for the focused row's first cell. Grids only.                                                                               |
| `data-keyrove-end-row-key`     | `keys.endRow`    | root | `End`       | Combo for the focused row's last cell. Grids only.                                                                                |
| `data-keyrove-page-up-key`     | `keys.pageUp`    | root | `PageUp`    | Combo for the page jump back.                                                                                                     |
| `data-keyrove-page-down-key`   | `keys.pageDown`  | root | `PageDown`  | Combo for the page jump forward.                                                                                                  |
| `data-keyrove-focus-key`       | `focusKeys`      | any  | —           | Combo focusing this element, from anywhere under the listener, e.g. `ctrl+shift+KeyE`. As an option: combo → element or selector. |
| `data-keyrove-loop`            | `loop`           | root | —           | Next/prev wrap past the ends of a list. Grids never wrap.                                                                         |
| `data-keyrove-orientation`     | `orientation`    | root | —           | `horizontal` maps a list's default keys to `ArrowRight`/`ArrowLeft`, RTL-aware.                                                   |
| `data-keyrove-typeahead`       | `label`          | item | text        | Label for type-to-focus, when the item's own text is not it. As an option: `(item) => string`.                                    |

`keyRove` takes every option but `label`. `createTypeahead` takes `items`,
`root`, `skip`, `rovingTabindex` and `label` — the settings that bear on
finding an item.

The boolean attributes — `data-keyrove-item`, `data-keyrove-skip`,
`data-keyrove-roving-tabindex`, `data-keyrove-root`, and `data-keyrove-loop` —
are enabled when bare or set to `"true"`; set one to `"false"` to disable it.

The next/prev defaults follow the group's axis: `ArrowDown`/`ArrowUp` in a
vertical list, the reading-direction arrows in a horizontal list or a grid.

Every attribute name is also exported as a constant (`KEYROVE_ATTR_ITEM`,
`KEYROVE_ATTR_COLS`, `KEYROVE_ATTR_NEXT_ROW_KEY`, `KEYROVE_ATTR_LOOP`, …).

## onMove and return value

```ts
const result = keyRove(e, {
  onMove: ({ action, from, to }) => {},
});
```

`onMove` sits in the same object as the settings. It fires after focus has
moved, and only when it actually moved: a consumed key with nowhere to go — the
end of a list, the edge of a grid — fires nothing. `action` names the move:
`'next' | 'prev' | 'home' | 'end' | 'pageUp' | 'pageDown'`, the grid-only
`'nextRow' | 'prevRow' | 'homeRow' | 'endRow'`, and `'focus'` for a focus key. `from` is the item focus left
(`null` when the group was entered from outside, or for a focus key on an
element that is not an item) and `to` the element it landed on.

`keyRove` returns `null` when it left the key untouched, and
`{ action, from, to }` when it consumed it — with `to: null` for a consumed
no-op at an edge. A
non-null result means the key is claimed, so handlers chain with `||`:

```ts
element.addEventListener('keydown', (e) => keyRove(e) || myOwnHandler(e));
```

`toggleTabIndex({ root, isActive })` is exported for cases where you manage the
tab stop yourself — restoring it after re-rendering a list, for instance.

## License

MIT
