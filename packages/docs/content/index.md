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

### No framework, no adapter

`keyRove` takes anything shaped like a keydown event, so the same call works
with a native listener or a React, Vue, or Svelte synthetic event.

</div>
<div class="feature">

### Any key, not just arrows

`data-keyrove-next-key` and `data-keyrove-prev-key` take any
`KeyboardEvent.code`. `ArrowDown` and `ArrowUp` are what you get for free, not
what you are stuck with.

</div>
<div class="feature">

### Tab is left alone

Focus moves natively, and `preventDefault()` is called only for keys keyrove is
bound to — so <kbd class="kbd">Tab</kbd> and
<kbd class="kbd">Shift</kbd>+<kbd class="kbd">Tab</kbd> keep working beside it.

</div>
<div class="feature">

### Grid-aware

Declare `data-keyrove-cols-length` and Up/Down move a whole row while
Left/Right move a cell, with no wrapping at the edges.

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
