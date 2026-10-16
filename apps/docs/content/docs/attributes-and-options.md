---
# Live page: https://keyrove.pages.dev/docs/attributes-and-options
title: Attributes and options
description: Configure keyboard navigation with data-keyrove-* attributes, JavaScript options or both, including how options fall back and where the two differ.
keywords: [data attributes, javascript options, configuration]
titleTag: Two ways to configure keyboard navigation — keyrove
group: Guide
order: 3
---

Configure a group with `data-keyrove-*` attributes, JavaScript options, or both.
Options override attributes one setting at a time. Some options have different
names or scope; see the [differences below](#configuration-differences).

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

Choose based on [where you configure the group](#which-to-reach-for).

## They fall back field by field

`keyRove` reads the current settings on every keypress. An omitted option
falls back to its attribute, then to the default:

```ts
keyRove(e); // attributes and defaults
keyRove(e, { loop: true }); // override looping only
keyRove(e, { items: '[role="menuitem"]' }); // override item lookup only
```

`keys` falls back per action. With `{ keys: { next: 'KeyJ' } }`, <kbd class="kbd">J</kbd> moves to
the next item; every other action keeps its attribute or default binding.
An empty, blank or comma-only binding also falls back. Use `'none'` to disable
an action's key.

### Configuration differences

| Setting         | Attributes                                                                                         | Options                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Items           | `data-keyrove-item` marks each item.                                                               | `items` replaces that lookup with a selector or function that returns the items.                                                           |
| Roots           | `data-keyrove-root` marks each root.                                                               | `root` replaces that test with a selector for finding the nearest root. It is not a root element or boolean.                               |
| Roving tabindex | `data-keyrove-roving-tabindex` enables roving on individual items.                                 | `rovingTabindex` is one boolean for the group; `false` overrides item attributes.                                                          |
| Skipping        | `data-keyrove-skip` marks each skipped item.                                                       | `skip` replaces that test with a selector or predicate. Disabled items are always excluded from navigation.                                |
| Move bindings   | Each `data-keyrove-*-key` sets one action's binding.                                               | `keys` overrides bindings per action; omitted or empty entries fall back.                                                                  |
| Focus shortcuts | `data-keyrove-focus-key` is scanned under the listener. Skipped and disabled targets are excluded. | `focusKeys` replaces the whole scan, including when it is `{}`. Explicit targets bypass skip checks, but disabled targets remain excluded. |
| Typeahead label | `data-keyrove-typeahead` sets one item's label.                                                    | `label`, a `createTypeahead` option, is a function over every item. An empty result falls back to the attribute, then the item's text.     |

For example, these two options have different replacement rules:

```ts
keyRove(e, { keys: { next: 'KeyJ' } }); // other actions still fall back
keyRove(e, { focusKeys: { 'ctrl+KeyE': '#editor' } }); // no attribute scan
```

Roving tabindex also differs in scope. The attribute enrolls one item at a
time, so mark every item that shares the tab stop. The option applies to the
whole group:

```html title="Attributes"
<ul id="menu">
  <li data-keyrove-item data-keyrove-roving-tabindex tabindex="0">Inbox</li>
  <li data-keyrove-item data-keyrove-roving-tabindex tabindex="-1">Drafts</li>
</ul>
```

```ts title="Options"
// <ul id="menu"><li tabindex="0">Inbox</li><li tabindex="-1">Drafts</li></ul>
// Every item shares the stop, whatever its roving attribute says.
menu.addEventListener('keydown', (e) =>
  keyRove(e, { items: 'li', rovingTabindex: true }),
);
```

Either way, [set an initial tab stop](/docs/examples/roving-tabindex#setting-the-initial-tab-stop).

The [API reference](/docs/api#options) lists every option and its fallback.

## Which to reach for

**Use attributes when you write the HTML.** Keep each group's settings beside
its items. One delegated listener can serve [several groups](/docs/installation#several-groups-one-listener)
or [nested roots](/docs/examples/nested-roots).

Use the [attribute builders](/docs/api#attribute-builders) to type-check those
settings in templates. A root configuration can also be passed directly to
`keyRove` without renaming its fields:

```tsx
import { itemAttributes, keyRove, rootAttributes } from '@mixedrays/keyrove';
import type { RootAttributeOptions } from '@mixedrays/keyrove';

const config = {
  loop: true,
  keys: { next: 'KeyJ', prev: 'KeyK' },
} satisfies RootAttributeOptions;

// Settings in markup; the handler reads them on each keypress.
<ul {...rootAttributes(config)} onKeyDown={keyRove}>
  <li {...itemAttributes()} tabIndex={0}>
    Inbox
  </li>
  <li {...itemAttributes()} tabIndex={0}>
    Drafts
  </li>
</ul>;

// The same settings can instead be supplied as options: keyRove(e, config).
```

`rootAttributes` covers columns, looping, orientation, page length and move
bindings, and always marks the root. `itemAttributes` always marks the item;
its `skip`, `rovingTabindex`, `focusKey` and `typeahead` fields describe that
item. The builders emit explicit `"false"` values and omit `undefined` fields.

**Use options when you cannot change the HTML.** Select items by existing roles
or classes in a component library or CMS:

```ts
const config = { items: '[role="menuitem"]', loop: true };

document
  .querySelector('#share')
  .addEventListener('keydown', (e) => keyRove(e, config));
```

**Use options for computed settings.** Build the options object in the handler
to supply a current value on each keypress:

```ts
el.addEventListener('keydown', (e) =>
  keyRove(e, { items: '.cell', cols: columnsNow() }),
);
```

For a CSS grid, `data-keyrove-cols="auto"` or `{ cols: 'auto' }` reads the
column count from the layout; see [responsive grid](/docs/examples/responsive-grid).

## One object, both handlers

`createTypeahead` shares four group options with `keyRove`: `items`, `root`,
`skip` and `rovingTabindex`. Pass the same configuration to both handlers so
they use the same item and skip rules:

```ts
const config = { items: '[role="menuitem"]', loop: true };
const typeahead = createTypeahead(config);

el.addEventListener('keydown', (e) => keyRove(e, config) || typeahead(e));
```

Typeahead uses labels to find items. It has its own `label` option and ignores
movement settings such as keys, columns and looping. Create the handler once
per listener; if its options change, create a new handler. Item queries and
attribute fallbacks still read the current DOM.

[`initRovingTabindex`](/docs/api#initrovingtabindex-root-options) and
[`followFocus`](/docs/api#followfocus-event-options) share the same four group
options. Use them to initialize the tab stop and keep it with focus.

[`rove`](/docs/api#rove-element-action-options) accepts the same options as
`keyRove` and ignores `keys` and `focusKeys`. Pass the same configuration to
move from code: `rove(el, 'next', config)`.

[Options in JavaScript](/docs/examples/javascript-options) shows a complete
menu configured this way.
