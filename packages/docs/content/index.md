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
<div class="hero-panel">
<div class="hero-panel-head">
<span class="hero-panel-label"><span class="hero-demo-dot" aria-hidden="true"></span>Live · mail folders</span>
<output class="hero-readout" data-hero-readout data-state="blurred"><span aria-hidden="true">click to focus</span></output>
</div>
<ul id="menu" class="hero-folders" aria-label="Mail folders" data-hero-list>
<li data-keyrove-item tabindex="0" data-count="12"><span data-icon="inbox" class="hero-folder-icon"></span>Inbox</li>
<li data-keyrove-item tabindex="0" data-count="2"><span data-icon="drafts" class="hero-folder-icon"></span>Drafts</li>
<li data-keyrove-item tabindex="0"><span data-icon="sent" class="hero-folder-icon"></span>Sent</li>
<li data-keyrove-item tabindex="0" data-count="999+"><span data-icon="spam" class="hero-folder-icon"></span>Spam</li>
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
<p class="hero-demo-hint"><kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> move, <kbd class="kbd">Home</kbd> and <kbd class="kbd">End</kbd> jump. <kbd class="kbd">Tab</kbd> still visits each folder.</p>
</div>
</div>

## Attributes or options

The list above marks its items with `data-keyrove-item`. When you cannot change
the markup, such as a component library's menu or CMS content, describe the
group in JavaScript instead. This menu has no keyrove attributes: its options
turn on looping and roving tabindex, and typeahead runs as a second handler, so
typing a letter jumps to the matching item.

<div data-demo="menu"></div>

```ts selected
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const config = { items: '[role="menuitem"]', loop: true, rovingTabindex: true };
const typeahead = createTypeahead(config);

const menu = document.querySelector<HTMLElement>('#share')!;
menu.addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
```

Options override attributes one setting at a time, so you can mix both. See
[attributes and options](/docs/attributes-and-options) or the full
[JavaScript options example](/docs/examples/javascript-options).

## Grids, trees and toolbars

The same handler covers every shape. Pick one and try its keys.

<div class="pattern-tabs" data-code-tabs>
<div class="pattern-tabs-bar" role="tablist" aria-label="Layouts" data-keyrove-orientation="horizontal">
<button type="button" role="tab" class="pattern-tab" id="pattern-tab-grid" aria-controls="pattern-grid" aria-selected="true" tabindex="0" data-keyrove-item>Grid</button>
<button type="button" role="tab" class="pattern-tab" id="pattern-tab-tree" aria-controls="pattern-tree" aria-selected="false" tabindex="-1" data-keyrove-item>Tree</button>
<button type="button" role="tab" class="pattern-tab" id="pattern-tab-toolbar" aria-controls="pattern-toolbar" aria-selected="false" tabindex="-1" data-keyrove-item>Toolbar</button>
</div>
<div class="pattern-panel" role="tabpanel" id="pattern-grid" aria-labelledby="pattern-tab-grid">

Set `data-keyrove-cols` and the arrows move by cell and by row.
<kbd class="kbd">Home</kbd>/<kbd class="kbd">End</kbd> jump to the ends of a
row, and <kbd class="kbd">PageUp</kbd>/<kbd class="kbd">PageDown</kbd> move two
rows at a time here.

<div data-demo="grid" data-demo-class="grid grid-cols-6 gap-1.5"></div>

```ts
document
  .querySelector('#time-slots')
  .addEventListener('keydown', (e) => keyRove(e));
```

[Grid example](/docs/examples/grid)

</div>
<div class="pattern-panel" role="tabpanel" id="pattern-tree" aria-labelledby="pattern-tab-tree" hidden>

This tree is described in JavaScript. `skip` passes over rows inside closed
folders, and your own handler opens and closes them with
<kbd class="kbd">→</kbd> and <kbd class="kbd">←</kbd>. Type a file name to jump
to it.

<div data-demo="tree"></div>

```ts selected
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const tree = document.querySelector('#files');
const config = {
  items: '[role="treeitem"]',
  skip: '[hidden] [role="treeitem"]',
  rovingTabindex: true,
};
const typeahead = createTypeahead(config);

// `branch` opens and closes folders. It is your code, not keyrove's;
// the tree view example writes it out in full.
tree.addEventListener('keydown', (e) => {
  keyRove(e, config) || typeahead(e) || branch(e);
});
```

