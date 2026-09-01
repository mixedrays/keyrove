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

The `tabindex="0"` is yours to put there — keyrove moves focus but never makes
an element focusable. It is also what keeps these items reachable by
<kbd class="kbd">Tab</kbd>, which keyrove leaves alone; if you would rather the
group were a single tab stop, that is
[roving tabindex](/docs/examples/roving-tabindex).

By default the group answers to <kbd class="kbd">↑</kbd> and
<kbd class="kbd">↓</kbd>. Add `data-keyrove-next-key` / `data-keyrove-prev-key`
to the root for anything else — see [custom keys](/docs/examples/custom-keys).

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
falling back to the element the listener is attached to. Marking each group as a
root lets a single delegated listener — on a panel, or on `document` — serve any
number of independent groups without them seeing each other's items.

```html
<div id="panel">
  <ul data-keyrove-root>
    <li data-keyrove-item tabindex="0">Inbox</li>
    <li data-keyrove-item tabindex="0">Drafts</li>
  </ul>

  <ul data-keyrove-root data-keyrove-cols="4">
    <li data-keyrove-item tabindex="0">1</li>
    <li data-keyrove-item tabindex="0">2</li>
  </ul>
</div>
```

```ts
document.querySelector('#panel').addEventListener('keydown', (e) => keyRove(e));
```

Roots can also sit inside one another, which is how a group that is part of
another group's flow keeps its own keys and columns — see
[nested roots](/docs/examples/nested-roots).

## Attribute constants

Every attribute name is exported as a constant, so markup built in JavaScript
does not have to hardcode strings.

```ts
import { KEYROVE_ATTR_ITEM, KEYROVE_ATTR_SKIP } from '@mixedrays/keyrove';

const item = document.createElement('li');
item.setAttribute(KEYROVE_ATTR_ITEM, '');
item.tabIndex = 0;
```

The full list is in the [API reference](/docs/api#attributes).
