---
title: Options in JavaScript
description: Describe a group in an options object instead of in markup — the way to navigate components whose HTML you do not write.
titleTag: Configuring keyboard navigation in JavaScript — keyrove
group: Examples
order: 23
---

Every page so far describes a group in its markup. This one describes the same
kind of group in JavaScript, which is what you need when the markup is not
yours to change: a component library's menu, a CMS's output, a widget rendered
by something else. Nothing below carries a single `data-keyrove-*` attribute —
the group is named by the role its items already have.

<div data-demo="menu"></div>

```ts
import { createTypeahead, keyRove } from '@mixedrays/keyrove';

const menu = {
  items: '[role="menuitem"]',
  loop: true,
  rovingTabindex: true,
};

const typeahead = createTypeahead(menu);

document
  .querySelector('#share')
  .addEventListener('keydown', (e) => keyRove(e, menu) || typeahead(e));
```

<kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> move and wrap at the ends,
typing a letter jumps to an entry, <kbd class="kbd">Tab</kbd> leaves the menu
in one press, and _Export as PDF_ is out of the order because it is
`disabled` — none of which the markup says.

## Settings, and where they come from

Every setting has two places it can be named: the options object, and the
`data-keyrove-*` attribute it stands for. They are read one field at a time,
options first, so neither source has to answer for the other's fields:

```ts
// Everything from the markup, as every other page shows.
keyRove(e);

// Items from the markup, looping from here.
keyRove(e, { loop: true });

// Nothing from the markup at all.
keyRove(e, { items: '[role="menuitem"]', loop: true });
```

That is per _field_, not per call. In `keyRove(e, { keys: { next: 'KeyJ' } })`
the next move answers to <kbd class="kbd">J</kbd> while
<kbd class="kbd">Home</kbd>, <kbd class="kbd">End</kbd> and the page keys are
still whatever the root's attributes say — and their defaults where it says
nothing. The full list of settings is in the
[API reference](/docs/api#options).

## One object, both handlers

`createTypeahead` takes the settings that bear on finding an item — `items`,
`root`, `skip` and `rovingTabindex` — under the same names, so the object
above configures both handlers and they cannot disagree about what an item is:

```ts
const typeahead = createTypeahead(menu);

el.addEventListener('keydown', (e) => keyRove(e, menu) || typeahead(e));
```

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

## Which to reach for

Neither source is the advanced one. They answer different questions:

- **Markup**, where you write the HTML. The group is described where it is
  built, a list becomes a grid by gaining an attribute, and nothing in your
  JavaScript changes when the layout does. This is what the rest of the
  examples show.
- **JavaScript**, where you do not write the HTML, or where the settings are
  computed — a column count that comes from a media query, a `skip` test that
  is a function of your own state. `keyRove` is called fresh for every
  keypress, so an object built at the call site is as live as an attribute is:

  ```ts
  el.addEventListener('keydown', (e) =>
    keyRove(e, { items: '.cell', cols: columnsNow() }),
  );
  ```

For markup you _do_ own, the attributes usually read better —
[responsive grid](/docs/examples/responsive-grid) computes a column count
without an options object at all, by writing the attribute the layout implies.
