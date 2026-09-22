---
title: Introduction
description: Set up keyboard navigation, choose keys and options, and keep native Tab behavior.
titleTag: Introduction to keyboard navigation — keyrove
group: Guide
order: 1
---

keyrove moves focus through lists, grids and trees. Mark the items you want to
navigate and pass `keydown` events to `keyRove`. It finds and focuses the next
item without rendering UI or wrapping your components.

```html title="Markup"
<ul id="menu">
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
  <li data-keyrove-item tabindex="0">Sent</li>
</ul>
```

```ts title="The call"
import { keyRove } from '@mixedrays/keyrove';

const menu = document.querySelector<HTMLElement>('#menu')!;
menu.addEventListener('keydown', (e) => keyRove(e));
```

```ts title="No attributes"
// Keep <li tabindex="0">, but select items without data-keyrove-item.
import { keyRove } from '@mixedrays/keyrove';

const menu = document.querySelector<HTMLElement>('#menu')!;
menu.addEventListener('keydown', (e) => keyRove(e, { items: 'li' }));
```

This list supports arrows, <kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd> and page jumps. <kbd class="kbd">Tab</kbd> still visits each
item. You can [change the keys](#which-keys-move-focus) and configure the group
with [attributes, options, or both](#where-a-group-is-described).

## How it works

1. **Items** are the elements marked with `data-keyrove-item`, read in DOM
   order. An `items` option can select them instead.
2. **The root** is the nearest element at or above the event target marked with
   `data-keyrove-root`, or the listener's element if none is marked. It contains
   the items and carries the group's settings.
3. **The handler**, `keyRove(event)`, reads the key, finds the target item and
   focuses it. It calls `preventDefault()` for handled keys, so navigation does
   not also scroll the page. Unhandled keys keep their browser defaults.

The handler reads the current DOM and settings on every keypress. Changing
items or adding a column count requires no navigation instance to update.

## What it handles

| Feature              | Behavior                                                                                                                                                                                        | Example                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Lists                | <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd> move one item in DOM order                                                                                                                    | [Basic list](/docs/examples/basic)                  |
| Grids                | <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd> move a row; <kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd> move a cell                                                                     | [Grid](/docs/examples/grid)                         |
| First and last items | <kbd class="kbd">Home</kbd>/<kbd class="kbd">End</kbd> jump to list ends or grid row ends; <kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Home</kbd>/<kbd class="kbd">End</kbd> jump to grid ends | [Grid](/docs/examples/grid)                         |
| Page jumps           | <kbd class="kbd">PageUp</kbd>/<kbd class="kbd">PageDown</kbd> move 10 items or rows by default                                                                                                  | [Page length](/docs/examples/basic#page-length)     |
| Horizontal lists     | <kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd> follow the text direction                                                                                                                     | [Horizontal lists](/docs/examples/horizontal-lists) |
| Looping              | Next/previous wrap at list ends                                                                                                                                                                 | [Looping lists](/docs/examples/looping-lists)       |
| Roving tabindex      | One tab stop follows focus within a group                                                                                                                                                       | [Roving tabindex](/docs/examples/roving-tabindex)   |
| Skipped items        | Pass over items marked with `data-keyrove-skip` or `disabled`                                                                                                                                   | [Skipped items](/docs/examples/skipped-items)       |
| Nested groups        | Each group has its own keys, with optional enter and exit bindings                                                                                                                              | [Nested roots](/docs/examples/nested-roots)         |
| Focus shortcuts      | Focus an item or panel from anywhere under the listener                                                                                                                                         | [Focus keys](/docs/examples/focus-keys)             |
| Typeahead            | Add `createTypeahead()` to focus items by typing their labels                                                                                                                                   | [Typeahead](/docs/examples/typeahead)               |
| Trees                | Navigate visible rows; your handlers expand and collapse branches                                                                                                                               | [Tree view](/docs/examples/tree-view)               |
| Moves from code      | Call `rove(list, 'next')` from a button, gamepad or remote                                                                                                                                      | [`rove`](/docs/api#rove-element-action-options)     |

Text fields, selects and editable content keep their editing keys. See
[editable targets](/docs/examples/editable-targets) for the rules and exceptions.

## Where a group is described

Use `data-keyrove-*` attributes in your markup or pass options to the handler.
Options are useful when the HTML comes from a component library or CMS:

```ts
import { keyRove } from '@mixedrays/keyrove';

const config = { items: '[role="menuitem"]', loop: true };
const menu = document.querySelector<HTMLElement>('#share')!;

menu.addEventListener('keydown', (e) => keyRove(e, config));
```

Options override attributes one setting at a time. For example,
`keyRove(e, { loop: true })` enables looping while reading items and key bindings
from the markup.

See [attributes and options](/docs/attributes-and-options) for the full mapping,
or [options in JavaScript](/docs/examples/javascript-options) for a complete demo.

## Which keys move focus

Lists use `ArrowDown` for next and `ArrowUp` for previous by default. Set
`data-keyrove-next-key` and `data-keyrove-prev-key` on the root to use other
`KeyboardEvent.code` values or combinations such as `mod+KeyJ`:

```html
<ul data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">
  …
</ul>
```

Here, <kbd class="kbd">J</kbd> and <kbd class="kbd">K</kbd> move focus, and the arrows return to their browser defaults.
Each group can have different bindings. <kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd>, <kbd class="kbd">PageUp</kbd> and <kbd class="kbd">PageDown</kbd> can also
be rebound with their own key attributes.

See [custom keys](/docs/examples/custom-keys) for examples and the
[API reference](/docs/api#keys) for defaults, syntax and precedence.

## <kbd class="kbd">Tab</kbd> still works

keyrove uses `element.focus()`, preserving the browser's focus styling,
scrolling and focus announcements. An item also counts as focused when a link,
button or other element inside it has focus.

With the default bindings, <kbd class="kbd">Tab</kbd>, <kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd>, <kbd class="kbd">Enter</kbd>, <kbd class="kbd">Space</kbd> and <kbd class="kbd">Escape</kbd> keep their
usual behavior. Items with `tabindex="0"` remain ordinary tab stops, reachable
with both <kbd class="kbd">Tab</kbd> and the bound navigation keys.

For a single tab stop per group, use
[roving tabindex](/docs/examples/roving-tabindex). <kbd class="kbd">Tab</kbd> enters and leaves the
group, while the bound keys move between its items.

## What it leaves to you

- **Roles and ARIA.** Set the roles, labels and states your widget needs.
  keyrove does not write `role`, `aria-selected` or `aria-activedescendant`.
- **Selection and activation.** Decide what clicks, <kbd class="kbd">Enter</kbd> and <kbd class="kbd">Space</kbd> do, and
  add your own handlers. They are unbound by default.
- **Initial tab stops.** Make items focusable in your markup. For a roving
  group, give one item `tabindex="0"` and the others `-1`, or call
  [`initRovingTabindex`](/docs/api#initrovingtabindex-root-options) after rendering.

The [listbox example](/docs/examples/listbox) combines navigation with all three.

## Framework support

`keyRove` accepts native keyboard events and compatible framework events,
including React's synthetic events. See
[`KeyRoveEvent`](/docs/api#keyroveevent) for the required shape.

[Installation](/docs/installation) shows setup in vanilla JavaScript, React,
Vue and Svelte. Start with the [basic list](/docs/examples/basic) to try it.
