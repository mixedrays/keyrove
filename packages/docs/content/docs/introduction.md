---
title: Introduction
description: What keyrove does, which keys it moves focus with, how it sits beside native Tab navigation, and what it deliberately leaves to you.
group: Guide
order: 1
---

keyrove makes a list or a grid keyboard-navigable. You mark the navigable
elements with a `data-*` attribute and forward keydown events to one function;
it works out which element should receive focus next and moves it there.

That is the whole library. It does not render anything, own any state, or wrap
your components.

Two things follow from that, and they are worth saying up front because both
are easy to assume the other way:

- **It is not an arrow-key library.** Arrows are the default binding.
  [Which keys move focus](#which-keys-move-focus) is markup, so a group can be
  driven by <kbd class="kbd">J</kbd> / <kbd class="kbd">K</kbd>,
  <kbd class="kbd">W</kbd> / <kbd class="kbd">S</kbd>, or whatever your widget
  reads as forward and back.
- **It does not replace <kbd class="kbd">Tab</kbd>.** keyrove moves real DOM
  focus and stays out of the way of every key it is not bound to, so
  [sequential focus navigation](#tab-still-works) keeps working exactly as the
  browser does it.

## How it works

Three pieces do all the work:

1. **Items** carry `data-keyrove-item`. Everything keyrove can move focus to is
   found by that attribute, in DOM order.
2. **The root** is the element whose keydown you forward — or the nearest
   ancestor carrying `data-keyrove-root`. It scopes the item query, and its
   attributes configure the group.
3. **The call** is `keyRove(event)`. It reads the event's `code`, finds the
   target element, focuses it, and calls `preventDefault()` — but only for the
   keys it is bound to, so the page does not scroll out from under you while
   every other key keeps its browser default.

```ts
import { keyRove } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => keyRove(e));
```

Because the configuration lives in the markup, there is no options object to
keep in sync with the DOM. A list that grows a column count becomes a grid by
gaining an attribute, and nothing in your JavaScript changes.

## What it handles

- **Forward and back**, by default <kbd class="kbd">↓</kbd> and
  <kbd class="kbd">↑</kbd> — always one item through the DOM order. Rebindable;
  see below.
- **Rows**, once the group declares columns: <kbd class="kbd">↓</kbd>
  <kbd class="kbd">↑</kbd> move a whole row while forward and back — now
  <kbd class="kbd">→</kbd> <kbd class="kbd">←</kbd> by default — move a single
  cell. Both pairs rebind independently.
- <kbd class="kbd">Home</kbd> / <kbd class="kbd">End</kbd> jump to the first and
  last navigable item — the focused row's, in a grid, where
  <kbd class="kbd">Ctrl</kbd> makes them grid-wide.
- <kbd class="kbd">PageUp</kbd> / <kbd class="kbd">PageDown</kbd> move by
  `data-keyrove-page-length` items — whole rows in a grid.
- Roving tabindex, so <kbd class="kbd">Tab</kbd> enters and leaves a group
  rather than walking through every item in it.
- Skipping: items marked `data-keyrove-skip`, and anything `disabled`, stay in
  the DOM but out of the navigation order.
- Horizontal groups, via `data-keyrove-orientation` — and the default forward
  and back keys swap under RTL, so a toolbar, or a grid's cell arrows, move
  the way the text reads.
- Focus keys, via `data-keyrove-focus-key` on an item: one combo focuses it
  from anywhere under the listener — another group, a nested root, even a text
  field.
- Typeahead, as an opt-in second handler: `createTypeahead()` focuses an item
  as you type its label.

## Which keys move focus

The keys are configuration, not a fixed part of the library.
`data-keyrove-next-key` and `data-keyrove-prev-key` on the root take any
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code),
and default to `ArrowDown` and `ArrowUp` only because that is what most lists
want.

```html
<!-- A toolbar reads left to right. -->
<div data-keyrove-next-key="ArrowRight" data-keyrove-prev-key="ArrowLeft">
  …
</div>

<!-- A results list in an app whose users expect vim keys. -->
<ul data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">
  …
</ul>
```

Two consequences are worth holding on to. Keys you have not bound are never
touched — bind `KeyJ` and `KeyK` and the arrow keys go back to scrolling the
page. And because each root is read separately, two groups on one page can
answer to entirely different keys.

<kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd>,
<kbd class="kbd">PageUp</kbd> and <kbd class="kbd">PageDown</kbd> are defaults
in the same way, with `data-keyrove-home-key` and its siblings to rebind them.
[Custom keys](/docs/examples/custom-keys) covers the rebinding rules in full,
including what happens in a grid.

## Tab still works

keyrove is deliberately additive to the browser's own focus model rather than a
replacement for it:

- Focus moves through `element.focus()`, so focus order, `:focus-visible`,
  scroll-into-view, and what a screen reader announces are all the native
  behaviours.
- `preventDefault()` is called only in the branches keyrove acts on.
  <kbd class="kbd">Tab</kbd>, <kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd>,
  <kbd class="kbd">Enter</kbd>, <kbd class="kbd">Space</kbd> and
  <kbd class="kbd">Escape</kbd> reach your handlers and the browser untouched.
- An item counts as focused when focus is anywhere inside it, so an item
  wrapping a link or a button still navigates after
  <kbd class="kbd">Tab</kbd> lands on that inner control.

So the two navigation models compose. Items given `tabindex="0"` are ordinary
tab stops that <kbd class="kbd">Tab</kbd> walks through _and_ the bound keys
move between — no configuration required, and nothing to undo if you would
rather keep the plain tab order.

When a long group should not cost the page twenty tab stops, opt into
[roving tabindex](/docs/examples/roving-tabindex): the group becomes a single
stop that <kbd class="kbd">Tab</kbd> moves _past_, and the bound keys move
within it. That is the arrangement the
[ARIA authoring practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
describe for composite widgets — but it is opt-in, one attribute at a time.

## What it leaves to you

keyrove moves focus. It does not decide what focus _means_ in your widget, so
these remain yours:

- **Roles and ARIA.** keyrove never writes `role`, `aria-selected`, or
  `aria-activedescendant`. A listbox needs those; what they should say depends
  on the widget you are building.
- **Selection and activation.** <kbd class="kbd">Enter</kbd> and
  <kbd class="kbd">Space</kbd> are not touched, and neither is any other key you
  have not bound — wiring them up is one more listener on the same element.
- **Tab stops on first render.** keyrove moves an existing tab stop; it does not
  create one. Give the first item `tabindex="0"` yourself, or call
  [`toggleTabIndex`](/docs/api#toggletabindex-root-isactive).

## Framework support

There is no adapter, and none is needed. `keyRove` accepts anything with
`code`, `target`, `currentTarget`, and `preventDefault` — which is the shape of
a native `KeyboardEvent` and of every framework's synthetic wrapper around one.
The modifier flags (`ctrlKey`, `altKey`, `shiftKey`, `metaKey`) are read when
present; events carry them natively, but an object of your own that bridges
events must forward them or every press reads as unmodified.

```tsx
<ul onKeyDown={(e) => keyRove(e)}>
  {items.map((item) => (
    <li key={item.id} data-keyrove-item tabIndex={0}>
      {item.label}
    </li>
  ))}
</ul>
```

See [Installation](/docs/installation) for the wiring in each framework, or
start with the [basic list example](/docs/examples/basic). If you came here for
the key bindings, [custom keys](/docs/examples/custom-keys) is the page you
want.
