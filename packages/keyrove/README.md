# @mixedrays/keyrove

[![npm](https://img.shields.io/npm/v/@mixedrays/keyrove?color=4f46e5)](https://www.npmjs.com/package/@mixedrays/keyrove)
[![minzipped size](https://img.shields.io/bundlejs/size/%40mixedrays%2Fkeyrove?color=4f46e5&label=minzipped%20size)](https://bundlejs.com/?q=%40mixedrays%2Fkeyrove)
[![license](https://img.shields.io/npm/l/@mixedrays/keyrove?color=4f46e5)](https://github.com/mixedrays/keyrove/blob/main/LICENSE)

Keyboard navigation for lists, grids and trees. Configure it with data
attributes or JavaScript options, in any framework.

**[Documentation](https://keyrove.pages.dev)** ·
[Attributes and options](https://keyrove.pages.dev/docs/attributes-and-options) ·
[API reference](https://keyrove.pages.dev/docs/api) ·
[Examples](https://keyrove.pages.dev/docs/examples/basic)

Configure items, keys and layout with attributes or options. Options override
attributes one setting at a time, with
[scope and replacement differences](https://keyrove.pages.dev/docs/attributes-and-options#configuration-differences).

keyrove moves DOM focus. Arrow keys are the defaults; bind other keys as needed.
Tab and unbound keys keep their browser behavior.

```sh
pnpm add @mixedrays/keyrove
```

## Features

- **Framework-agnostic:** accepts native and compatible framework events,
  including React synthetic events. No runtime dependencies.
- **Attributes or options:** configure markup you control, or select existing
  elements with `keyRove(e, { items: '[role="menuitem"]' })`.
- **Current DOM:** `keyRove` reads items and settings on every call, with no
  navigation instance to update. Roving groups may need their tab stop repaired
  after rendering; see [Tab still works](#tab-still-works).
- **Configurable keys:** bind moves to physical key codes and exact modifier
  combinations, use platform-aware `mod`, list several combos per move, or
  disable a binding with `none`.
- **Focus shortcuts:** focus an item or panel directly, across roots under a
  shared listener. Ctrl/Alt/Meta focus shortcuts also work in editable fields.
- **Lists and grids:** move by item, row, ends or pages. Lists can loop;
  grids keep their boundaries.
- **Trees:** navigate visible rows while your widget expands and collapses
  branches. See the [tree example](https://keyrove.pages.dev/docs/examples/tree-view).
- **Horizontal and RTL navigation:** default horizontal arrows follow text
  direction; explicit bindings remain literal.
- **Roving tabindex:** give a group one tab stop and move it with focus.
- **Skipped items:** pass over headings or unavailable cells while preserving
  their positions. Disabled elements are removed from the item sequence.
- **Nested roots:** each root uses its own movement bindings under one
  delegated listener.
- **Editable fields:** movement bindings leave text fields, selects and editable
  content their native keys. Checkbox and button inputs still navigate.
- **Typeahead:** find items by label with case and accent handling, prefix
  matching or repeated-character cycling.
- **Moves from code:** run any move from a button, gamepad or remote with
  `rove(list, 'next')`; see [Moves without a keypress](#moves-without-a-keypress).

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

To configure the same list without item attributes, pass an `items` selector.
Keep `tabindex="0"` on the list items:

```ts
document
  .querySelector('#menu')
  .addEventListener('keydown', (e) => keyRove(e, { items: 'li' }));
```

See [Attributes and options](#attributes-and-options) for fallback rules.

`keyRove` accepts native keyboard events and compatible framework events,
including React's synthetic events:

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

Move attributes map to fields in `keys`: for example,
`data-keyrove-next-row-key` maps to `keys.nextRow`. Omitted or empty bindings
fall back to the corresponding attribute, then the default.

A binding replaces the default. To add a key rather than swap one, list several
combos, comma-separated, and the move answers to any of them:

```html
<div
  data-keyrove-next-key="ArrowDown, KeyJ"
  data-keyrove-prev-key="ArrowUp, KeyK"
>
  …
</div>
```

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
`matchesCombo(e, combo)` for your own handlers, and takes a list the same way:
`matchesCombo(e, 'Space, Enter')`.

```html
<div
  data-keyrove-next-key="ctrl+ArrowRight"
  data-keyrove-prev-key="ctrl+ArrowLeft"
>
  …
</div>
```

Next and prev move one item in DOM order. With `data-keyrove-cols` above 1,
items form a grid: next/prev move one cell on the reading-direction arrows,
and next-row/prev-row move one row on Down/Up.

Home, End, PageUp and PageDown can also be rebound. They act only when focus
is already inside an item. In grids, Home/End move to row ends and
Ctrl+Home/End move to grid ends. Unbound keys keep their browser behavior.

A move can also be switched off. `none` binds it to no key and hands its
default back to the browser, so a toolbar, which has no page moves, leaves
<kbd>PageDown</kbd> to the page:

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

Bind enter and exit keys to move between nested groups. Neither has a default:

- `data-keyrove-exit-key` on the inner root, or `keys.exit`, focuses an eligible
  outer item: the containing item, then the nearest after the root, then before.
- `data-keyrove-enter-key` on the outer root, or `keys.enter`, focuses the first
  nested root's navigable roving tab stop, or its first navigable item.

```html
<li data-keyrove-root data-keyrove-exit-key="Escape">…</li>
```

Both exclude skipped and disabled targets. If no destination is found, the key
remains unhandled. See [nested roots](https://keyrove.pages.dev/docs/examples/nested-roots)
for setup and [exit and enter](https://keyrove.pages.dev/docs/api#exit-and-enter)
for focus and tab-stop behavior.

At the ends of a list the bound keys are consumed but focus stays put. Add
`data-keyrove-loop` on the root and next on the last item wraps to the first,
and vice versa. Grids keep their edges — they never wrap.

Movement bindings do not run in textareas, selects, editable content, or
inputs with native editing keys, including text, number, range and radio.
Checkbox and button inputs still navigate. See
[editable targets](https://keyrove.pages.dev/docs/examples/editable-targets)
for the full list and focus-shortcut exception.

## Focus keys

Set `data-keyrove-focus-key` on an element to focus it from anywhere under
the listener. Ctrl/Alt/Meta shortcuts also work inside editable fields, except
during input-method composition.

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

An item with a focus key remains in its group's arrow order. A move from a
roving item also carries the tab stop; entry from outside the group needs
`followFocus` to update it. A non-item destination, such as a panel, reports
`from: null` when reached and does not move a group's tab stop.

Each panel above is its inner list's root, so an arrow after the jump enters
that panel's items. Its `tabindex="-1"` allows focus without adding a Tab stop.
A target that cannot receive focus produces a consumed no-op.

Focus keys take precedence over movement bindings. Attribute shortcuts resolve
ties in DOM order and exclude skipped and disabled targets. On `document`,
shortcuts work page-wide. The action is `'focus'`.

`focusKeys` maps combos to elements or selectors under the listener. A supplied
map replaces the entire attribute scan, even when empty. Explicit targets
bypass skip checks, but disabled targets are still excluded:

```ts
panels.addEventListener('keydown', (e) =>
  keyRove(e, {
    focusKeys: { 'ctrl+shift+KeyE': '#editor', 'ctrl+shift+KeyB': '#browser' },
  }),
);
```

## Tab still works

With the default bindings, Tab and Shift+Tab keep their browser behavior.
Items with `tabindex="0"` are individual tab stops. For one stop per group,
mark every item with `data-keyrove-roving-tabindex`, or pass
`rovingTabindex: true`.

Set one navigable item's tabindex to `0` and the others to `-1`, or call
`initRovingTabindex` after rendering. Repeat after renders that may replace
items. It preserves the first existing navigable stop, otherwise gives the
first navigable roving item the stop. Nested roots keep their own stops.

The helper shares `items`, `root`, `skip` and `rovingTabindex` with the other
handlers. Pass `initial` to override the stop for first setup or an intentional
selection change; omit it during routine render updates:

```ts
initRovingTabindex(listbox, {
  initial: listbox.querySelector('[aria-selected="true"]'),
});
```

Attach `followFocus` to `focusin` so the stop also follows clicks,
programmatic focus and entry from outside the group:

```ts
list.addEventListener('keydown', (e) => keyRove(e));
list.addEventListener('focusin', (e) => followFocus(e));
```

See [roving tabindex](https://keyrove.pages.dev/docs/examples/roving-tabindex)
for initialization and focus tracking.

## Typeahead

`createTypeahead` adds type-to-focus: printable characters accumulate in a
buffer (reset after 500 ms of silence), and focus jumps to the first item
whose label starts with what was typed, ignoring case and accents: `e`
reaches "Émilie". `foldDiacritics: false` keeps accents apart.

```ts
import { keyRove, createTypeahead } from '@mixedrays/keyrove';

const typeahead = createTypeahead(); // { resetMs?, matchMode?, label?, foldDiacritics?, onMove?, … }

list.addEventListener('keydown', (e) => keyRove(e) || typeahead(e));
```

Create the typeahead handler once per listener and call it after `keyRove`.
Navigation bindings then take precedence over typing.

Labels come from `label(item)`, then `data-keyrove-typeahead`, then the item's
text. Empty values fall through; text content is trimmed and whitespace is
collapsed. Matching uses the typed character (`e.key`), while navigation
bindings use the physical code (`e.code`).

Typing inside editable fields and Ctrl/Alt/Meta combinations are ignored.
Space joins the buffer only after another character. An unmatched character
stays in the buffer but leaves its browser behavior unchanged.

The result is `null` for an unhandled key or `{ action: 'typeahead', from, to }`
for a consumed one. `to: null` means focus did not move, including when the
match was already focused or could not receive focus. `onMove` runs only after
a successful move.

Share `items`, `root`, `skip` and `rovingTabindex` with `keyRove` so both
handlers use the same group rules:

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

Options override attributes one setting at a time. Omitted options fall back
to attributes, then defaults:

```ts
keyRove(e); // attributes and defaults
keyRove(e, { loop: true }); // override looping only
keyRove(e, { items: '[role="menuitem"]', loop: true }); // override these two settings
```

Use attributes to keep settings beside markup you control. Use options for
existing markup or computed values, such as `{ cols: columnsNow() }`.

`keys` falls back per action; `focusKeys` replaces the whole shortcut scan.
Some options also have different scope: `rovingTabindex` applies to a group,
while its attribute applies per item. See
[configuration differences](https://keyrove.pages.dev/docs/attributes-and-options#configuration-differences).

| Attribute                      | Option           | On   | Default     | Meaning                                                                                                                           |
| ------------------------------ | ---------------- | ---- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `data-keyrove-item`            | `items`          | item | —           | Marks an element as navigable. As an option: a selector run inside the root, or `(root) => Element[]`.                            |
| `data-keyrove-skip`            | `skip`           | item | —           | Passed over when moving; stays in the DOM order. As an option: a selector or `(element) => boolean`.                              |
| `data-keyrove-roving-tabindex` | `rovingTabindex` | item | —           | Moves the `tabindex="0"` tab stop with focus. As an option: one boolean for the whole group.                                      |
| `data-keyrove-root`            | `root`           | root | —           | Marks the navigation root explicitly, instead of using the listener's element. As an option: the selector a root answers to.      |
| `data-keyrove-cols`            | `cols`           | root | `1`         | Column count; above 1 the group navigates as a grid. `auto` counts the root's CSS grid tracks on every keypress.                  |
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
| `data-keyrove-exit-key`        | `keys.exit`      | root | —           | Combo leaving this nested root for the group around it.                                                                           |
| `data-keyrove-enter-key`       | `keys.enter`     | root | —           | Combo entering the root nested in the focused item.                                                                               |
| `data-keyrove-focus-key`       | `focusKeys`      | any  | —           | Combo focusing this element, from anywhere under the listener, e.g. `ctrl+shift+KeyE`. As an option: combo → element or selector. |
| `data-keyrove-loop`            | `loop`           | root | —           | Next/prev wrap past the ends of a list. Grids never wrap.                                                                         |
| `data-keyrove-orientation`     | `orientation`    | root | —           | `horizontal` maps a list's default keys to `ArrowRight`/`ArrowLeft`, RTL-aware.                                                   |
| `data-keyrove-typeahead`       | `label`          | item | text        | Label for type-to-focus, when the item's own text is not it. As an option: `(item) => string`.                                    |

`keyRove` takes every option but `label`. `rove` takes the same options and
ignores `keys` and `focusKeys`. `createTypeahead` takes `items`,
`root`, `skip`, `rovingTabindex` and `label` — the settings that bear on
finding an item. `initRovingTabindex` and `followFocus` take the same four
without `label`.

The boolean attributes — `data-keyrove-item`, `data-keyrove-skip`,
`data-keyrove-roving-tabindex`, `data-keyrove-root`, and `data-keyrove-loop` —
are enabled when bare or set to `"true"`; set one to `"false"` to disable it.

When every item is skipped, some navigation moves currently fall back to the
first or last item. See [edge behavior](https://keyrove.pages.dev/docs/api#edges-and-looping)
for the exceptions and how to prevent those moves.

The next/prev defaults follow the group's axis: `ArrowDown`/`ArrowUp` in a
vertical list, the reading-direction arrows in a horizontal list or a grid.
Every `*-key` attribute and `keys` field also takes `none`, which switches its
move off and frees the default key.

Every attribute name is also exported as a constant (`KEYROVE_ATTR_ITEM`,
`KEYROVE_ATTR_COLS`, `KEYROVE_ATTR_NEXT_ROW_KEY`, `KEYROVE_ATTR_LOOP`, …).

## onMove and return value

```ts
const result = keyRove(e, {
  onMove: ({ action, from, to }) => {},
});
```

`onMove` runs only after focus moves successfully. Consumed keys at an edge,
or targets that cannot take focus, do not trigger it.

`action` names the move: `'next'`, `'prev'`, `'home'`, `'end'`, `'pageUp'`,
`'pageDown'`; the grid actions `'nextRow'`, `'prevRow'`, `'homeRow'`, `'endRow'`;
`'exit'` and `'enter'` between nested groups; or `'focus'` for a shortcut.
`from` is the previous item, or `null` when no item was focused or the destination
is a non-item. `to` is the destination.

`keyRove` returns `null` when it left the key untouched, and
`{ action, from, to }` when it consumed it — with `to: null` for a consumed
no-op at an edge. A
non-null result means the key is claimed, so handlers chain with `||`:

```ts
element.addEventListener('keydown', (e) => keyRove(e) || myOwnHandler(e));
```

`toggleTabIndex({ root, isActive })` is exported for cases where you manage one
element's tab stop yourself. For a whole roving group,
`initRovingTabindex(root, options?)` keeps exactly one stop, and
`followFocus(event, options?)` moves it with focus keyRove did not move.

## Moves without a keypress

`rove(element, action, options?)` moves focus by action name. Use it for
on-screen buttons, gamepads and remotes. Key bindings do not affect it, and it
returns the same result as `keyRove`:

```ts
nextButton.addEventListener('click', () => rove(results, 'next'));
```

The move starts from the focused item. If focus is elsewhere, such as on the
button, a roving group starts from its tab stop. Otherwise, `next` enters at
the first item and `prev` at the last.

## License

MIT
