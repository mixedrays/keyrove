---
title: Introduction
description: What keyrove does, what it deliberately leaves to you, and the mental model behind it.
group: Getting started
order: 1
---

keyrove makes a list or a grid keyboard-navigable. You mark the navigable
elements with a `data-*` attribute and forward keydown events to one function;
it works out which element should receive focus next and moves it there.

That is the whole library. It does not render anything, own any state, or wrap
your components.

## How it works

Three pieces do all the work:

1. **Items** carry `data-keyrove-item`. Everything keyrove can move focus to is
   found by that attribute, in DOM order.
2. **The root** is the element whose keydown you forward — or the nearest
   ancestor carrying `data-keyrove-root`. It scopes the item query, and its
   attributes configure the group.
3. **The call** is `keyRove(event)`. It reads the event's `code`, finds the
   target element, focuses it, and calls `preventDefault()` so the page does not
   scroll out from under you.

```ts
import { keyRove } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => keyRove(e));
```

Because the configuration lives in the markup, there is no options object to
keep in sync with the DOM. A list that grows a column count becomes a grid by
gaining an attribute, and nothing in your JavaScript changes.

## What it handles

- <kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> step one item, or a whole
  row once the group declares columns.
- <kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd> move a single cell, in grids
  only.
- <kbd class="kbd">Home</kbd> / <kbd class="kbd">End</kbd> jump to the first and
  last navigable item.
- <kbd class="kbd">PageUp</kbd> / <kbd class="kbd">PageDown</kbd> move by
  `data-keyrove-page-length` items — whole rows in a grid.
- Roving tabindex, so <kbd class="kbd">Tab</kbd> enters and leaves a group
  rather than walking through every item in it.
- Skipping: items marked `data-keyrove-skip`, and anything `disabled`, stay in
  the DOM but out of the navigation order.

## What it leaves to you

keyrove moves focus. It does not decide what focus _means_ in your widget, so
these remain yours:

- **Roles and ARIA.** keyrove never writes `role`, `aria-selected`, or
  `aria-activedescendant`. A listbox needs those; what they should say depends
  on the widget you are building.
- **Selection and activation.** <kbd class="kbd">Enter</kbd> and
  <kbd class="kbd">Space</kbd> are not touched.
- **Tab stops on first render.** keyrove moves an existing tab stop; it does not
  create one. Give the first item `tabindex="0"` yourself, or call
  [`toggleTabIndex`](/docs/api#toggletabindex-root-isactive).

## Framework support

There is no adapter, and none is needed. `keyRove` accepts anything with
`code`, `target`, `currentTarget`, and `preventDefault` — which is the shape of
a native `KeyboardEvent` and of every framework's synthetic wrapper around one.

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
start with the [basic list example](/docs/examples/basic).
