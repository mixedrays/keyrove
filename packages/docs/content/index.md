---
title: keyrove
description: Framework-agnostic arrow-key navigation for lists and grids, driven by data-* attributes.
layout: landing
---

<p class="hero-eyebrow">Framework-agnostic · Zero dependencies</p>

# Arrow-key navigation, driven by data attributes.

Mark your items with `data-keyrove-item`, pass keydown events to `keyRove`, and
lists and grids become keyboard navigable — arrows, Home/End, PageUp/PageDown,
and roving tabindex included.

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

### Configured in markup

Column count, page size, custom keys, and skipped items are all `data-*`
attributes — no per-instance config object to keep in sync with the DOM.

</div>
<div class="feature">

### Grid-aware

Declare `data-keyrove-cols-length` and Up/Down move a whole row while
Left/Right move a cell, with no wrapping at the edges.

</div>
</div>

## Three lines and a list is navigable

Give each navigable element `data-keyrove-item` and a tab stop, then hand the
container's keydown event to `keyRove`. Try it — click an item, then use the
arrow keys.

<div data-demo="inbox"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

document.querySelector('#menu').addEventListener('keydown', (e) => {
  keyRove(e);
});
```

Read the [introduction](/docs/introduction) for how it fits together, or jump
straight to the [API reference](/docs/api).
