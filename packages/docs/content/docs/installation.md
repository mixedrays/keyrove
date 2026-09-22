---
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
bindings, Tab visits each item. For one tab stop per group, use
[roving tabindex](/docs/examples/roving-tabindex).

Lists use Up/Down by default. Set `data-keyrove-next-key` and
`data-keyrove-prev-key` on the root to [change the keys](/docs/examples/custom-keys).
Attribute names are also exported as [constants](/docs/api#constants).

Use options when you cannot add attributes to the markup. For example,
`keyRove(e, { items: '[role="menuitem"]' })` selects items by their role.
See [attributes and options](/docs/attributes-and-options) for the mapping
and fallback rules.

## React

```tsx
import { keyRove } from '@mixedrays/keyrove';

export const Menu = ({ items }) => (
  <ul onKeyDown={keyRove}>
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

```vue
<script setup lang="ts">
import { keyRove } from '@mixedrays/keyrove';
</script>

<template>
  <ul @keydown="keyRove">
    <li v-for="item in items" :key="item.id" data-keyrove-item tabindex="0">
      {{ item.label }}
    </li>
  </ul>
</template>
```

## Svelte

```svelte
<script lang="ts">
  import { keyRove } from '@mixedrays/keyrove';
</script>

<ul onkeydown={keyRove}>
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
