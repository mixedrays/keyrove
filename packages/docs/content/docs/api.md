---
# Live page: https://keyrove.pages.dev/docs/api
title: API reference
description: Reference for keyRove, rove, the typeahead and roving tabindex helpers, key bindings, focus behavior, data attributes and every exported TypeScript type.
group: Guide
order: 4
---

| Export                                                                   | Purpose                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------- |
| [`keyRove(event, options?)`](#keyrove-event-options)                     | Handles a keydown and reports the focus move.     |
| [`options`](#options)                                                    | Configures the group in JavaScript.               |
| [`rove(element, action, options?)`](#rove-element-action-options)        | Moves focus by action name, without a keypress.   |
| [`createTypeahead(options?)`](#createtypeahead-options)                  | Creates a type-to-focus handler.                  |
| [`matchesCombo(event, combo)`](#matchescombo-event-combo)                | Tests a key combination in your own handlers.     |
| [`initRovingTabindex(root, options?)`](#initrovingtabindex-root-options) | Initializes or repairs a group's roving tab stop. |
| [`followFocus(event, options?)`](#followfocus-event-options)             | Updates the roving tab stop on `focusin`.         |
| [`toggleTabIndex({ root, isActive })`](#toggletabindex-root-isactive)    | Sets one element's `tabindex` to `0` or `-1`.     |
| [`data-keyrove-*`](#attributes)                                          | Configures items and roots in markup.             |
| [`KEYROVE_ATTR_*`](#constants)                                           | Constants for attribute names.                    |
| [Types](#types)                                                          | Event, configuration and result types.            |

## keyRove(event, options?)

Handles one keydown: reads the event's `code`, finds the item the key resolves
to within the event's navigation root, focuses it, and calls `preventDefault()`.

```ts
import { keyRove } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => keyRove(e));
```

### Keys

Items form a sequence in DOM order. `next` and `prev` move one item. In a
grid, `cols` divides that sequence into rows, and `next-row`/`prev-row` move
one row in the same column. Each move has a `*-key` attribute on the root.

In a list:

| Default key | Bound by                     | Moves                       |
| ----------- | ---------------------------- | --------------------------- |
| `ArrowDown` | `data-keyrove-next-key`      | Next item                   |
| `ArrowUp`   | `data-keyrove-prev-key`      | Previous item               |
| `Home`      | `data-keyrove-home-key`      | First navigable item        |
| `End`       | `data-keyrove-end-key`       | Last navigable item         |
| `PageDown`  | `data-keyrove-page-down-key` | Forward `page-length` items |
| `PageUp`    | `data-keyrove-page-up-key`   | Back `page-length` items    |

In a grid (`data-keyrove-cols` above 1; defaults shown for LTR, the cell arrows
follow the [reading direction](#horizontal-groups-and-rtl)):

| Default key  | Bound by                     | Moves                              |
| ------------ | ---------------------------- | ---------------------------------- |
| `ArrowRight` | `data-keyrove-next-key`      | Next cell, flowing across row ends |
| `ArrowLeft`  | `data-keyrove-prev-key`      | Previous cell                      |
| `ArrowDown`  | `data-keyrove-next-row-key`  | Next row, same column              |
| `ArrowUp`    | `data-keyrove-prev-row-key`  | Previous row, same column          |
| `Home`       | `data-keyrove-home-row-key`  | First navigable cell of the row    |
| `End`        | `data-keyrove-end-row-key`   | Last navigable cell of the row     |
| `ctrl+Home`  | `data-keyrove-home-key`      | First navigable cell of the grid   |
| `ctrl+End`   | `data-keyrove-end-key`       | Last navigable cell of the grid    |
| `PageDown`   | `data-keyrove-page-down-key` | Forward `page-length` rows         |
| `PageUp`     | `data-keyrove-page-up-key`   | Back `page-length` rows            |

Set a move's key attribute to replace its default binding. Set it to `none`
to disable the binding, for example `data-keyrove-page-down-key="none"`.
The replaced key returns to the browser unless another binding handles it.
See [custom keys](/docs/examples/custom-keys).

### Exit and enter

Bind `exit` on an inner root to leave it, or `enter` on the outer root to
focus a group inside the current item. Neither action has a default key.

| Bound by                 | `keys` field | Moves                                                |
| ------------------------ | ------------ | ---------------------------------------------------- |
| `data-keyrove-exit-key`  | `exit`       | From inside a nested root to the group around it     |
| `data-keyrove-enter-key` | `enter`      | From the focused item into the root nested inside it |

```html
<ul data-keyrove-enter-key="Enter">
  <li data-keyrove-item tabindex="0">
    Build failed
    <div data-keyrove-root data-keyrove-exit-key="Escape">
      <button data-keyrove-item tabindex="0">Retry</button>
      <button data-keyrove-item tabindex="0">View logs</button>
    </div>
  </li>
</ul>
```

- **Exit** focuses the containing item in the outer group. If none is eligible,
  it chooses the nearest eligible item after the root, then the nearest before
  it. It never exits beyond the listener's element.
- **Enter** uses the first nested root inside the focused item. It chooses
  that group's first navigable roving item with `tabindex="0"`, or its first
  navigable item. It does not try later roots if the first has no destination.
- Both exclude skipped and disabled items and items belonging to deeper roots.
- Each group keeps its own roving tab stop. A move updates an existing stop in
  the destination group, leaving the source group's stop in place. This lets
  enter return to the item last used in the inner group. Initialize each
  group's stop with [roving tabindex](/docs/examples/roving-tabindex).

When no destination is found, the key remains unhandled. This includes exit
from the listener's own group and enter on an item with no nested root. If a
chosen target cannot receive focus, the key is consumed with `to: null` and
`onMove` does not run, as with other focus moves.

The reported actions are `'exit'` and `'enter'`. See
[nested roots](/docs/examples/nested-roots#getting-back-out) for the demo.

### Combos

Every `*-key` value is a combo, or a list of them, matched by
[`matchesCombo`](#matchescombo-event-combo):

- Zero or more of `mod+`, `ctrl+`, `alt+`, `shift+`, `meta+`, in any order and
  any case, followed by a
  [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code).
  Whitespace around the parts is ignored.
- `mod` is `meta` on Apple platforms and `ctrl` elsewhere.
- `control`, `option`, `cmd` and `command` are accepted as the longer
  spellings of `ctrl`, `alt` and `meta`.
- The code is the physical key, matched case-sensitively and unaffected by
  keyboard layout: `KeyJ` is the same key on QWERTY and AZERTY. The plus key
  itself is `Equal` or `NumpadAdd`, so `+` is always the separator.
- Matching is exact: every declared modifier must be held, and every undeclared
  one must not be. A bare `KeyJ` matches only while no modifier is held, so
  <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">J</kbd> keeps its browser
  default. A `ctrl+KeyJ` binding never fires on a plain
  <kbd class="kbd">J</kbd>.
- A comma separates the combos of a list, and a move answers to any of them:
  `data-keyrove-next-key="ArrowDown, KeyJ"` keeps the arrow and adds
  <kbd class="kbd">J</kbd>. No code contains a comma (the comma key is
  `Comma`), and whitespace around the commas is ignored. Each entry is matched
  on its own, so an empty entry or one naming an unknown modifier matches
  nothing and leaves the others working. A list is literal like any explicit
  binding: to keep the default key, name it.
- The defaults are exact combos too. A modified
  <kbd class="kbd">PageDown</kbd> is left alone, and so are
  <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Home</kbd> and
  <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">End</kbd> in a list, which has
  no grid-wide scope for them.
- A combo naming an unknown modifier, or ending in a dangling `+`, matches
  nothing, not even a keydown with an empty `code`. An empty or blank value,
  or one of nothing but commas, is unset: an attribute leaves the move its
  default key, and a `keys` value leaves it to the attribute.
- `none`, trimmed and in any case, is not a combo. On its own it binds the move
  to no key; inside a list it is an entry that matches nothing. On a
  [focus key](#focus-keys) it is unset, since an element has no default key to
  free.

### Precedence

One keypress resolves to at most one action. The binding table is searched in
order, and the first match wins:

1. An element's own [focus key](#focus-keys).
2. The root's explicit `*-key` bindings.
3. The defaults of the moves left unbound.

An explicit binding wins over another action's default. For example,
`data-keyrove-next-key="Home"` makes <kbd class="kbd">Home</kbd> move to the next item instead of the
first. Replaced defaults are not restored elsewhere. `none` removes a move's
binding. Bindings for actions the layout does not support, such as row moves
in a list, are ignored.

### Roots

The root is the nearest ancestor of the event target carrying
`data-keyrove-root`, the target itself included, falling back to the element
the listener is attached to (`currentTarget`). A listener on `document` or
`window` falls back to `<html>`.

- The root's attributes configure the group. They are read on every keypress,
  so changing one takes effect at once; see
  [responsive grid](/docs/examples/responsive-grid).
- Items are all enabled `data-keyrove-item` elements under the root, in DOM
  order, except those carrying `disabled`. This includes items in nested
  roots. Use sibling roots to keep attribute-selected sequences separate.
  With [roving tabindex](/docs/examples/roving-tabindex), each root keeps its
  own tab stop: a move onto a nested root's item moves that root's stop and
  leaves the outer group's in place.
- One delegated listener can serve several roots. Inside a
  [nested root](/docs/examples/nested-roots), only that root's movement
  bindings apply; unbound keys do not fall through to the outer group.
  [Focus keys](#focus-keys) can cross root boundaries, and
  [exit and enter](#exit-and-enter) move between a nested root and the group
  around it.
- An item counts as focused when focus is anywhere inside it
  (`:focus-within`), so an item wrapping a link or a button is still the
  position after <kbd class="kbd">Tab</kbd> lands on that inner control.

### Consumed and untouched keys

`preventDefault()` is called for every key keyrove acts on, so the page does
not scroll while you move through a list. What happens to a bound key depends
on where focus is:

- **Focus inside an item of the group.** The key is consumed and focus moves.
  At the end of a list or the edge of a grid there is nowhere to go, and the
  key is still consumed: a group owns its bound keys up to its own boundary.
- **Nothing in the group focused.** Only the moves that can enter a group are
  consumed: the four directional moves, which land on the first navigable item
  (the last, for prev on a looping list), and a [focus key](#focus-keys),
  which lands on its element. <kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd>, the row ends and the page moves act only
  once focus is inside an item; pressed here, they keep their browser default.
- **A group with no items.** Movement keys keep their browser defaults.
  Focus shortcuts can still reach elements that are not items.
- **[Exit and enter](#exit-and-enter).** Unhandled when no destination is found;
  consumed when a target is chosen, even if it cannot receive focus.

Give targets native focusability or a `tabindex`. If a target cannot take
focus, such as a hidden or inert element, the key is consumed without moving.
The roving stop is restored and `onMove` does not fire.

Unbound keys keep their browser behavior and remain available to your
handlers. <kbd class="kbd">Tab</kbd>, <kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd>, <kbd class="kbd">Enter</kbd>, <kbd class="kbd">Space</kbd> and <kbd class="kbd">Escape</kbd> are unbound by default.
The [return value](#return-value) tells your handler whether keyrove consumed
the key. A key another handler already consumed is left alone.

### Edges and looping

At the ends of a list, next and prev are consumed without moving. Add
`data-keyrove-loop` to the root and they wrap instead: forward from the last
navigable item lands on the first, and back from the first lands on the last.
Entering a looping list with prev focuses its last navigable item. Only
next/prev in lists loop; grids keep their boundaries. See
[looping lists](/docs/examples/looping-lists).

A page jump travels as far as it can. One that would overshoot lands on the
last (or first) navigable item rather than doing nothing; in a grid that is the
grid's last (or first) navigable cell, whatever column the jump started in. The
row ends are stricter: `Home` and `End` in a grid look only at the focused
row, so a row of nothing but skipped cells is a consumed no-op.

A skipped item is never a move's destination, including when every item is
skipped. Then no move has anywhere to land. From outside the group, the
directional keys are unhandled and keep their browser default. With focus
already inside an item, such as a skipped item the user clicked, a bound move
is a consumed no-op. Typeahead and roving initialization exclude skipped items
the same way.

### Editable targets

Movement bindings do not run inside editable elements. Those elements keep
their caret, value and typing keys. Editable targets include:

- a `textarea` or a `select`;
- a `[contenteditable]` element and everything inside it, except a
  `contenteditable="false"` island, which opts back out;
- an `input` of any type other than `button`, `checkbox`, `color`, `file`,
  `image`, `reset` and `submit`. On those the bound keys do nothing natively,
  so navigating from them takes nothing away: a list of checkbox rows keeps
  its arrows.

A [focus key](#focus-keys) with <kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd> or <kbd class="kbd">Meta</kbd> can run inside an editable
field. These shortcuts can still conflict with text input: Windows can report
<kbd class="kbd">AltGr</kbd> as <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Alt</kbd>, so a `ctrl+alt+` focus key may fire while typing characters
such as € or @.

When `isComposing` is true, no binding runs, including focus shortcuts. All
keys remain available to the input method.

See [editable targets](/docs/examples/editable-targets) for a demo.

### Horizontal groups and RTL

Reading direction changes the default horizontal arrows. Moves still follow
DOM order. Direction comes from the nearest `dir` attribute; a missing `dir`
or `dir="auto"` falls back to computed style.

- `data-keyrove-orientation="horizontal"` on a list makes `ArrowRight` and
  `ArrowLeft` the next and prev defaults. Under RTL they swap, so a toolbar
  reads "forward" the way its text does. A grid ignores the attribute: its
  cell axis is already horizontal.
- A grid's default cell arrows follow the reading direction the same way. Under
  RTL, DOM order renders right-to-left, so <kbd class="kbd">←</kbd> is the
  next cell; each arrow keeps moving focus the way it points. The row arrows
  never flip.

Both rules apply to defaults only. An explicit binding is literal, never
flipped or remapped, and wins over orientation wherever both are set. The
default arrows it replaces go back to their browser behavior. See
[horizontal lists](/docs/examples/horizontal-lists) for both directions at
work.

### Focus keys

Set `data-keyrove-focus-key="ctrl+shift+KeyE"` on an element to focus it from
anywhere under the listener, including sibling and nested roots. A combo with
<kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd> or <kbd class="kbd">Meta</kbd> also works inside an editable field. Bare codes work outside
editable targets. The reported action is `'focus'`.

- Focus keys sit first in the [binding table](#precedence), so they win any
  collision with the root's bindings or the defaults. Two elements naming one
  combo resolve to the first in DOM order. The attribute scan excludes targets
  with an enabled `data-keyrove-skip` or a `disabled` attribute.
- The element need not be an item. An item stays in its group's order, so the
  arrows reach it too; any other element is reached by its key alone.
- On an item, the move happens in the item's own group: the nearest root above
  it, else the listener's element. An item that is itself a root belongs to
  the group above it. `from` is the item of that group holding focus, or `null`
  when focus was outside it.
- On a non-item destination, `from` is `null` when jumping to it, and no
  roving stop moves. If focus is already inside it, `from` is that element
  and the result is a consumed no-op. Make a panel its inner list's root so
  an arrow after the shortcut enters that list.
- Pressed while focus is already inside its element, the key is a consumed
  no-op: claimed, with `to: null`.
- The element has to be able to take focus. A panel usually needs
  `tabindex="-1"`, which also keeps it out of the
  <kbd class="kbd">Tab</kbd> order. On an element that cannot take focus, the
  key is the same consumed no-op.
- On an item, the roving tab stop moves within the item's group, as for an
  arrow move: when the item focus leaves carries
  `data-keyrove-roving-tabindex`, it drops to `tabindex="-1"` and the target
  takes `0`. When focus leaves an item of a nested group, that group keeps its
  stop, and the target takes its own group's stop. From outside the group
  keyRove leaves the stop where it was, though a
  [`followFocus`](#followfocus-event-options) listener then moves it to the
  item focus landed on.

See [focus keys](/docs/examples/focus-keys) for the pattern at work.

### Options

Use options to configure a group in JavaScript. `keyRove` reads them on each
call, falling back to attributes and defaults for omitted settings. The
options object is typed [`KeyRoveOptions`](#keyroveoptions). See
[configuration differences](/docs/attributes-and-options#configuration-differences)
for naming, scope and replacement rules.

```ts
keyRove(e); // attributes and defaults
keyRove(e, { loop: true }); // override looping only
keyRove(e, { items: '[role="menuitem"]' }); // override item lookup only
```

| Option           | Falls back to                  | Meaning                                                                                                                                                                        |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `items`          | `data-keyrove-item`            | The group's items: a selector run inside the root, or `(root) => Element[]`. Elements carrying `disabled` are never navigable.                                                 |
| `root`           | `data-keyrove-root`            | Selector a [root](#roots) answers to, matched at or above the event's target.                                                                                                  |
| `cols`           | `data-keyrove-cols`            | Columns. Above 1 the group is a grid. `'auto'` counts the root's CSS grid tracks on every keypress.                                                                            |
| `loop`           | `data-keyrove-loop`            | Whether next/prev wrap at the ends. Lists only.                                                                                                                                |
| `orientation`    | `data-keyrove-orientation`     | `'horizontal'` re-points a list's default arrows; see [RTL](#horizontal-groups-and-rtl).                                                                                       |
| `pageLength`     | `data-keyrove-page-length`     | Rows per page jump — items, in a list.                                                                                                                                         |
| `keys`           | the `*-key` attributes         | The [combo](#combos) or combos each move answers to: `{ next: 'ArrowDown, KeyJ' }`, or `'none'` for no key. Read move by move. Includes [`exit` and `enter`](#exit-and-enter). |
| `focusKeys`      | `data-keyrove-focus-key`       | Combo, or a list of them, → element or a selector resolved within the listener's reach: `{ 'F6, ctrl+KeyE': '#panel' }`. Replaces the attribute scan rather than adding to it. |
| `skip`           | `data-keyrove-skip`            | Which items a move passes over: a selector or `(element) => boolean`.                                                                                                          |
| `rovingTabindex` | `data-keyrove-roving-tabindex` | Whether the group carries one tab stop. One boolean for the group, where the attribute is read per item.                                                                       |

`keys` falls back per action. `{ keys: { next: 'KeyJ' } }` changes only next;
other actions retain their attribute or default bindings. Empty, blank and
comma-only bindings fall back; `'none'` disables the binding.

A supplied `focusKeys` map, including `{}`, replaces the whole attribute scan.
Its targets bypass skip checks, but disabled targets remain excluded. Selector
targets resolve under the listener; element targets are used directly.

Numeric `cols` and `pageLength` options are rounded down to whole numbers.
Values below 1 or `NaN` fall back to the attribute, then the default if the
attribute is invalid or below 1. Defaults are one column and ten items or rows
per page.

Supply computed values in the call, for example
`keyRove(e, { cols: columnsNow() })`. See
[options in JavaScript](/docs/examples/javascript-options) and the shared
settings accepted by [`createTypeahead`](#createtypeahead-options).

### options.onMove

Fired _after_ focus has moved, and only when it actually moved. A consumed key
with nowhere to go, at the end of a list or the edge of a grid, fires nothing,
and neither does a move whose target does not take focus.

```ts
keyRove(e, {
  onMove: ({ action, from, to }) => console.log(action, from, to),
});
```

`action` is `'next'`, `'prev'`, `'home'`, `'end'`, `'pageUp'` or `'pageDown'`;
`'nextRow'`, `'prevRow'`, `'homeRow'` or `'endRow'` in a grid; `'exit'` or
`'enter'` between nested groups; or `'focus'` for a shortcut. `from` is the item
focus left, or `null` when no item was focused or the destination is a non-item.
`to` is the element that received focus.

### Return value

`keyRove` reports what it did with the key, so handlers compose:

- `null`: the key was not keyrove's and is untouched, browser default included.
  This includes a key another handler already consumed.
- `{ action, from, to }`: the key was consumed. `to` is the newly focused
  element, or `null` for a consumed no-op, where the group owns the key but
  there is nowhere left to go, or the target did not take focus.

A non-null result means the key was consumed. Chain handlers with `||` to
pass only unhandled keys to the next one:

```ts
element.addEventListener('keydown', (e) => keyRove(e) || myOwnHandler(e));
```

The [listbox](/docs/examples/listbox) chains three handlers this way.

A key is already consumed when an earlier handler called `preventDefault()`
on the event. `keyRove` and typeahead return `null` for it without moving
focus, so a component and an app shell can both call keyrove on the same
bubbling event and focus moves once. keyrove never stops propagation, so
ancestor listeners still receive the event. In a `||` chain, `null` still
passes it to your next handler; check `e.defaultPrevented` there if your
handler should skip consumed keys too.

## rove(element, action, options?)

Moves focus by action name, without a keypress. Use it for on-screen next and
previous buttons, gamepads and remotes, or to focus a group's first item with
`rove(list, 'home')`.

```ts
import { rove } from '@mixedrays/keyrove';

nextButton.addEventListener('click', () => rove(results, 'next'));
prevButton.addEventListener('click', () => rove(results, 'prev'));
```

`action` is a [stride action](#groupoptions-strideaction): `'next'`, `'prev'`,
`'home'`, `'end'`, `'pageUp'` or `'pageDown'`, plus `'nextRow'`, `'prevRow'`,
`'homeRow'` and `'endRow'` in a grid. Key bindings do not affect it. To focus
a specific element, call `element.focus()`, and attach
[`followFocus`](#followfocus-event-options) to a roving group.

The group is found as for a keypress, with `element` as both target and
listener: the nearest [root](#roots) at or above `element`, else `element`
itself.

The move starts from, in this order:

1. The focused item. The move matches its key exactly: same result, roving
   stop and `onMove`.
2. In a roving group, the item holding the tab stop. A button takes focus when
   pressed, so this lets repeated presses continue from the user's position.
3. Otherwise, the move enters the group. `home`, `next`, `nextRow` and
   `pageDown` go to the first navigable item; `end`, `prev`, `prevRow` and
   `pageUp` go to the last. `homeRow` and `endRow` do nothing.

Row actions apply only to grids; in a list they do nothing.

It accepts the same [options](#options) as `keyRove`, including `onMove`, and
ignores `keys` and `focusKeys`.

It returns `{ action, from, to }`, as a keypress does (see
[Return value](#return-value)). `from` is `null` when the move entered the
group. `to` is `null` when there was nowhere to go or the target did not take
focus. It returns `null` when there is no move to make: no group, no item to
enter, or a row action in a list.

## createTypeahead(options?)

Builds a keydown handler that focuses items as their labels are typed.
Printable characters accumulate in a buffer, and focus jumps to the first
navigable item whose label starts with it. Case is ignored, and so are
accents and other combining marks: <kbd class="kbd">E</kbd> reaches _Émilie_,
and <kbd class="kbd">É</kbd> reaches _emilie_.

```ts
import { keyRove, createTypeahead } from '@mixedrays/keyrove';

const typeahead = createTypeahead();

list.addEventListener('keydown', (e) => keyRove(e) || typeahead(e));
```

Chain it _after_ `keyRove`, as above, so a printable binding like `KeyJ`
navigates instead of entering the buffer. Create one handler per listener: the
buffer lives in the handler, which keeps `keyRove` itself stateless. See
[typeahead](/docs/examples/typeahead) for it at work.

| Option           | Default    | Meaning                                                                                                                                  |
| ---------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `label`          | —          | `(item) => string`, the text an item is matched by. Falls through to the attribute and then the item's text where it returns nothing.    |
| `resetMs`        | `500`      | Milliseconds of typing silence after which the buffer clears.                                                                            |
| `matchMode`      | `'prefix'` | `'cycle'` moves each single-character press to the next matching item after focus, wrapping, so repeats cycle; [see below](#cycle-mode). |
| `foldDiacritics` | `true`     | Ignore accents and other combining marks on both sides of the match. Turn it off where an accent tells two items apart.                  |
| `onMove`         | —          | Fired after focus has moved, and only then; see [`keyRove`'s option](#options-onmove).                                                   |

It shares `items`, `root`, `skip` and `rovingTabindex` with `keyRove`, using
the same fallback rules. Pass one configuration to both handlers:

```ts
const config = { items: '[role="menuitem"]', loop: true };
const typeahead = createTypeahead(config);

el.addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
```

Typeahead ignores movement options: `keys`, `cols`, `loop`, `orientation`
and `pageLength`. Its options are captured when the handler is created;
recreate it to change them. Item queries, skip predicates and attribute
fallbacks still read the current DOM. The
[complete roving setup](/docs/installation#complete-roving-setup) shows it
beside navigation, initialization and focus tracking.

Labels come from `label(item)`, then `data-keyrove-typeahead`, then
`textContent`. An empty value falls through to the next source. Text content
is trimmed and consecutive whitespace is collapsed. Skipped and disabled
items are excluded; a `skip` option replaces the attribute test.
Roots resolve [as in `keyRove`](#roots).

Bindings match the physical `e.code`; typeahead reads `e.key`, the character
the key produced in the user's layout. A press is buffered only when it is
typing:

- a single character, with none of <kbd class="kbd">Ctrl</kbd>,
  <kbd class="kbd">Alt</kbd> or <kbd class="kbd">Meta</kbd> held
  (<kbd class="kbd">Shift</kbd> is allowed; it is how capitals are typed);
- not inside an [editable target](#editable-targets);
- a space only once the buffer holds a character, so the spacebar keeps
  scrolling and clicking.

The buffer clears after `resetMs` of silence, and whenever a press resolves to
a different root than the last one, so one delegated handler serves several
groups without carrying a prefix between them. There is no timer to clean up.
A character that matches nothing is left to its browser default but stays in
the buffer, so a mistyped prefix matches nothing more until the reset clears
it.

The handler follows the `keyRove` contract: `null` when the key was left
untouched or [already consumed](#return-value), which leaves the buffer
unchanged, and `{ action: 'typeahead', from, to }` when it was consumed, with
`to: null` when the match is already focused or cannot receive focus.
`onMove` fires after focus has moved and only when it actually moved, so both
handlers can feed the same follow-focus logic. The roving tab stop moves with
the match, as for an arrow move.

### Cycle mode

With `matchMode: 'cycle'`, a buffer holding a single character searches from
the item after the focused one, in DOM order, and wraps past the last item.
Pressing that character again does not grow the buffer, so each press moves on
to the next item starting with it, whether or not the reset has passed in
between. A different character typed before the reset still refines the
prefix, and prefixes longer than one character match from the top as usual.
The trade-off is that a label opening with a doubled letter, such as _Aaron_,
cannot be found by typing "aa".

## matchesCombo(event, combo)

Whether a keydown event matches a [combo](#combos), typed
[`KeyCombo`](#keycombo). This is the matcher behind every key check keyrove
makes, exported for your own handlers.

```ts
import { matchesCombo } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => {
  if (matchesCombo(e, 'Escape')) closePanel();
  if (matchesCombo(e, 'mod+KeyK')) openPalette();
});
```

Matching is exact, so `'Escape'` above rejects
<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Escape</kbd>. A list matches any
of its combos, which saves writing the any-of by hand:

```ts
if (!matchesCombo(e, 'Space, Enter')) return null;
```

## initRovingTabindex(root, options?)

Initializes or repairs a [roving group's](/docs/examples/roving-tabindex) tab
stop. Call it after rendering, and again after a render that may replace items.
`keyRove` does not initialize the stop for you.

```ts
import { initRovingTabindex } from '@mixedrays/keyrove';

initRovingTabindex(list);
```

Only the root's own roving items participate: items marked with
`data-keyrove-roving-tabindex`, or those enabled by the options. Nested roots
keep their own stops; initialize them separately.

The stop is chosen in this order:

1. A valid `initial` item: one of the group's navigable roving items.
2. The first navigable roving item that already has `tabindex="0"`.
3. The first navigable roving item.

Skipped and disabled items cannot hold the stop. All other roving items get
`-1`, including skipped and disabled ones. Only changed attributes are written.

It returns the item holding the stop, or `null` when no roving item is
navigable. Items that do not carry the stop keep whatever `tabindex` they have.

It shares `items`, `root`, `skip` and `rovingTabindex` with the other helpers,
so you can pass the same configuration:

```ts
const config = { items: '[role="menuitem"]', rovingTabindex: true };

initRovingTabindex(menu, config);
menu.addEventListener('keydown', (e) => keyRove(e, config));
```

Use `initial` to choose a stop explicitly, such as a listbox's selected option:

```ts
initRovingTabindex(listbox, {
  initial: listbox.querySelector('[aria-selected="true"]'),
});
```

A valid `initial` overrides the existing stop. Pass it for first setup or an
intentional external selection change. Omit it on routine renders to preserve
the user's position. Null, skipped, disabled or non-roving items are ignored,
using the fallback order above. The
[complete roving setup](/docs/installation#complete-roving-setup) shows where
each call belongs.

## followFocus(event, options?)

Updates a roving group's tab stop when focus enters an item, including clicks,
programmatic focus and <kbd class="kbd">Tab</kbd> entering a control inside an item. Attach it to
`focusin` so returning with <kbd class="kbd">Tab</kbd> reaches the most recently focused item:

```ts
import { followFocus, keyRove } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => keyRove(e));
list.addEventListener('focusin', (e) => followFocus(e));
```

- The item is found the way a keypress finds its position: the nearest
  [root](#roots) above the target, and the item of its group holding focus.
  Focus on a control inside an item counts as focus on the item.
- Where that root's own items hold no focus, the group around it is asked,
  as far as the listener's element. That covers a panel that is a root and
  also an item of the group around it, and a control of a nested root that
  sits inside an outer item.
- The item takes the stop when it carries one and is not skipped, and every
  other roving item of its group gets `-1`. A nested group's stop is its own
  and is never touched.
- Only attributes that change are written. After one of keyRove's own moves,
  which has already carried the stop, the `focusin` it causes writes nothing.

It returns the item now holding the stop, or `null` when focus is in no item
that carries one. It takes the same [group settings](#options) as
[`initRovingTabindex`](#initrovingtabindex-root-options): `items`, `root`,
`skip` and `rovingTabindex`. See the
[complete roving setup](/docs/installation#complete-roving-setup) for all
the helpers wired together.

## toggleTabIndex({ root, isActive })

Sets `tabindex` to `0` or `-1` on a single element.

```ts
import { toggleTabIndex } from '@mixedrays/keyrove';

toggleTabIndex({ root: firstItem, isActive: true });
```

Use it where you manage one element's tab stop yourself. For a whole roving
group, [`initRovingTabindex`](#initrovingtabindex-root-options) keeps exactly
one `0` for you, and [`followFocus`](#followfocus-event-options) moves it with
focus that keyRove did not move. Descendant tab stops are left alone; roving tabindex
only needs the item itself to carry the stop. A nullish `root` is a no-op, so a
query that found nothing needs no guard.

## Attributes

The table below describes attribute configuration. The [options table](#options)
maps it to JavaScript; [configuration differences](/docs/attributes-and-options#configuration-differences)
explains scope and replacement exceptions.

On an item:

| Attribute                      | Meaning                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data-keyrove-item`            | Marks an element as navigable. It is the position whenever focus is anywhere inside it.                                                                                              |
| `data-keyrove-skip`            | Passed over when moving; keeps its place in the sequence. `disabled` also excludes an element, but removes it from the sequence entirely, so in a grid it shifts the cells after it. |
| `data-keyrove-roving-tabindex` | Moves the `tabindex="0"` tab stop along with focus.                                                                                                                                  |
| `data-keyrove-focus-key`       | [Combo](#combos) that focuses this element from anywhere under the listener, e.g. `ctrl+shift+KeyE`. Works without `data-keyrove-item`, too.                                         |
| `data-keyrove-typeahead`       | Label for [type-to-focus](#createtypeahead-options), when the item's own text is not it.                                                                                             |

On the root, read on every keypress:

| Attribute                    | Default                                                  | Meaning                                                                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-keyrove-root`          | —                                                        | Marks the root explicitly, instead of the listener's element.                                                                                                                                                           |
| `data-keyrove-cols`          | `1`                                                      | Column count; above 1 the group navigates as a grid. Values below 1 fall back to the default. `auto` counts the tracks of the root's CSS grid on every keypress; see [responsive grid](/docs/examples/responsive-grid). |
| `data-keyrove-page-length`   | `10`                                                     | Items per page jump; rows, in a grid. Values below 1 fall back to the default.                                                                                                                                          |
| `data-keyrove-loop`          | —                                                        | Next and prev wrap past the ends of a list. Grids never wrap. See [looping lists](/docs/examples/looping-lists).                                                                                                        |
| `data-keyrove-orientation`   | —                                                        | `horizontal` re-points a list's next/prev defaults at `ArrowRight`/`ArrowLeft`, RTL-aware. See [horizontal lists](/docs/examples/horizontal-lists).                                                                     |
| `data-keyrove-next-key`      | `ArrowDown`; `ArrowRight` in a horizontal list or a grid | Next item; the next cell, in a grid. E.g. `KeyJ` or `ctrl+ArrowRight`.                                                                                                                                                  |
| `data-keyrove-prev-key`      | `ArrowUp`; `ArrowLeft` in a horizontal list or a grid    | Previous item.                                                                                                                                                                                                          |
| `data-keyrove-next-row-key`  | `ArrowDown`                                              | Next row, same column. Grid only.                                                                                                                                                                                       |
| `data-keyrove-prev-row-key`  | `ArrowUp`                                                | Previous row, same column. Grid only.                                                                                                                                                                                   |
| `data-keyrove-home-key`      | `Home`; `ctrl+Home` in a grid                            | First item; the grid's first cell.                                                                                                                                                                                      |
| `data-keyrove-end-key`       | `End`; `ctrl+End` in a grid                              | Last item; the grid's last cell.                                                                                                                                                                                        |
| `data-keyrove-home-row-key`  | `Home`                                                   | First cell of the focused row. Grid only.                                                                                                                                                                               |
| `data-keyrove-end-row-key`   | `End`                                                    | Last cell of the focused row. Grid only.                                                                                                                                                                                |
| `data-keyrove-page-up-key`   | `PageUp`                                                 | Page jump back.                                                                                                                                                                                                         |
| `data-keyrove-page-down-key` | `PageDown`                                               | Page jump forward.                                                                                                                                                                                                      |
| `data-keyrove-exit-key`      | —                                                        | From inside this nested root to the group around it. See [exit and enter](#exit-and-enter).                                                                                                                             |
| `data-keyrove-enter-key`     | —                                                        | From the focused item into the root nested inside it.                                                                                                                                                                   |

The boolean attributes — `data-keyrove-item`, `data-keyrove-skip`,
`data-keyrove-roving-tabindex`, `data-keyrove-root`, and `data-keyrove-loop` —
are enabled when bare or set to `"true"`; set one to `"false"` to disable it.

Every `*-key` attribute takes `none` as well as a combo, which leaves its move
with no key and its default key to the browser.

Horizontal default arrows reverse under RTL; see
[horizontal groups and RTL](#horizontal-groups-and-rtl).

### Attribute builders

`rootAttributes(options?)` and `itemAttributes(options?)` return plain objects
of `data-keyrove-*` attributes with string values and literal property names
in their types. Spread them into JSX or Svelte markup, use Vue's `v-bind`, or
apply them with `setAttribute`; see [framework examples](/docs/installation#react).

```ts
import { rootAttributes, itemAttributes } from '@mixedrays/keyrove';

rootAttributes({ cols: 3, loop: false, keys: { next: 'KeyJ, ArrowDown' } });
// {
//   'data-keyrove-root': 'true',
//   'data-keyrove-cols': '3',
//   'data-keyrove-loop': 'false',
//   'data-keyrove-next-key': 'KeyJ, ArrowDown'
// }

itemAttributes({ skip: false, rovingTabindex: true, typeahead: 'Inbox' });
// {
//   'data-keyrove-item': 'true',
//   'data-keyrove-skip': 'false',
//   'data-keyrove-roving-tabindex': 'true',
//   'data-keyrove-typeahead': 'Inbox'
// }
```

Both builders always emit their enabled marker, including when called with
no arguments. Booleans become `"true"` or `"false"`, numbers become strings,
and `undefined` fields are omitted. They do not set `tabindex`; give each item
a tab stop or [initialize roving tabindex](/docs/examples/roving-tabindex#setting-the-initial-tab-stop).

The root input shares its fields and types with `GroupOptions`. Move bindings
accept the same combos, comma-separated lists and `'none'`. Bindings are open
[`KeyCombo`](#keycombo) strings, as in `GroupOptions`; the builders do not
validate their spelling.
Per-item `skip` and `rovingTabindex` are booleans, unlike group-wide selectors
and settings. The public input and output types are:

```ts
type RootAttributeOptions = Pick<
  GroupOptions,
  'cols' | 'loop' | 'orientation' | 'pageLength' | 'keys'
>;

type ItemAttributeOptions = {
  skip?: boolean;
  rovingTabindex?: boolean;
  focusKey?: KeyCombo;
  typeahead?: string;
};

// RootAttributes and ItemAttributes name the returned object types.
```

`items`, the `root` selector, group-wide `skip` and `rovingTabindex`, and
`focusKeys` stay options; they have no corresponding root attribute.

For plain DOM code:

```ts
for (const [name, value] of Object.entries(rootAttributes({ loop: true }))) {
  list.setAttribute(name, value);
}
```

The builders have no DOM dependency and can run during server rendering.
Unused builders are tree-shaken away with the rest of the package's unused
exports.

### Constants

Every attribute name is exported as a constant, so markup built in JavaScript
need not hardcode strings. Drop `data-keyrove-`, upper-case the rest with `_`
for `-`, and prefix `KEYROVE_ATTR_`: `data-keyrove-next-row-key` is
`KEYROVE_ATTR_NEXT_ROW_KEY`.

```ts
import { KEYROVE_ATTR_ITEM } from '@mixedrays/keyrove';

const item = document.createElement('li');
item.setAttribute(KEYROVE_ATTR_ITEM, '');
item.tabIndex = 0;
```

## Types

```ts
import type {
  GroupOptions,
  KeyCombo,
  KeyRoveCode,
  KeyRoveEvent,
  KeyRoveOptions,
  Move,
  MoveAction,
  MoveResult,
  InitRovingTabindexOptions,
  ItemAttributeOptions,
  ItemAttributes,
  Options, // the earlier name of KeyRoveOptions
  RootAttributeOptions,
  RootAttributes,
  RovingTabindexOptions,
  StrideAction,
  TypeaheadMove,
  TypeaheadOptions,
  TypeaheadResult,
} from '@mixedrays/keyrove';
```

### KeyRoveEvent

The required event shape. Native keyboard events and compatible framework
events, including React synthetic events, satisfy it.

```ts
type KeyRoveEvent = {
  code: KeyRoveCode;
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  preventDefault: () => void;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
  key?: string;
};
```

The modifier flags, `isComposing`, `defaultPrevented` and `key` are optional so
a hand-built event object still qualifies. A missing flag reads as "not held",
a missing `isComposing` as "not composing" and a missing `defaultPrevented` as
not [consumed](#return-value). An object of your own that bridges events must
forward them, or every press matches as unmodified and unconsumed. Only
[typeahead](#createtypeahead-options) reads `key`; an event without it
navigates but never typeaheads.

### KeyRoveCode

The `code` an event carries: the physical key, such as `KeyJ` or `ArrowDown`.
Any string is accepted; the union exists so editors complete the codes
keyrove binds by default. It does not validate. Bindings, which add modifiers
and lists, use [`KeyCombo`](#keycombo).

```ts
type KeyRoveCode =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown'
  | (string & {});
```

### KeyCombo

A binding string: one [combo](#combos), such as `'KeyJ'` or
`'ctrl+ArrowDown'`, or a comma-separated list of them, such as
`'ArrowDown, KeyJ'`. It types the `keys` values, `focusKey` in the attribute
builders, and the second argument of
[`matchesCombo`](#matchescombo-event-combo). Where a move is bound, `'none'`
binds it to no key and returns the default key to the browser.

```ts
type KeyCombo = KeyRoveCode; // the same open string, in a binding's role

const next: KeyCombo = 'ArrowDown, ctrl+KeyJ';
const options: KeyRoveOptions = { keys: { next, pageDown: 'none' } };
```

Like `KeyRoveCode`, it accepts any string, including values read from
attributes or data, and does not validate the grammar.

### MoveAction, MoveResult, Move

```ts
type MoveAction =
  | 'home'
  | 'end'
  | 'homeRow' // grid only: first cell of the focused row
  | 'endRow' // grid only: last cell of the focused row
  | 'next' // +1 item in DOM order: a list item, or a grid cell
  | 'prev'
  | 'nextRow' // grid only: +1 row, same column
  | 'prevRow'
  | 'pageUp'
  | 'pageDown'
  | 'exit' // from a nested root to the group around it
  | 'enter' // from an item into the root nested inside it
  | 'focus'; // an element's own data-keyrove-focus-key

// what keyRove returns for a consumed keypress
type MoveResult = {
  action: MoveAction;
  from: Element | null;
  to: Element | null;
};

// what onMove receives: a move that actually happened
type Move = MoveResult & { to: Element };
```

### KeyRoveOptions

What [`keyRove`](#options) and [`rove`](#rove-element-action-options) take:
the group settings and `onMove`. `Options` is its earlier name and remains
exported as the same type.

```ts
type KeyRoveOptions = GroupOptions & { onMove?: (move: Move) => void };

type Options = KeyRoveOptions;
```

### GroupOptions, StrideAction

All group settings are optional; see [options](#options) for fallbacks.
`StrideAction` covers movement through the item sequence. It excludes `exit`,
`enter` and `focus`.

```ts
type GroupOptions = {
  items?: string | ((root: Element) => Element[]);
  root?: string;
  cols?: number | 'auto';
  loop?: boolean;
  orientation?: 'horizontal' | 'vertical';
  pageLength?: number;
  keys?: Partial<Record<StrideAction | 'exit' | 'enter', KeyCombo | 'none'>>;
  focusKeys?: Record<string, string | Element>;
  skip?: string | ((element: Element) => boolean);
  rovingTabindex?: boolean;
};

type StrideAction = Exclude<MoveAction, 'exit' | 'enter' | 'focus'>;
```

### TypeaheadOptions, TypeaheadResult, TypeaheadMove

What [`createTypeahead`](#createtypeahead-options) takes and its handler
returns. The result has `MoveResult`'s shape with its own action.

```ts
type TypeaheadOptions = Pick<
  GroupOptions,
  'items' | 'root' | 'skip' | 'rovingTabindex'
> & {
  label?: (item: Element) => string; // the text an item is matched by
  resetMs?: number; // buffer lifetime, default 500
  matchMode?: 'prefix' | 'cycle'; // how repeated characters match, default 'prefix'
  foldDiacritics?: boolean; // ignore accents and other marks, default true
  onMove?: (move: TypeaheadMove) => void;
};

type TypeaheadResult = {
  action: 'typeahead';
  from: Element | null;
  to: Element | null; // null: the match is the item already focused
};

// what onMove receives: a move that actually happened
type TypeaheadMove = TypeaheadResult & { to: Element };
```

### RovingTabindexOptions, InitRovingTabindexOptions

What [`followFocus`](#followfocus-event-options) and
[`initRovingTabindex`](#initrovingtabindex-root-options) take: the group
settings that decide which elements are the group's roving items, and for
`initRovingTabindex`, the item to give the stop.

```ts
type RovingTabindexOptions = Pick<
  GroupOptions,
  'items' | 'root' | 'skip' | 'rovingTabindex'
>;

type InitRovingTabindexOptions = RovingTabindexOptions & {
  initial?: Element | null; // the item to hold the stop, when it can
};
```
