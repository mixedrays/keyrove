---
# Live page: https://keyrove.pages.dev/
title: keyrove
description: Keyboard navigation for lists, grids and trees. Configure it with data attributes or JavaScript options, in any framework.
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

Add keyboard navigation to lists, grids and trees with data attributes or
JavaScript options. Custom keys, roving tabindex, typeahead and focus shortcuts
work with your existing HTML and framework.

<div class="hero-actions">

[Get started](/docs/introduction) [Demos](/docs/examples/basic)
<span class="hero-install"><code>npm i @mixedrays/keyrove</code><button type="button" data-copy-command="npm i @mixedrays/keyrove">copy</button></span>

</div>

## Three lines and a list is navigable

Add `data-keyrove-item` and `tabindex="0"` to each item, then pass the
container's `keydown` events to `keyRove`. Click an item or
<kbd class="kbd">Tab</kbd> to it, then use <kbd class="kbd">↑</kbd> and
<kbd class="kbd">↓</kbd> to move. <kbd class="kbd">Tab</kbd> still visits each item.

<div data-demo="inbox"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const menu = document.querySelector<HTMLElement>('#menu')!;
menu.addEventListener('keydown', (e) => keyRove(e));
```

## Or skip the attributes entirely

Use JavaScript options when you cannot change the markup, such as a component
library's menu or CMS content. This demo has no keyrove attributes; its options
enable looping and roving tabindex, with typeahead as a second handler.

<div data-demo="menu"></div>

```ts
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const config = { items: '[role="menuitem"]', loop: true, rovingTabindex: true };
const typeahead = createTypeahead(config);

const menu = document.querySelector<HTMLElement>('#share')!;
menu.addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
```

Options override attributes one setting at a time, so you can mix both. See
[attributes and options](/docs/attributes-and-options) or the full
[JavaScript options example](/docs/examples/javascript-options).

<div class="feature-grid">
<div class="feature">

### <span aria-hidden="true">🧩</span> No framework, no adapter

Use `keyRove` with native listeners, React, Vue or Svelte. No adapter or runtime
dependencies required.

</div>
<div class="feature">

### <span aria-hidden="true">🫧</span> Nothing to mount or dispose

`keyRove` reads the current DOM on every keypress. It has no instance or cached
item list to update when your content changes.

</div>
<div class="feature">

### <span aria-hidden="true">⌨️</span> Any key, not just arrows

Bind moves to any `KeyboardEvent.code` or combo, such as `mod+KeyJ`.
Horizontal lists use <kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd> arrows and follow the text direction.

</div>
<div class="feature">

### <span aria-hidden="true">↕️</span> Lists, grids and trees

Lists support arrows, <kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd>, page jumps and optional looping. Set a column
count for grid navigation. For trees, skip collapsed rows and add your own
expand/collapse handlers.

</div>
<div class="feature">

### <span aria-hidden="true">🎯</span> <kbd class="kbd">Tab</kbd> is left alone

keyrove moves DOM focus and prevents the browser's default action only for keys
it handles. <kbd class="kbd">Tab</kbd>, <kbd class="kbd">Enter</kbd> and <kbd class="kbd">Space</kbd> keep their defaults unless you bind them;
text fields keep their editing keys.

</div>
<div class="feature">

### <span aria-hidden="true">🧭</span> Roving tabindex, when you want it

[Roving tabindex](/docs/examples/roving-tabindex) gives a group one tab stop
that follows focus. <kbd class="kbd">Tab</kbd> enters and leaves the group; the bound keys move within it.

</div>
<div class="feature">

### <span aria-hidden="true">⏭️</span> Not everything is a stop

Use `data-keyrove-skip` or `disabled` to exclude headings, separators and
unavailable items from keyboard navigation without removing them from the DOM.

</div>
<div class="feature">

### <span aria-hidden="true">🪆</span> Groups inside groups

Mark groups with `data-keyrove-root` to share one listener. Nested groups use
the nearest root's settings.

</div>
<div class="feature">

### <span aria-hidden="true">🧾</span> Markup you don't own

Select existing items with an option such as `items: '[role="menuitem"]'`.
Configure navigation without adding keyrove attributes.

</div>
<div class="feature">

### <span aria-hidden="true">🔎</span> Jump and type-to-focus

Give an item or panel a shortcut with `data-keyrove-focus-key`.
`createTypeahead()` matches typed text against item labels, ignoring case.

</div>
</div>

Start with the [introduction](/docs/introduction), try
[custom keys](/docs/examples/custom-keys), or explore the
[API reference](/docs/api).
