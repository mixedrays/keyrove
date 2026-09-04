---
title: API reference
description: Every export in the package — the handler, the typeahead helper, the combo matcher, the attributes, and the types.
group: Guide
order: 3
---

| Export                                                                | What it is                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`keyRove(event, options?)`](#keyrove-event-options)                  | The handler. Moves focus for one keydown and reports what it did.        |
| [`createTypeahead(options?)`](#createtypeahead-options)               | Builds a type-to-focus handler to chain after `keyRove`.                 |
| [`matchesCombo(event, combo)`](#matchescombo-event-combo)             | The combo matcher behind every binding, for your own handlers.           |
| [`toggleTabIndex({ root, isActive })`](#toggletabindex-root-isactive) | Sets `tabindex` to `0` or `-1` on one element.                           |
| [`data-keyrove-*`](#attributes)                                       | The attributes: the whole configuration, on items and on the root.       |
| [`KEYROVE_ATTR_*`](#constants)                                        | One constant per attribute name.                                         |
| [Types](#types)                                                       | `KeyRoveEvent`, `MoveResult`, `Move`, `Options` and the typeahead types. |

## keyRove(event, options?)

Handles one keydown: reads the event's `code`, finds the item the key resolves
to within the event's navigation root, focuses it, and calls `preventDefault()`.

```ts
import { keyRove } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => keyRove(e));
```

### Keys

A group is one sequence of items in DOM order. `next` and `prev` always move
one item through it: a list item, or a grid cell. `data-keyrove-cols` folds the
sequence into rows and adds a second pair, `next-row` and `prev-row`, that
moves a whole row and keeps the column. Every move has a `*-key` attribute on
the root; the tables show the default each answers to.

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

Set the attribute on the root and that key takes over the move. The default it
replaced goes back to its browser behaviour, and nothing else changes. See
[custom keys](/docs/examples/custom-keys) for worked examples.

### Combos

Every `*-key` value is a combo, matched by
[`matchesCombo`](#matchescombo-event-combo):

- Zero or more of `mod+`, `ctrl+`, `alt+`, `shift+`, `meta+`, in any order and
  any case, followed by a
  [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code).
  Whitespace around the parts is ignored.
- `mod` is `meta` on Apple platforms and `ctrl` elsewhere.
- The code is the physical key, matched case-sensitively and unaffected by
  keyboard layout: `KeyJ` is the same key on QWERTY and AZERTY. The plus key
  itself is `Equal` or `NumpadAdd`, so `+` is always the separator.
- Matching is exact: every declared modifier must be held, and every undeclared
  one must not be. A bare `KeyJ` matches only while no modifier is held, so
  <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">J</kbd> keeps its browser
  default. A `ctrl+KeyJ` binding never fires on a plain
  <kbd class="kbd">J</kbd>.
- The defaults are exact combos too. A modified
  <kbd class="kbd">PageDown</kbd> is left alone, and so are
  <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Home</kbd> and
  <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">End</kbd> in a list, which has
  no grid-wide scope for them.
- A combo naming an unknown modifier, or ending in a dangling `+`, matches
  nothing. An empty attribute is unset.

### Precedence

One keypress resolves to at most one action. The binding table is searched in
order, and the first match wins:

1. An item's own [focus key](#focus-keys).
2. The root's explicit `*-key` bindings.
3. The defaults of the moves left unbound.

So an explicit binding that names another move's default key takes the press,
and that default stands down: with `data-keyrove-next-key="Home"`,
<kbd class="kbd">Home</kbd> moves to the next item and nothing jumps to the
first. A replaced default is not re-added anywhere; the freed key goes back to
its browser behaviour. A move the layout lacks, such as a row move on a list,
is not in the table at all, so binding it does nothing.

### Roots

The root is the nearest ancestor of the event target carrying
`data-keyrove-root`, the target itself included, falling back to the element
the listener is attached to (`currentTarget`). A listener on `document` or
`window` falls back to `<html>`.

- The root's attributes configure the group. They are read on every keypress,
  so changing one takes effect at once; see
  [responsive grid](/docs/examples/responsive-grid).
- The items are every `data-keyrove-item` in the root's subtree, in DOM order,
  nested roots included. An outer group's order runs straight through an inner
  group's items, and nothing hides them: a group that must stay out of
  another's order belongs outside that root.
- Resolving from the target rather than the listener is what lets one
  delegated listener serve several roots, and lets roots
  [nest](/docs/examples/nested-roots). While focus is inside an inner root,
  only that root's bindings apply; a key it does not bind keeps its browser
  default rather than reaching the group around it. The one thing heard across
  roots is an outer item's [focus key](#focus-keys).
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
  which lands on its item. Home, End, the row ends and the page moves act only
  once focus is inside an item; pressed here, they keep their browser default.
- **A group with no items.** Every key keeps its browser default.

Keys keyrove is not bound to are never touched. <kbd class="kbd">Tab</kbd>,
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd>,
<kbd class="kbd">Enter</kbd>, <kbd class="kbd">Space</kbd> and
<kbd class="kbd">Escape</kbd> reach your handlers and the browser as they would
without keyrove, which is why it composes with native focus navigation instead
of replacing it. The [return value](#return-value) tells you which case a
keypress fell into.

### Edges and looping

At the ends of a list, next and prev are consumed without moving. Add
`data-keyrove-loop` to the root and they wrap instead: forward from the last
navigable item lands on the first, and back from the first lands on the last.
A looping list is entered the same way round: the prev key pressed from outside
lands on the _last_ item, matching the APG menu-button convention. Only lists
loop; a grid keeps its edges, per the APG grid pattern. See
[looping lists](/docs/examples/looping-lists).

A page jump travels as far as it can. One that would overshoot lands on the
last (or first) navigable item rather than doing nothing; in a grid that is the
grid's last (or first) navigable cell, whatever column the jump started in. The
row ends are stricter: `Home` and `End` in a grid never fall back to a skipped
cell, so a row of nothing but skipped cells is a consumed no-op.

### Editable targets

Keys pressed inside an editable element are never acted on, however they are
bound: the caret or value keeps the arrows and
<kbd class="kbd">Home</kbd>/<kbd class="kbd">End</kbd>, and typing into a field
inside an item is not swallowed by a printable-key binding. Editable means:

- a `textarea` or a `select`;
- a `[contenteditable]` element and everything inside it, except a
  `contenteditable="false"` island, which opts back out;
- an `input` of any type other than `button`, `checkbox`, `color`, `file`,
  `image`, `reset` and `submit`. On those the bound keys do nothing natively,
  so navigating from them takes nothing away: a list of checkbox rows keeps
  its arrows.

One exception: a [focus key](#focus-keys) whose combo holds
<kbd class="kbd">Ctrl</kbd>, <kbd class="kbd">Alt</kbd> or
<kbd class="kbd">Meta</kbd> fires from inside a field. That press is a command,
not typing.

### Horizontal groups and RTL

Reading direction changes only which physical key is a move's _default_. It
never changes what a move does; every move is defined in DOM order. Where an
axis runs sideways, its default arrows follow the reading direction, read from
the nearest `dir` attribute and otherwise from the computed direction:

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
default arrows it replaces go back to their browser behaviour.

### Focus keys

An item can name its own key. `data-keyrove-focus-key="ctrl+shift+KeyE"`
focuses that item from anywhere the keydown reaches the listener: a sibling
group, a nested root, or, when the combo holds <kbd class="kbd">Ctrl</kbd>,
<kbd class="kbd">Alt</kbd> or <kbd class="kbd">Meta</kbd>, a text field. The
move reports `'focus'`. The value is a [combo](#combos) like any other, and a
bare code such as `KeyE` works wherever the letter would not be typing.

- Focus keys sit first in the [binding table](#precedence), so they win any
  collision with the root's bindings or the defaults. Two items naming one
  combo resolve to the first in DOM order. A skipped or disabled item's key is
  inert.
- The move happens in the target's own group: the nearest root above the item,
  else the listener's element. An item that is itself a root belongs to the
  group above it. `from` is the item of that group holding focus, or `null`
  when focus was outside it.
- Pressed while focus is already inside its item, the key is a consumed no-op:
  claimed, with `to: null`.
- The roving tab stop moves within the target's group, as for an arrow move:
  when the item focus leaves carries `data-keyrove-roving-tabindex`, it drops
  to `tabindex="-1"` and the target takes `0`. From outside the group the stop
  stays where it was, and a nested group's stop is never touched.

See [focus keys](/docs/examples/focus-keys) for the pattern at work.

### options.onMove

Fired _after_ focus has moved, and only when it actually moved. A consumed key
with nowhere to go, at the end of a list or the edge of a grid, fires nothing.

```ts
keyRove(e, {
  onMove: ({ action, from, to }) => console.log(action, from, to),
});
```

`action` names the move: `'next'`, `'prev'`, `'home'`, `'end'`, `'pageUp'`,
`'pageDown'`; in grids only, `'nextRow'`, `'prevRow'`, `'homeRow'` and
`'endRow'`; and `'focus'` for an item's own [focus key](#focus-keys). A cell
move and a row move never report the same token. `from` is the item focus left,
or `null` when the group was entered from outside, and `to` is the item it
landed on.

### Return value

`keyRove` reports what it did with the key, so handlers compose:

- `null`: the key was not keyrove's and is untouched, browser default included.
- `{ action, from, to }`: the key was consumed. `to` is the newly focused item,
  or `null` for a consumed no-op, where the group owns the key but there is
  nowhere left to go.

A non-null result means "claimed", which is what lets several handlers share
one listener without stepping on each other:

```ts
element.addEventListener('keydown', (e) => keyRove(e) || myOwnHandler(e));
```

## createTypeahead(options?)

Builds a keydown handler that focuses items as their labels are typed.
Printable characters accumulate in a buffer, and focus jumps to the first
navigable item whose label starts with it, case-insensitively.

```ts
import { keyRove, createTypeahead } from '@mixedrays/keyrove';

const typeahead = createTypeahead();

list.addEventListener('keydown', (e) => keyRove(e) || typeahead(e));
```

Chain it _after_ `keyRove`, as above, so a printable binding like `KeyJ`
navigates instead of entering the buffer. Create one handler per listener: the
buffer lives in the handler, which keeps `keyRove` itself stateless.

| Option    | Default | Meaning                                                                                |
| --------- | ------- | -------------------------------------------------------------------------------------- |
| `resetMs` | `500`   | Milliseconds of typing silence after which the buffer clears.                          |
| `onMove`  | —       | Fired after focus has moved, and only then; see [`keyRove`'s option](#options-onmove). |

The label is the item's `data-keyrove-typeahead` attribute, falling back to its
`textContent`, trimmed and with runs of whitespace collapsed, when the attribute
is absent or empty. Items carrying `data-keyrove-skip` or `disabled` are passed
over. The root resolves [as in `keyRove`](#roots), so the same delegated
listener serves both.

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
untouched, `{ action: 'typeahead', from, to }` when it was consumed, with
`to: null` when the buffer grew but still names the already-focused item.
`onMove` fires after focus has moved and only when it actually moved, so both
handlers can feed the same follow-focus logic. The roving tab stop moves with
the match, as for an arrow move.

## matchesCombo(event, combo)

Whether a keydown event matches a [combo](#combos). This is the matcher behind
every key check keyrove makes, exported for your own handlers.

```ts
import { matchesCombo } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => {
  if (matchesCombo(e, 'Escape')) closePanel();
  if (matchesCombo(e, 'mod+KeyK')) openPalette();
});
```

Matching is exact, so `'Escape'` above rejects
<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Escape</kbd>.

## toggleTabIndex({ root, isActive })

Sets `tabindex` to `0` or `-1` on a single element.

```ts
import { toggleTabIndex } from '@mixedrays/keyrove';

toggleTabIndex({ root: firstItem, isActive: true });
```

Use it where you manage the tab stop yourself: establishing the first one in a
[roving group](/docs/examples/roving-tabindex), or restoring it after
re-rendering a list. Descendant tab stops are left alone; roving tabindex only
needs the item itself to carry the stop. A nullish `root` is a no-op, so a
query that found nothing needs no guard.

## Attributes

On an item:

| Attribute                      | Meaning                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data-keyrove-item`            | Marks an element as navigable. It is the position whenever focus is anywhere inside it.                                                                                              |
| `data-keyrove-skip`            | Passed over when moving; keeps its place in the sequence. `disabled` also excludes an element, but removes it from the sequence entirely, so in a grid it shifts the cells after it. |
| `data-keyrove-roving-tabindex` | Moves the `tabindex="0"` tab stop along with focus.                                                                                                                                  |
| `data-keyrove-focus-key`       | [Combo](#combos) that focuses this item from anywhere under the listener, e.g. `ctrl+shift+KeyE`.                                                                                    |
| `data-keyrove-typeahead`       | Label for [type-to-focus](#createtypeahead-options), when the item's own text is not it.                                                                                             |

On the root, read on every keypress:

| Attribute                    | Default                                                  | Meaning                                                                                                          |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `data-keyrove-root`          | —                                                        | Marks the root explicitly, instead of the listener's element.                                                    |
| `data-keyrove-cols`          | `1`                                                      | Column count; above 1 the group navigates as a grid.                                                             |
| `data-keyrove-page-length`   | `10`                                                     | Items per page jump; rows, in a grid.                                                                            |
| `data-keyrove-loop`          | —                                                        | Next and prev wrap past the ends of a list. Grids never wrap. See [looping lists](/docs/examples/looping-lists). |
| `data-keyrove-orientation`   | —                                                        | `horizontal` re-points a list's next/prev defaults at `ArrowRight`/`ArrowLeft`, RTL-aware.                       |
| `data-keyrove-next-key`      | `ArrowDown`; `ArrowRight` in a horizontal list or a grid | Next item; the next cell, in a grid. E.g. `KeyJ` or `ctrl+ArrowRight`.                                           |
| `data-keyrove-prev-key`      | `ArrowUp`; `ArrowLeft` in a horizontal list or a grid    | Previous item.                                                                                                   |
| `data-keyrove-next-row-key`  | `ArrowDown`                                              | Next row, same column. Grid only.                                                                                |
| `data-keyrove-prev-row-key`  | `ArrowUp`                                                | Previous row, same column. Grid only.                                                                            |
| `data-keyrove-home-key`      | `Home`; `ctrl+Home` in a grid                            | First item; the grid's first cell.                                                                               |
| `data-keyrove-end-key`       | `End`; `ctrl+End` in a grid                              | Last item; the grid's last cell.                                                                                 |
| `data-keyrove-home-row-key`  | `Home`                                                   | First cell of the focused row. Grid only.                                                                        |
| `data-keyrove-end-row-key`   | `End`                                                    | Last cell of the focused row. Grid only.                                                                         |
| `data-keyrove-page-up-key`   | `PageUp`                                                 | Page jump back.                                                                                                  |
| `data-keyrove-page-down-key` | `PageDown`                                               | Page jump forward.                                                                                               |

The sideways defaults swap under RTL; see
[horizontal groups and RTL](#horizontal-groups-and-rtl). The boolean
attributes (`item`, `skip`, `root`, `loop`, `roving-tabindex`) work by
presence, so a bare attribute is enough.

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
  KeyRoveCode,
  KeyRoveEvent,
  Move,
  MoveAction,
  MoveResult,
  Options,
  TypeaheadMove,
  TypeaheadOptions,
  TypeaheadResult,
} from '@mixedrays/keyrove';
```

### KeyRoveEvent

The shape keyrove needs from a keydown event. A native `KeyboardEvent` and
every framework's synthetic event satisfy it.

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
  key?: string;
};
```

The modifier flags and `key` are optional so a hand-built event object still
qualifies. A missing flag reads as "not held", so an object of your own that
bridges events must forward the flags, or every press matches as unmodified.
Only [typeahead](#createtypeahead-options) reads `key`; an event without it
navigates but never typeaheads.

### KeyRoveCode

A `KeyboardEvent.code`. Any string is accepted; the union exists so editors
complete the codes keyrove binds by default. It does not validate, and it does
not constrain what you can bind.

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
  | 'focus'; // an item's own data-keyrove-focus-key

// what keyRove returns for a consumed keypress
type MoveResult = {
  action: MoveAction;
  from: Element | null;
  to: Element | null;
};

// what onMove receives: a move that actually happened
type Move = MoveResult & { to: Element };

type Options = { onMove?: (move: Move) => void };
```

### TypeaheadOptions, TypeaheadResult, TypeaheadMove

What [`createTypeahead`](#createtypeahead-options) takes and its handler
returns. The result has `MoveResult`'s shape with its own action.

```ts
type TypeaheadOptions = {
  resetMs?: number; // buffer lifetime, default 500
  onMove?: (move: TypeaheadMove) => void;
};

type TypeaheadResult = {
  action: 'typeahead';
  from: Element | null;
  to: Element | null; // null: the buffer grew but still names the focused item
};

// what onMove receives: a move that actually happened
type TypeaheadMove = TypeaheadResult & { to: Element };
```
