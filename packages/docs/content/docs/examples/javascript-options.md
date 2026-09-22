---
title: Options in JavaScript
description: Describe a group in an options object instead of in markup — the way to navigate components whose HTML you do not write.
titleTag: Configuring keyboard navigation in JavaScript — keyrove
group: Examples
order: 22
---

Every page so far describes a group in its markup. This one describes the same
kind of group in JavaScript, which is what you need when the markup is not
yours to change: a component library's menu, a CMS's output, a widget rendered
by something else. Nothing below carries a single `data-keyrove-*` attribute —
the group is named by the role its items already have.

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

<kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> move and wrap at the ends,
typing a letter jumps to an entry, <kbd class="kbd">Tab</kbd> leaves the menu
in one press, and _Export as PDF_ is out of the order because it is
`disabled` — none of which the markup says.

## What is coming from where

Nothing, in this one: every setting the menu has is in that object. The general
rule is that the two sources are read field by field, options first, so a
setting left out falls back to its attribute — `keyRove(e, { loop: true })`
loops a group whose items still come from the markup.
[Attributes and options](/docs/attributes-and-options) is the whole model, and
the [API reference](/docs/api#options) lists every field.

## One object, both handlers

`createTypeahead` takes the settings that bear on finding an item — `items`,
`root`, `skip` and `rovingTabindex` — under the same names, so the object above
configures both handlers and they cannot disagree about what an item is. Typing
_p_ in the demo reaches _Post to Slack_ through the same `items` selector the
arrows walk.

The settings that are about _moves_ — the keys, the columns, looping — are not
part of its options: a typeahead has one way to reach an item, its label. It
takes a [`label`](/docs/api#createtypeahead-options) of its own instead, for
where the text to match is not the item's own text.

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

Reach for options where the markup is not yours, or where a setting is computed
— `keyRove(e, { items: '.cell', cols: columnsNow() })` re-folds a grid between
keypresses, since the object is read fresh on every one. For markup you do own,
the attributes usually read better:
[responsive grid](/docs/examples/responsive-grid) tracks a column count without
an options object at all, with `data-keyrove-cols="auto"`.
[Attributes and options](/docs/attributes-and-options) weighs the two.
