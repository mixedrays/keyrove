---
title: Options in JavaScript
description: Configure a menu with JavaScript options using its existing roles and markup.
titleTag: Configuring keyboard navigation in JavaScript — keyrove
group: Examples
order: 22
---

Use options to navigate markup from a component library, CMS or other code
you cannot change. This menu has no `data-keyrove-*` attributes; its options
select items by their existing role.

<div data-demo="menu"></div>

```ts
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const config = {
  items: '[role="menuitem"]',
  loop: true,
  rovingTabindex: true,
};

const typeahead = createTypeahead(config);

document
  .querySelector('#share')
  .addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
```

Up/Down move between items and wrap at the ends. Typing finds an entry, and
Tab leaves the menu. The options configure navigation; the markup supplies
roles, an initial tab stop and the `disabled` attribute on _Export as PDF_.

## What is coming from where

Options override attributes one setting at a time. For example,
`keyRove(e, { loop: true })` enables looping while still finding items from
markup. See [attributes and options](/docs/attributes-and-options) for
replacement rules and the [API reference](/docs/api#options) for every field.

## One object, both handlers

Pass the same `items`, `root`, `skip` and `rovingTabindex` settings to both
handlers. In the demo, typing P reaches _Post to Slack_ through the same
selector the arrows use.

Typeahead ignores movement settings such as keys, columns and looping. Use its
[`label`](/docs/api#createtypeahead-options) option when an item's text is not
its search label. Create the handler once per listener.

## Items, by selector or by hand

`items` takes a selector, run inside the group's root on each keypress, or a
function returning the elements:

```ts
keyRove(e, { items: '[role="menuitem"]' });
keyRove(e, { items: (root) => [...root.querySelectorAll('.row')].reverse() });
```

Either way the elements are the group's sequence in the order given, and
`disabled` ones are left out — the same rule the attribute reading follows,
because it is applied to the items rather than to the reading that found them.
A `skip` test passes items over while keeping them in the sequence, which is
what a grid needs: a skipped cell holds its column.

```ts
keyRove(e, { items: '.cell', skip: '.cell-empty', cols: 4 });
```

## Where this belongs

Use options when you cannot edit the markup or need a computed setting:
`keyRove(e, { items: '.cell', cols: columnsNow() })` reads the column count on
each call. For CSS grids, `cols: 'auto'` or `data-keyrove-cols="auto"` reads it
from the layout; see [responsive grid](/docs/examples/responsive-grid).
