---
# Live page: https://keyrove.pages.dev/
title: keyrove
description: Keyboard navigation for lists, grids and trees. Configure it with data attributes or JavaScript options, in any framework.
titleTag: keyrove — Keyboard navigation for lists, grids and trees
layout: landing
---

<div class="hero">
<div class="hero-copy">

# Keyboard navigation that behaves itself.

Mark the items and pass `keydown` to `keyRove`. Lists, grids and trees then
move focus the way keyboard users expect, in any framework.

<div class="hero-actions">

[Get started](/docs/introduction) [Examples](/docs/examples/basic)
<span class="hero-install"><code>npm i @mixedrays/keyrove</code><button type="button" data-copy-command="npm i @mixedrays/keyrove" aria-label="Copy install command"><span data-icon="copy" class="size-3.5 icon-idle"></span><span data-icon="check" class="size-3.5 icon-done"></span></button></span>

</div>

<ul class="hero-facts">
<li><span data-icon="check" class="size-4"></span>~5 kB gzipped</li>
<li><span data-icon="check" class="size-4"></span>zero deps</li>
<li><span data-icon="check" class="size-4"></span>any framework</li>
</ul>

</div>
<div class="hero-demo">
<div class="demo-panel">
<div class="demo-panel-header">
<span class="demo-panel-label"><span class="demo-live-indicator" aria-hidden="true"></span>Live · mail folders</span>
<output class="demo-readout" data-hero-readout data-state="blurred"><span aria-hidden="true">click to focus</span></output>
</div>
<ul id="menu" class="hero-folders" aria-label="Mail folders" data-hero-list>
<li data-keyrove-item tabindex="0" data-count="42"><span data-icon="inbox" class="hero-folder-icon"></span>Inbox</li>
<li data-keyrove-item tabindex="0" data-count="2"><span data-icon="drafts" class="hero-folder-icon"></span>Drafts</li>
<li data-keyrove-item tabindex="0"><span data-icon="sent" class="hero-folder-icon"></span>Sent</li>
<li data-keyrove-item tabindex="0" data-count="9999+"><span data-icon="spam" class="hero-folder-icon"></span>Spam</li>
<li data-keyrove-item tabindex="0"><span data-icon="trash" class="hero-folder-icon"></span>Trash</li>
</ul>

```html copy
<ul id="menu">
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
  <!-- ... -->
  <li data-keyrove-item tabindex="0">Trash</li>
</ul>
```

```ts selected
import { keyRove } from '@mixedrays/keyrove';

// whole setup
const menu = document.querySelector('#menu');
menu.addEventListener('keydown', (e) => keyRove(e));
```

</div>
<p class="demo-hint"><kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> move, <kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> jump. <kbd class="kbd">Tab</kbd> still visits each folder.</p>
</div>
</div>

<section class="landing-section" aria-labelledby="use-it-in-your-framework">
<div class="landing-section-copy">
<p class="landing-step">01 / Your stack</p>

## Use it in your framework

The same items, the same handler. `keyRove` accepts native keyboard events
and compatible framework events, including React's synthetic events.
There is no adapter or wrapper component to install.

