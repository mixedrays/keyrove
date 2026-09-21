---
title: keyrove
description: Framework-agnostic keyboard navigation for lists, grids and trees, driven by data-* attributes or a plain options object. Any key can move focus, and native Tab navigation keeps working.
titleTag: keyrove — Keyboard navigation for lists, grids and trees
layout: landing
---

<ul class="hero-tags">
<li>about 3 kB gzipped</li>
<li>zero deps</li>
<li>stateless</li>
<li>framework-agnostic</li>
<li>TypeScript</li>
<li>MIT licence</li>
</ul>

# Keyboard navigation that behaves itself.

Lists, grids and trees, custom key bindings, roving tabindex, typeahead and
focus shortcuts on any page. Data attributes — or a plain options object, for
markup you don't own — and one keydown call. No wrappers, no framework
opinions.

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

## Or skip the attributes entirely

Every attribute has an option of the same name, so a group whose HTML is not
yours to change — a component library's menu, a CMS's output — is described in
JavaScript instead. The menu below is navigated that way: open its HTML tab and
there is not a keyrove attribute in it.

<div data-demo="menu"></div>

```ts
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const config = { items: '[role="menuitem"]', loop: true, rovingTabindex: true };
const typeahead = createTypeahead(config);

document
  .querySelector('#share')
  .addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
```

Each setting falls back to its attribute on its own, so the two mix freely. See
[attributes and options](/docs/attributes-and-options) for both, or
[options in JavaScript](/docs/examples/javascript-options) for this menu in
full.

<div class="feature-grid">
<div class="feature">

### <span aria-hidden="true">🧩</span> No framework, no adapter

`keyRove` takes anything shaped like a keydown event, so the same call works
with a native listener or a React, Vue, or Svelte synthetic event. The package
ships no dependencies.

</div>
<div class="feature">

### <span aria-hidden="true">🫧</span> Nothing to mount or dispose

`keyRove` is a plain function of one keydown event: no instances, no
subscriptions, no cleanup, nothing to keep in sync with the DOM. It reads the
group on every press, so a list that re-renders needs no re-initialising.

</div>
<div class="feature">

### <span aria-hidden="true">⌨️</span> Any key, not just arrows

`data-keyrove-next-key` and `data-keyrove-prev-key` take any
`KeyboardEvent.code`, alone or in a combo like `mod+KeyJ`.
`data-keyrove-orientation="horizontal"` gives a list Left/Right defaults that
flip under RTL.

</div>
<div class="feature">

### <span aria-hidden="true">↕️</span> Lists, grids and trees

<kbd class="kbd">Home</kbd> / <kbd class="kbd">End</kbd> and
<kbd class="kbd">PageUp</kbd> / <kbd class="kbd">PageDown</kbd> come with the
list. Declare `data-keyrove-cols` and Up/Down move a whole row while
Left/Right move a cell; add `data-keyrove-loop` and a list wraps at its ends.
Skip the rows of a closed folder and the same list walks a tree.

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

### <span aria-hidden="true">🧾</span> Markup you don't own

Every attribute has an option of the same name, so a group can be described in
JavaScript instead: `keyRove(e, { items: '[role="menuitem"]', loop: true })`
navigates a component library's menu that carries no keyrove attributes at all.

</div>
<div class="feature">

### <span aria-hidden="true">🔎</span> Jump and type-to-focus

`data-keyrove-focus-key` gives an item, or a panel, a shortcut that focuses it
from anywhere under the listener. `createTypeahead()` adds case-insensitive
typeahead, matching an item by `data-keyrove-typeahead` or by its own text.

</div>
</div>

Read the [introduction](/docs/introduction) for how it fits together, see
[custom keys](/docs/examples/custom-keys) for rebinding at work or
[options in JavaScript](/docs/examples/javascript-options) for a group
described without markup, or jump straight to the
[API reference](/docs/api) for the rules.
