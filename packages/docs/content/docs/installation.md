---
title: Installation
description: Installing the package, wiring the first keydown handler in any framework, and what the markup has to carry.
group: Guide
order: 2
---

## Install

```sh
pnpm add @mixedrays/keyrove
```

```sh
npm install @mixedrays/keyrove
```

```sh
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

You add the `tabindex="0"` yourself: keyrove moves focus but never makes an
element focusable. That `tabindex` is also what keeps the items reachable with
<kbd class="kbd">Tab</kbd>, which keyrove leaves alone. If you would rather the
whole group were a single tab stop, use
[roving tabindex](/docs/examples/roving-tabindex).

By default the group answers to <kbd class="kbd">↑</kbd> and
<kbd class="kbd">↓</kbd>. Add `data-keyrove-next-key` and
`data-keyrove-prev-key` to the root for anything else; see
[custom keys](/docs/examples/custom-keys). Every attribute name is also
exported as a [constant](/docs/api#constants), for markup built in JavaScript.

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

The navigation root is the nearest ancestor carrying `data-keyrove-root`,
falling back to the element the listener is attached to. Mark each group as a
root, and a single delegated listener, on a panel or on `document`, serves any
number of independent groups without them seeing each other's items.

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

Roots can also sit inside one another, which is how a group that is part of
another group's flow keeps its own keys and columns; see
[nested roots](/docs/examples/nested-roots).
