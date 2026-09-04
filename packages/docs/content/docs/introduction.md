---
title: Introduction
description: What keyrove does, which keys it moves focus with, how it sits beside native Tab navigation, and what it deliberately leaves to you.
group: Guide
order: 1
---

keyrove makes a list or a grid keyboard-navigable. You mark the navigable
elements with an attribute and forward keydown events to one function; it works
out which element should receive focus next and moves it there. It does not
render anything, own any state, or wrap your components.

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

That is the whole library. Two things about it are easy to assume the other
way:

- **It is not an arrow-key library.** Arrows are the default binding.
  [Which keys move focus](#which-keys-move-focus) is markup, so a group can be
  driven by <kbd class="kbd">J</kbd> / <kbd class="kbd">K</kbd>,
  <kbd class="kbd">W</kbd> / <kbd class="kbd">S</kbd>, or whatever your widget
  reads as forward and back.
- **It does not replace <kbd class="kbd">Tab</kbd>.** keyrove moves real DOM
  focus and leaves every key it is not bound to alone, so
  [sequential focus navigation](#tab-still-works) keeps working as the browser
  does it.

## How it works

Three pieces do all the work:

1. **Items** carry `data-keyrove-item`. Everything keyrove can move focus to is
   found by that attribute, in DOM order.
2. **The root** is the element whose keydown you forward, or the nearest
   ancestor carrying `data-keyrove-root`. It scopes the item query, and its
   attributes configure the group.
3. **The call** is `keyRove(event)`. It reads the event's `code`, finds the
   target element, focuses it, and calls `preventDefault()`. That happens only
   for the keys it is bound to, so the page does not scroll out from under you
   while every other key keeps its browser default.

Because the configuration lives in the markup, there is no options object to
keep in sync with the DOM. A list becomes a grid by gaining a column-count
attribute, and nothing in your JavaScript changes.

## What it handles

| Feature                                                                                        | Attribute                                                                            | Default keys                                                                                                      | Read more                                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Forward and back, one item through the DOM order                                               | `data-keyrove-next-key`, `data-keyrove-prev-key`                                     | <kbd class="kbd">↓</kbd> <kbd class="kbd">↑</kbd>                                                                 | [Basic list](/docs/examples/basic)                         |
| Rows and cells                                                                                 | `data-keyrove-cols`, `data-keyrove-next-row-key`, `data-keyrove-prev-row-key`        | <kbd class="kbd">↓</kbd> <kbd class="kbd">↑</kbd> a row, <kbd class="kbd">→</kbd> <kbd class="kbd">←</kbd> a cell | [Grid](/docs/examples/grid)                                |
| First and last item; in a grid the row's ends, and the grid's with <kbd class="kbd">Ctrl</kbd> | `data-keyrove-home-key`, `data-keyrove-end-key` and their `-row-` pair               | <kbd class="kbd">Home</kbd> <kbd class="kbd">End</kbd>                                                            | [Grid](/docs/examples/grid)                                |
| Page jumps, by items or by rows                                                                | `data-keyrove-page-length`, `data-keyrove-page-up-key`, `data-keyrove-page-down-key` | <kbd class="kbd">PageUp</kbd> <kbd class="kbd">PageDown</kbd>, 10 at a time                                       | [Basic list](/docs/examples/basic#page-length)             |
| Horizontal lists, RTL-aware                                                                    | `data-keyrove-orientation="horizontal"`                                              | <kbd class="kbd">→</kbd> <kbd class="kbd">←</kbd>                                                                 | [Custom keys](/docs/examples/custom-keys#horizontal-lists) |
| Wrapping at the ends of a list                                                                 | `data-keyrove-loop`                                                                  | —                                                                                                                 | [API](/docs/api#edges-and-looping)                         |
| One tab stop per group                                                                         | `data-keyrove-roving-tabindex`                                                       | —                                                                                                                 | [Roving tabindex](/docs/examples/roving-tabindex)          |
| Headings and dead entries out of the order                                                     | `data-keyrove-skip`, or `disabled`                                                   | —                                                                                                                 | [Skipped items](/docs/examples/skipped-items)              |
| Groups inside groups, each with its own keys                                                   | `data-keyrove-root`                                                                  | —                                                                                                                 | [Nested roots](/docs/examples/nested-roots)                |
| An item's own shortcut, from anywhere under the listener                                       | `data-keyrove-focus-key`                                                             | —                                                                                                                 | [Focus keys](/docs/examples/focus-keys)                    |
| Type-to-focus, as an opt-in second handler                                                     | `createTypeahead()`, `data-keyrove-typeahead`                                        | letters                                                                                                           | [API](/docs/api#createtypeahead-options)                   |

Inside an input, textarea, select or `contenteditable` region the arrows and
<kbd class="kbd">Home</kbd> belong to the caret, and keyrove leaves them there;
see [editable targets](/docs/api#editable-targets).

## Which keys move focus

The keys are configuration, not a fixed part of the library.
`data-keyrove-next-key` and `data-keyrove-prev-key` on the root take any
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code),
and default to `ArrowDown` and `ArrowUp` only because that is what most lists
want.

```html
<!-- A results list in an app whose users expect vim keys. -->
<ul data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">
  …
</ul>
```

Keys you have not bound are never touched: bind `KeyJ` and `KeyK`, and the
arrow keys go back to scrolling the page. Each root is read separately, so two
groups on one page can answer to different keys. <kbd class="kbd">Home</kbd>,
<kbd class="kbd">End</kbd>, <kbd class="kbd">PageUp</kbd> and
<kbd class="kbd">PageDown</kbd> are defaults in the same way, with
`data-keyrove-home-key` and its siblings to rebind them. The full rules,
grammar, defaults and precedence, are in the [API reference](/docs/api#keys);
[custom keys](/docs/examples/custom-keys) shows them at work.

## Tab still works

keyrove adds to the browser's focus model rather than replacing it:

- Focus moves through `element.focus()`, so focus order, `:focus-visible`,
  scroll-into-view, and what a screen reader announces are all the native
  behaviours.
- `preventDefault()` is called only for the keys keyrove acts on.
  <kbd class="kbd">Tab</kbd>, <kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd>,
  <kbd class="kbd">Enter</kbd>, <kbd class="kbd">Space</kbd> and
  <kbd class="kbd">Escape</kbd> reach your handlers and the browser untouched.
- An item counts as focused when focus is anywhere inside it, so an item
  wrapping a link or a button still navigates after
  <kbd class="kbd">Tab</kbd> lands on that inner control.

So the two navigation models compose. Items given `tabindex="0"` are ordinary
tab stops that <kbd class="kbd">Tab</kbd> walks through _and_ the bound keys
move between, with nothing to configure.

When a long group should not cost the page a tab stop per item, opt into
[roving tabindex](/docs/examples/roving-tabindex): the group becomes a single
stop that <kbd class="kbd">Tab</kbd> moves _past_, and the bound keys move
within it.

## What it leaves to you

keyrove moves focus. It does not decide what focus _means_ in your widget, so
these remain yours:

- **Roles and ARIA.** keyrove never writes `role`, `aria-selected`, or
  `aria-activedescendant`. A listbox needs those; what they should say depends
  on the widget you are building.
- **Selection and activation.** <kbd class="kbd">Enter</kbd> and
  <kbd class="kbd">Space</kbd> are not touched. Wiring them up is one more
  listener on the same element.
- **Tab stops on first render.** keyrove never creates a tab stop. Give the
  first item `tabindex="0"` yourself, or call
  [`toggleTabIndex`](/docs/api#toggletabindex-root-isactive).

## Framework support

There is no adapter, and none is needed. `keyRove` takes anything shaped like a
keydown event, which a native `KeyboardEvent` and every framework's synthetic
wrapper already are; the exact shape is
[`KeyRoveEvent`](/docs/api#keyroveevent). [Installation](/docs/installation)
shows the wiring in React, Vue and Svelte, and the
[basic list](/docs/examples/basic) is the first example.
