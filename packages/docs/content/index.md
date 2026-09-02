---
title: keyrove
description: Framework-agnostic keyboard navigation for lists and grids, driven by data-* attributes. Any key can move focus, and native Tab navigation keeps working.
layout: landing
---

<p class="hero-eyebrow">Framework-agnostic · Zero dependencies</p>

# Keyboard navigation, driven by data attributes.

Mark your items with `data-keyrove-item`, pass keydown events to `keyRove`, and
lists and grids become keyboard navigable. Arrows are the default binding, not
the limit — the keys that move focus are attributes, so any key can drive a
group, and <kbd class="kbd">Tab</kbd> keeps behaving the way the browser
intends.

<div class="hero-actions">

[Get started](/docs/introduction) [Try the demos](/docs/examples/basic)

</div>

```sh
pnpm add @mixedrays/keyrove
```

<div class="feature-grid">
<div class="feature">

### <span aria-hidden="true">🧩</span> No framework, no adapter

`keyRove` takes anything shaped like a keydown event, so the same call works
with a native listener or a React, Vue, or Svelte synthetic event — and the
package ships no dependencies.

</div>
<div class="feature">

### <span aria-hidden="true">⌨️</span> Any key, not just arrows

`data-keyrove-next-key` and `data-keyrove-prev-key` take any
`KeyboardEvent.code`, alone or in a combo like `mod+KeyJ`. `ArrowDown` and
`ArrowUp` are what you get for free, not what you are stuck with.

</div>
<div class="feature">

### <span aria-hidden="true">↕️</span> Lists, grids, and the keys between

<kbd class="kbd">Home</kbd> / <kbd class="kbd">End</kbd> and
<kbd class="kbd">PageUp</kbd> / <kbd class="kbd">PageDown</kbd> come with the
list. Declare `data-keyrove-cols` and Up/Down move a whole row while
Left/Right move a cell; add `data-keyrove-loop` and a list wraps at its ends.

</div>
<div class="feature">

### <span aria-hidden="true">↔️</span> Horizontal groups read as they should

`data-keyrove-orientation="horizontal"` points a list's defaults at Left/Right
without spelling out a combo. Any sideways pair — that toolbar's, or a grid's
cell arrows, sideways by nature — flips under RTL, resolved from the nearest
`dir`, so it moves "forward" the way the text does.

</div>
<div class="feature">

### <span aria-hidden="true">🎯</span> Tab is left alone

Focus moves natively, and `preventDefault()` is called only for keys keyrove is
bound to — so <kbd class="kbd">Tab</kbd> and
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> keep working beside it.

</div>
<div class="feature">

### <span aria-hidden="true">🧭</span> Roving tabindex, when you want it

`data-keyrove-roving-tabindex` moves the `tabindex="0"` tab stop along with
focus, so <kbd class="kbd">Tab</kbd> enters and leaves a group rather than
walking through every item in it.

</div>
<div class="feature">

### <span aria-hidden="true">⏭️</span> Not everything is a stop

`data-keyrove-skip` and plain `disabled` keep headings, separators, and dead
entries in the DOM and in the reading order, but out of the navigation order.

</div>
<div class="feature">

### <span aria-hidden="true">🪆</span> Groups inside groups

`data-keyrove-root` scopes a group, and the nearest root wins — so one
delegated listener can serve a list nested in a list, each with its own keys.

</div>
<div class="feature">

### <span aria-hidden="true">✍️</span> Typing still types

Arrows and <kbd class="kbd">Home</kbd> belong to the caret inside an input,
textarea, select, or `contenteditable` region, and keyrove leaves them there.
Inputs those keys do nothing on — a checkbox, a button — keep navigating.

</div>
<div class="feature">

### <span aria-hidden="true">🔎</span> Type-to-focus

`createTypeahead()` adds case-insensitive typeahead, matching an item by
`data-keyrove-typeahead` or by its own text.

</div>
</div>

## Three lines and a list is navigable

Give each navigable element `data-keyrove-item` and a tab stop, then hand the
container's keydown event to `keyRove`. Try it — <kbd class="kbd">Tab</kbd> to
an item, then use the arrow keys.

<div data-demo="inbox"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

document.querySelector('#menu').addEventListener('keydown', (e) => {
  keyRove(e);
});
```

## Or bind the keys you want

The same list, driven by <kbd class="kbd">J</kbd> and <kbd class="kbd">K</kbd>
instead — one attribute each, and nothing in the JavaScript changes.

```html
<ul id="menu" data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
</ul>
```

Read the [introduction](/docs/introduction) for how it fits together, see
[custom keys](/docs/examples/custom-keys) for the rebinding rules, or jump
straight to the [API reference](/docs/api).
