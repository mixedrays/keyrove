---
title: keyrove
description: Framework-agnostic keyboard navigation for lists and grids, driven by data-* attributes. Any key can move focus, and native Tab navigation keeps working.
titleTag: keyrove — Keyboard navigation for lists and grids
layout: landing
---

<ul class="hero-tags">
<li>under 3 kB gzipped</li>
<li>zero deps</li>
<li>framework-agnostic</li>
<li>TypeScript</li>
<li>MIT licence</li>
</ul>

# Keyboard navigation that behaves itself.

Lists and grids, custom key bindings, roving tabindex, typeahead and focus
shortcuts for any DOM tree. Data attributes and one keydown call, no wrappers,
no framework opinions.

<div class="hero-actions">

[Get started](/docs/introduction) [Demos](/docs/examples/basic)
<span class="hero-install"><code>npm i @mixedrays/keyrove</code><button type="button" data-copy-command="npm i @mixedrays/keyrove">copy</button></span>

</div>

## Three lines and a list is navigable

Give each navigable element `data-keyrove-item` and a tab stop, then hand the
container's keydown event to `keyRove`. Try
it now: <kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> to move,
<kbd class="kbd">Tab</kbd> to leave.

<div data-demo="inbox"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

document.querySelector('#menu').addEventListener('keydown', (e) => keyRove(e));
```

## Or bind the keys you want

The same list, driven by <kbd class="kbd">J</kbd> and <kbd class="kbd">K</kbd>
instead: one attribute each, and nothing in the JavaScript changes.

```html
<ul id="menu" data-keyrove-next-key="KeyJ" data-keyrove-prev-key="KeyK">
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
</ul>
```

<div class="feature-grid">
<div class="feature">

### <span aria-hidden="true">🧩</span> No framework, no adapter

`keyRove` takes anything shaped like a keydown event, so the same call works
with a native listener or a React, Vue, or Svelte synthetic event. The package
ships no dependencies.

</div>
<div class="feature">

### <span aria-hidden="true">⌨️</span> Any key, not just arrows

`data-keyrove-next-key` and `data-keyrove-prev-key` take any
`KeyboardEvent.code`, alone or in a combo like `mod+KeyJ`.
`data-keyrove-orientation="horizontal"` gives a list Left/Right defaults that
flip under RTL.

</div>
<div class="feature">

### <span aria-hidden="true">↕️</span> Lists and grids

<kbd class="kbd">Home</kbd> / <kbd class="kbd">End</kbd> and
<kbd class="kbd">PageUp</kbd> / <kbd class="kbd">PageDown</kbd> come with the
list. Declare `data-keyrove-cols` and Up/Down move a whole row while
Left/Right move a cell; add `data-keyrove-loop` and a list wraps at its ends.

</div>
<div class="feature">

### <span aria-hidden="true">🎯</span> Tab is left alone

Focus moves natively, and `preventDefault()` is called only for the keys
keyrove is bound to. <kbd class="kbd">Tab</kbd>, <kbd class="kbd">Enter</kbd>,
<kbd class="kbd">Space</kbd> and typing in a text field all keep working.

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

`data-keyrove-root` scopes a group, and the nearest root wins, so one
delegated listener can serve a list nested in a list, each with its own keys.

</div>
<div class="feature">

### <span aria-hidden="true">🔎</span> Jump and type-to-focus

`data-keyrove-focus-key` gives an item, or a panel, a shortcut that focuses it
from anywhere under the listener. `createTypeahead()` adds case-insensitive
typeahead, matching an item by `data-keyrove-typeahead` or by its own text.

</div>
</div>

Read the [introduction](/docs/introduction) for how it fits together, see
[custom keys](/docs/examples/custom-keys) for rebinding at work, or jump
straight to the [API reference](/docs/api) for the rules.
