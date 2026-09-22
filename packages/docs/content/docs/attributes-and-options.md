---
title: Attributes and options
description: The two places a group can be described — data attributes in the markup, or an options object at the call site — how they fall back to each other, and which to reach for.
titleTag: Two ways to configure keyboard navigation — keyrove
group: Guide
order: 3
---

A group's settings — what its items are, which keys move between them, how many
columns it has — can be written in two places: as `data-keyrove-*` attributes in
the markup, or as an options object passed to `keyRove`. The same settings, the
same names, either place.

Here is one group both ways. It is the same list, navigated identically:

```html title="Attributes"
<ul id="menu" data-keyrove-loop>
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
</ul>
```

```ts title="Options"
// <ul id="menu"><li tabindex="0">Inbox</li>…</ul>
menu.addEventListener('keydown', (e) =>
  keyRove(e, { items: 'li', loop: true }),
);
```

Neither is the advanced one, and neither came later in a way that makes the
other legacy. They answer different questions, and the one to reach for is
[whichever owns the markup](#which-to-reach-for).

## They fall back field by field

Both sources are read on every keypress, one setting at a time, options first.
A setting the options object does not name falls back to its attribute, and
then to its default — so neither source has to answer for the other's fields:

```ts
keyRove(e); // every setting from the markup
keyRove(e, { loop: true }); // items from the markup, looping from here
keyRove(e, { items: '[role="menuitem"]' }); // nothing from the markup
```

The fallback is per _field_, not per call, and it reaches inside `keys` too.
With `keyRove(e, { keys: { next: 'KeyJ' } })` the next move answers to
<kbd class="kbd">J</kbd>, while <kbd class="kbd">Home</kbd>,
<kbd class="kbd">End</kbd> and the page keys keep whatever the root's attributes
say — and their defaults where it says nothing. An empty `keys` value falls
through the same way; `'none'` is what switches a move off.

Two consequences worth stating plainly:

- **`keyRove(e)` is unchanged.** A call that passes no options reads exactly the
  markup it always did. Nothing about the attribute API moved when options
  arrived.
- **Mixing is ordinary, not a fallback.** `{ loop: true }` over a marked-up list
  is a normal thing to write, not a halfway state to be migrated out of.

Every field, and the attribute it falls back to, is in the
[API reference](/docs/api#options).

## Which to reach for

**Markup, where you write the HTML.** The group is described where it is built,
so a list becomes a grid by gaining an attribute and nothing in your JavaScript
changes. One delegated listener can serve any number of groups that each
describe themselves, which is what [nested roots](/docs/examples/nested-roots)
and [several groups on one listener](/docs/installation#several-groups-one-listener)
are built on. Every example on this site but one is written this way.

**Options, where you do not.** An attribute has to be on the element, which is
no help when the HTML belongs to a component library, a CMS, or a framework
component you are not going to fork. `items` takes a selector — or a reading of
your own — so a group can be named by the roles or classes its markup already
has:

```ts
const config = { items: '[role="menuitem"]', loop: true };

document
  .querySelector('#share')
  .addEventListener('keydown', (e) => keyRove(e, config));
```

**Options, for settings you compute.** `keyRove` is called fresh for every
keypress, so an object built at the call site is as live as an attribute is —
there is no instance holding a stale copy:

```ts
el.addEventListener('keydown', (e) =>
  keyRove(e, { items: '.cell', cols: columnsNow() }),
);
```

For markup you do own, the attribute is usually the better of the two:
[responsive grid](/docs/examples/responsive-grid) tracks a column count that CSS
decides, without an options object at all, with `data-keyrove-cols="auto"`.

## One object, both handlers

`createTypeahead` takes the settings that bear on finding an item — `items`,
`root`, `skip` and `rovingTabindex` — under the same names and with the same
fallbacks. So a group described in JavaScript hands the same object to both
handlers, and they cannot disagree about what an item is:

```ts
const config = { items: '[role="menuitem"]', loop: true };
const typeahead = createTypeahead(config);

el.addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
```

The settings that are about _moves_ — the keys, the columns, looping — are not
among its options: a typeahead has one way to reach an item, its label, for
which it takes a `label` of its own.

[`initRovingTabindex`](/docs/api#initrovingtabindex-root-options) takes the
same four settings, so the object that describes a roving group also places
its tab stop.

[Options in JavaScript](/docs/examples/javascript-options) is the whole of this
at work, on a menu that carries no keyrove attribute anywhere.
