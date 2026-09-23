---
# Live page: https://keyrove.pages.dev/docs/installation
title: Installation
description: Install keyrove and connect a keyboard handler in vanilla JavaScript, React, Vue or Svelte.
titleTag: Installation for React, Vue and Svelte — keyrove
group: Guide
order: 2
---

## Install

```sh title="pnpm"
pnpm add @mixedrays/keyrove
```

```sh title="npm"
npm install @mixedrays/keyrove
```

```sh title="yarn"
yarn add @mixedrays/keyrove
```

The package is ESM-only, ships its own types, and has no runtime dependencies.

## Vanilla

Attach one listener to the container. The container is the navigation root, so
the item query is scoped to it automatically.

```ts
import { keyRove } from '@mixedrays/keyrove';

const list = document.querySelector('#menu');
list.addEventListener('keydown', (e) => keyRove(e));
```

```html
<ul id="menu">
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
  <li data-keyrove-item tabindex="0">Sent</li>
</ul>
```

Give non-native items `tabindex="0"` so they can receive focus. With the default
bindings, <kbd class="kbd">Tab</kbd> visits each item. For one tab stop per group, use
[roving tabindex](/docs/examples/roving-tabindex); the
[complete roving setup](#complete-roving-setup) below puts every piece together.

Lists use <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd> by default. Set `data-keyrove-next-key` and
`data-keyrove-prev-key` on the root to [change the keys](/docs/examples/custom-keys).
Attribute names are also exported as [constants](/docs/api#constants).

Use options when you cannot add attributes to the markup. For example,
`keyRove(e, { items: '[role="menuitem"]' })` selects items by their role.
See [attributes and options](/docs/attributes-and-options) for the mapping
and fallback rules.

## React

Use [`rootAttributes` and `itemAttributes`](/docs/api#attribute-builders) for
typed settings in markup. They include the root and item markers, and turn
booleans into `"true"` or `"false"`. Hand-written attributes work too.

```tsx title="Typed builders"
import { itemAttributes, keyRove, rootAttributes } from '@mixedrays/keyrove';

export const Menu = ({ items, loop = false }) => (
  <ul {...rootAttributes({ loop })} onKeyDown={keyRove}>
    {items.map((item) => (
      <li key={item.id} {...itemAttributes()} tabIndex={0}>
        {item.label}
      </li>
    ))}
  </ul>
);
```

```tsx title="Hand-written attributes"
import { keyRove } from '@mixedrays/keyrove';

export const Menu = ({ items, loop = false }) => (
  <ul
    data-keyrove-root
    data-keyrove-loop={loop ? 'true' : 'false'}
    onKeyDown={keyRove}
  >
    {items.map((item) => (
      <li key={item.id} data-keyrove-item tabIndex={0}>
        {item.label}
      </li>
    ))}
  </ul>
);
```

React's `SyntheticEvent` satisfies the shape `keyRove` needs, so it can be
passed as the handler directly.

## Vue

```vue title="Typed builders"
<script setup lang="ts">
import { itemAttributes, keyRove, rootAttributes } from '@mixedrays/keyrove';

defineProps<{ items: { id: string; label: string }[]; loop?: boolean }>();
</script>

<template>
  <ul v-bind="rootAttributes({ loop })" @keydown="keyRove">
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

```vue title="Hand-written attributes"
<script setup lang="ts">
import { keyRove } from '@mixedrays/keyrove';

defineProps<{ items: { id: string; label: string }[]; loop?: boolean }>();
</script>

<template>
  <ul
    data-keyrove-root
    :data-keyrove-loop="loop ? 'true' : 'false'"
    @keydown="keyRove"
  >
    <li v-for="item in items" :key="item.id" data-keyrove-item tabindex="0">
      {{ item.label }}
    </li>
  </ul>
</template>
```

## Svelte

```svelte title="Typed builders"
<script lang="ts">
  import { itemAttributes, keyRove, rootAttributes } from '@mixedrays/keyrove';

  let { items, loop = false }: {
    items: { id: string; label: string }[];
    loop?: boolean;
  } = $props();
</script>

<ul {...rootAttributes({ loop })} onkeydown={keyRove}>
  {#each items as item (item.id)}
    <li {...itemAttributes()} tabindex="0">{item.label}</li>
  {/each}
</ul>
```

```svelte title="Hand-written attributes"
<script lang="ts">
  import { keyRove } from '@mixedrays/keyrove';

  let { items, loop = false }: {
    items: { id: string; label: string }[];
    loop?: boolean;
  } = $props();
</script>

<ul
  data-keyrove-root
  data-keyrove-loop={loop ? 'true' : 'false'}
  onkeydown={keyRove}
>
  {#each items as item (item.id)}
    <li data-keyrove-item tabindex="0">{item.label}</li>
  {/each}
</ul>
```

## Several groups, one listener

Mark each group with `data-keyrove-root` to use one listener on a shared
panel or `document`. Each event uses the nearest root at or above its target,
falling back to the listener's element when no root is marked. Sibling roots
keep their items and settings separate.

```html
<div id="panel">
  <ul data-keyrove-root>
    <li data-keyrove-item tabindex="0">Inbox</li>
    <li data-keyrove-item tabindex="0">Drafts</li>
  </ul>

  <!-- A label picker in the same panel: its own root, its own columns. -->
  <ul data-keyrove-root data-keyrove-cols="4">
    <li data-keyrove-item tabindex="0">Work</li>
    <li data-keyrove-item tabindex="0">Travel</li>
  </ul>
</div>
```

```ts
document.querySelector('#panel').addEventListener('keydown', (e) => keyRove(e));
```

Roots can also nest. Each inner group uses its own keys and settings; see
[nested roots](/docs/examples/nested-roots).

## Complete roving setup

A group with one tab stop combines four pieces: navigation, an initial tab
stop, focus tracking and, optionally, typeahead. This recipe wires them to one
configuration object:

```html
<div id="choices">
  <button>Inbox</button>
  <button>Drafts</button>
  <button>Sent</button>
</div>
```

```ts
import {
  createTypeahead,
  followFocus,
  initRovingTabindex,
  keyRove,
} from '@mixedrays/keyrove';

const list = document.querySelector<HTMLElement>('#choices')!;
const config = { items: 'button', rovingTabindex: true };

// Created once, so its buffer lasts between keypresses.
const typeahead = createTypeahead(config);

initRovingTabindex(list, config);

list.addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
list.addEventListener('focusin', (e) => followFocus(e, config));
```

- `initRovingTabindex` gives the first button `tabindex="0"` and the others
  `-1`, so <kbd class="kbd">Tab</kbd> enters the group once.
- `keyRove` moves focus with the arrows, <kbd class="kbd">Home</kbd>,
  <kbd class="kbd">End</kbd> and the page keys, and carries the tab stop with
  each move.
- `followFocus` moves the tab stop when focus arrives another way: a click,
  `element.focus()`, or <kbd class="kbd">Tab</kbd> onto a control inside an
  item.
- `typeahead` focuses the first button whose label starts with the typed text.
  Without typeahead, remove `createTypeahead` from the import, the `typeahead`
  line and `|| typeahead(e)`.

Every helper receives the same `config`, so they agree on which elements are
items and that the group has one tab stop.

### After rendering

Call `initRovingTabindex(list, config)` again after a render that may add,
remove or replace items. It keeps a stop that is still valid and repairs a
missing one. The listeners stay attached to `list`, so add them once, outside
the render. In a framework, make the call from the hook that runs after each
render.

### Choosing the first stop

Pass `initial` when your code knows which item should start with the stop,
such as the one your app shows as selected:

```ts
initRovingTabindex(list, {
  ...config,
  initial: list.querySelector('.selected'),
});
```

`initial` overrides the current stop. Use it on first setup or when your app
changes the selection, and leave it out of the post-render call; otherwise
every render sends the stop back and the user loses their place.

This recipe covers focus movement only. Roles, labels and selection belong to
the widget; the [listbox](/docs/examples/listbox) adds them to these pieces.