Start with ordinary attributes. When you want type-checked settings,
[attribute builders](/docs/api#attribute-builders) fit the same templates.

[Framework setup](/docs/installation)

</div>
<div class="landing-section-demo">

<div class="demo-panel demo-panel--code">

```ts title="Vanilla" copy
import { keyRove } from '@mixedrays/keyrove';

const menu = document.querySelector('#menu');
menu.addEventListener('keydown', (e) => keyRove(e));
```

```tsx title="React"
import { keyRove } from '@mixedrays/keyrove';

export const Menu = () => (
  <ul onKeyDown={keyRove}>
    <li data-keyrove-item tabIndex={0}>
      Inbox
    </li>
    <li data-keyrove-item tabIndex={0}>
      Drafts
    </li>
    <li data-keyrove-item tabIndex={0}>
      Sent
    </li>
  </ul>
);
```

```vue title="Vue"
<script setup>
import { keyRove } from '@mixedrays/keyrove';
</script>

<template>
  <ul @keydown="keyRove">
    <li data-keyrove-item tabindex="0">Inbox</li>
    <li data-keyrove-item tabindex="0">Drafts</li>
    <li data-keyrove-item tabindex="0">Sent</li>
  </ul>
</template>
```

```svelte title="Svelte"
<script>
  import { keyRove } from '@mixedrays/keyrove';
</script>

<ul onkeydown={keyRove}>
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
  <li data-keyrove-item tabindex="0">Sent</li>
</ul>
```

</div>

</div>
</section>

<section class="landing-section" aria-labelledby="add-only-the-behavior-you-need">
<div class="landing-section-copy">
<p class="landing-step">02 / Your settings</p>

## Add only the behavior you need

Keep the handler. Change a setting in the markup.

**Looping** wraps from the last item to the first. **Horizontal** changes
the default arrows. **One tab stop** lets Tab enter and leave the group while
the arrows move within it.

Each example adds just one behavior to the list you already know.

</div>
<div class="landing-section-demo">

<div class="pattern-tabs" data-code-tabs>
<div class="pattern-tabs-bar" role="tablist" aria-label="List behavior" data-keyrove-orientation="horizontal">
<button type="button" role="tab" class="pattern-tab" id="behavior-tab-0" aria-controls="behavior-panel-0" aria-selected="true" tabindex="0" data-keyrove-item>Looping</button>
<button type="button" role="tab" class="pattern-tab" id="behavior-tab-1" aria-controls="behavior-panel-1" aria-selected="false" tabindex="-1" data-keyrove-item>Horizontal</button>
<button type="button" role="tab" class="pattern-tab" id="behavior-tab-2" aria-controls="behavior-panel-2" aria-selected="false" tabindex="-1" data-keyrove-item>One tab stop</button>
</div>
<div class="pattern-panel" role="tabpanel" id="behavior-panel-0" aria-labelledby="behavior-tab-0">

<div data-demo="landing-loop" data-demo-label="looping folders"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const folders = document.querySelector('#folders-loop');
folders.addEventListener('keydown', (e) => keyRove(e));
```

Press <kbd class="kbd">↓</kbd> on Sent to return to Inbox.

[Looping lists](/docs/examples/looping-lists)

</div>
<div class="pattern-panel" role="tabpanel" id="behavior-panel-1" aria-labelledby="behavior-tab-1" hidden>

<div data-demo="landing-horizontal" data-demo-label="horizontal folders"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const folders = document.querySelector('#folders-horizontal');
folders.addEventListener('keydown', (e) => keyRove(e));
```

Use <kbd class="kbd">←</kbd> and <kbd class="kbd">→</kbd> to move between folders.

[Horizontal lists](/docs/examples/horizontal-lists)

</div>
<div class="pattern-panel" role="tabpanel" id="behavior-panel-2" aria-labelledby="behavior-tab-2" hidden>

<div data-demo="landing-roving" data-demo-label="one tab stop"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const folders = document.querySelector('#folders-roving');
folders.addEventListener('keydown', (e) => keyRove(e));
```

Move with the arrows, then press <kbd class="kbd">Tab</kbd> to leave the group.

[Roving tabindex](/docs/examples/roving-tabindex)

</div>
</div>

</div>
</section>

<section class="landing-section" aria-labelledby="configure-it-where-it-fits">
<div class="landing-section-copy">
<p class="landing-step">03 / Your markup</p>

## Configure it where it fits

Write attributes when you own the markup. Use an item selector when the HTML
comes from a component library or CMS. These two setups navigate identically.

You can mix both: `keyRove(e, { loop: true })` overrides looping while still
reading the items and other settings from their attributes.

[Attributes and options](/docs/attributes-and-options)

</div>
<div class="landing-section-demo">

<div class="demo-panel demo-panel--code">

```html title="Attributes" copy
<ul id="folders">
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
  <li data-keyrove-item tabindex="0">Sent</li>
</ul>
<script type="module">
  import { keyRove } from '@mixedrays/keyrove';

  const folders = document.querySelector('#folders');
  folders.addEventListener('keydown', (e) => keyRove(e));
</script>
```

```html title="Options"
<ul id="folders">
  <li tabindex="0">Inbox</li>
  <li tabindex="0">Drafts</li>
  <li tabindex="0">Sent</li>
</ul>
<script type="module">
  import { keyRove } from '@mixedrays/keyrove';

  const folders = document.querySelector('#folders');
  folders.addEventListener('keydown', (e) => keyRove(e, { items: 'li' }));
</script>
```

</div>

</div>
</section>

<section class="landing-section" aria-labelledby="move-through-a-grid">
<div class="landing-section-copy">
<p class="landing-step">04 / Your layout</p>

## Move through a grid

Give the group a column count and the same handler moves across cells and
between rows. Your CSS still controls the layout.

For a responsive CSS grid, set `data-keyrove-cols="auto"`. KeyRove reads the
current tracks on each keypress, so resizing needs no navigation instance
to update.

[Grid navigation](/docs/examples/grid)

</div>
<div class="landing-section-demo">

<div class="pattern-tabs" data-code-tabs>
<div class="pattern-tabs-bar" role="tablist" aria-label="Grid layout" data-keyrove-orientation="horizontal">
<button type="button" role="tab" class="pattern-tab" id="layout-tab-0" aria-controls="layout-panel-0" aria-selected="true" tabindex="0" data-keyrove-item>Fixed columns</button>
<button type="button" role="tab" class="pattern-tab" id="layout-tab-1" aria-controls="layout-panel-1" aria-selected="false" tabindex="-1" data-keyrove-item>Responsive</button>
</div>
<div class="pattern-panel" role="tabpanel" id="layout-panel-0" aria-labelledby="layout-tab-0">

<div data-demo="landing-grid" data-demo-label="time slots"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const slots = document.querySelector('#slots');
slots.addEventListener('keydown', (e) => keyRove(e));
```

Use all four arrows. <kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> jump to the ends of a row.

</div>
<div class="pattern-panel" role="tabpanel" id="layout-panel-1" aria-labelledby="layout-tab-1" hidden>

<div data-demo="responsive" data-demo-label="responsive months"></div>

```ts selected
import { keyRove } from '@mixedrays/keyrove';

const months = document.querySelector('#months');
months.addEventListener('keydown', (e) => keyRove(e));
```

Drag the preview’s lower-right corner to resize it, then try the arrows.

[Responsive grid](/docs/examples/responsive-grid)

</div>
</div>

</div>
</section>

<section class="landing-section" aria-labelledby="combine-behaviors">
<div class="landing-section-copy">
<p class="landing-step">05 / Your interaction</p>

## Combine behaviors

Now put the pieces together: a menu configured with an item selector,
looping, and one tab stop.

Add `createTypeahead` when people should also be able to find an item by
its label. Both handlers share the same group settings; `||` passes a key
to typeahead only when navigation leaves it unhandled.

[JavaScript options](/docs/examples/javascript-options) ·
[Typeahead](/docs/examples/typeahead)

</div>
<div class="landing-section-demo">

<div data-demo="menu" data-demo-label="share menu"></div>

```ts selected
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const config = {
  items: '[role="menuitem"]',
  loop: true,
  rovingTabindex: true,
};
const typeahead = createTypeahead(config);
const menu = document.querySelector('#share');

menu.addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
```

<p class="demo-hint">Type <kbd class="kbd">E</kbd> to focus Email a copy. Arrows skip the disabled item and wrap at the ends.</p>

</div>
</section>

<section class="landing-section" aria-labelledby="build-more-involved-interfaces">
<div class="landing-section-copy">
<p class="landing-step">06 / Your application</p>

## Build more involved interfaces

Give an item a shortcut. Nest groups with their own keys. Or combine focus
navigation with your application's behavior.

The tree is the fullest example: KeyRove navigates visible rows and typeahead
finds them by name. Your code opens and closes folders, sets ARIA states,
and decides what activating a file does.

Start with the part you need; the same handler stays underneath.

</div>
<div class="landing-section-demo">

<div class="pattern-tabs" data-code-tabs>
<div class="pattern-tabs-bar" role="tablist" aria-label="Advanced examples" data-keyrove-orientation="horizontal">
<button type="button" role="tab" class="pattern-tab" id="advanced-tab-0" aria-controls="advanced-panel-0" aria-selected="true" tabindex="0" data-keyrove-item>Shortcuts</button>
<button type="button" role="tab" class="pattern-tab" id="advanced-tab-1" aria-controls="advanced-panel-1" aria-selected="false" tabindex="-1" data-keyrove-item>Nested groups</button>
<button type="button" role="tab" class="pattern-tab" id="advanced-tab-2" aria-controls="advanced-panel-2" aria-selected="false" tabindex="-1" data-keyrove-item>Tree</button>
</div>
<div class="pattern-panel" role="tabpanel" id="advanced-panel-0" aria-labelledby="advanced-tab-0">

<div data-demo="tools" data-demo-label="drawing tools"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const tools = document.querySelector('#tools');
tools.addEventListener('keydown', (e) => keyRove(e));
```

Press <kbd class="kbd">P</kbd> for Pen, then <kbd class="kbd">↓</kbd> to continue.

[Focus keys](/docs/examples/focus-keys)

</div>
<div class="pattern-panel" role="tabpanel" id="advanced-panel-1" aria-labelledby="advanced-tab-1" hidden>

<div data-demo="nested" data-demo-label="message actions"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const actions = document.querySelector('#message-actions');
// One listener also serves the nested reaction row.
actions.addEventListener('keydown', (e) => keyRove(e));
```

Use <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd> in the menu. Focus a reaction to try <kbd class="kbd">←</kbd>/<kbd class="kbd">→</kbd>; <kbd class="kbd">Esc</kbd> leaves its group.

[Nested roots](/docs/examples/nested-roots)

</div>
<div class="pattern-panel" role="tabpanel" id="advanced-panel-2" aria-labelledby="advanced-tab-2" hidden>

<div data-demo="tree" data-demo-label="project files"></div>

```ts selected
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const tree = document.querySelector('#files');
const config = {
  items: '[role="treeitem"]',
  skip: '[hidden] [role="treeitem"]',
  rovingTabindex: true,
};
const typeahead = createTypeahead(config);

// branch is your application's expand/collapse handler.
// The full tree example includes its implementation.
tree.addEventListener(
  'keydown',
  (e) => keyRove(e, config) || typeahead(e) || branch(e),
);
```

Use <kbd class="kbd">→</kbd> to open a folder and <kbd class="kbd">←</kbd> to close it. Type a file name to jump.

[Full tree implementation](/docs/examples/tree-view#a-full-tree-view)

</div>
</div>

</div>
</section>

## What it leaves to you

keyrove moves focus and nothing else, so it fits whatever widget you are
building.

<div class="split">
<div class="split-col" data-split="keyrove">

### keyrove does

- Finds the next item and focuses it
- Prevents the browser's default only for keys it handles
- Moves the tab stop with focus when roving tabindex is on

</div>
<div class="split-col" data-split="you">

### You do

- Roles, labels and ARIA states
- Selection, and what <kbd class="kbd">Enter</kbd> and <kbd class="kbd">Space</kbd> do
- Focusable items and the first tab stop

</div>
</div>

The [listbox example](/docs/examples/listbox) puts all three together.

<div class="closing">

## Start with a list

Install the package, mark the items, and pass `keydown` to `keyRove`.

<div class="hero-actions">

[Get started](/docs/introduction)
<span class="hero-install"><code>npm i @mixedrays/keyrove</code><button type="button" data-copy-command="npm i @mixedrays/keyrove" aria-label="Copy install command"><span data-icon="copy" class="size-3.5 icon-idle"></span><span data-icon="check" class="size-3.5 icon-done"></span></button></span>

</div>

<div class="next-steps">
<div class="next-step">
<span data-icon="book" class="next-step-icon"></span>

### [Installation](/docs/installation)

Setup for vanilla JavaScript, React, Vue and Svelte.

</div>
<div class="next-step">
<span data-icon="grid" class="next-step-icon"></span>

### [Examples](/docs/examples/basic)

Live demos, from a basic list to a tree view.

</div>
<div class="next-step">
<span data-icon="braces" class="next-step-icon"></span>

### [API reference](/docs/api)

Every handler, option, key binding and type.

</div>
<div class="next-step">
<span data-icon="sparkles" class="next-step-icon"></span>

### [AI prompts](/docs/ai-prompts)

Point a coding assistant at these docs.

</div>
</div>
</div>