[Tree view example](/docs/examples/tree-view)

</div>
<div class="pattern-panel" role="tabpanel" id="pattern-toolbar" aria-labelledby="pattern-tab-toolbar" hidden>

Give an item a focus key and it becomes a shortcut as well as a stop. With
focus in the palette, press <kbd class="kbd">P</kbd> for the pen, then
<kbd class="kbd">↓</kbd> to step on from there. The palette keeps one tab stop,
wherever you left it.

<div data-demo="tools"></div>

```ts
document.querySelector('#tools').addEventListener('keydown', (e) => keyRove(e));
```

[Focus keys example](/docs/examples/focus-keys)

</div>
</div>

## Works with your framework

`keyRove` takes native keyboard events and framework events of the same shape,
React's synthetic events included, so there is no adapter to install. The
attribute builders type your settings; hand-written attributes work too.

```ts title="Vanilla" copy
import { keyRove } from '@mixedrays/keyrove';

const menu = document.querySelector('#menu');
menu.addEventListener('keydown', (e) => keyRove(e));
```

```tsx title="React"
import { itemAttributes, keyRove, rootAttributes } from '@mixedrays/keyrove';

export const Menu = ({ items }) => (
  <ul {...rootAttributes()} onKeyDown={keyRove}>
    {items.map((item) => (
      <li key={item.id} {...itemAttributes()} tabIndex={0}>
        {item.label}
      </li>
    ))}
  </ul>
);
```

```vue title="Vue"
<script setup lang="ts">
import { itemAttributes, keyRove, rootAttributes } from '@mixedrays/keyrove';

defineProps<{ items: { id: string; label: string }[] }>();
</script>

<template>
  <ul v-bind="rootAttributes()" @keydown="keyRove">
    <li
      v-for="item in items"
      :key="item.id"
      v-bind="itemAttributes()"
      tabindex="0"
    >
      {{ item.label }}
    </li>
  </ul>
</template>
```

```svelte title="Svelte"
<script lang="ts">
  import { itemAttributes, keyRove, rootAttributes } from '@mixedrays/keyrove';

  let { items }: { items: { id: string; label: string }[] } = $props();
</script>

<ul {...rootAttributes()} onkeydown={keyRove}>
  {#each items as item (item.id)}
    <li {...itemAttributes()} tabindex="0">{item.label}</li>
  {/each}
</ul>
```

[Installation](/docs/installation) covers each setup in full.

## What else it handles

<div class="feature-grid">
<div class="feature">
<span data-icon="refresh" class="feature-icon"></span>

### [Nothing to mount or dispose](/docs/introduction#how-it-works)

`keyRove` reads the DOM on every keypress, so there is no instance to update
when items change.

</div>
<div class="feature">
<span data-icon="command" class="feature-icon"></span>

### [Any key, not just arrows](/docs/examples/custom-keys)

Bind moves to any `KeyboardEvent.code` or combo, such as `mod+KeyJ`, group by
group.

</div>
<div class="feature">
<span data-icon="tab" class="feature-icon"></span>

### [Tab is left alone](/docs/introduction#tab-still-works)

<kbd class="kbd">Tab</kbd>, <kbd class="kbd">Enter</kbd> and
<kbd class="kbd">Space</kbd> keep their defaults. Roving tabindex gives a group
one tab stop when you want it.

</div>
<div class="feature">
<span data-icon="skip" class="feature-icon"></span>

### [Not everything is a stop](/docs/examples/skipped-items)

Skip headings, separators and disabled items without taking them out of the
DOM.

</div>
<div class="feature">
<span data-icon="layers" class="feature-icon"></span>

### [Groups inside groups](/docs/examples/nested-roots)

Nested roots keep their own keys and settings, all under one listener.

</div>
<div class="feature">
<span data-icon="text-cursor" class="feature-icon"></span>

### [Jump and type to focus](/docs/examples/typeahead)

Focus keys jump straight to an item or panel, and typeahead finds an item by
its label.

</div>
</div>

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
