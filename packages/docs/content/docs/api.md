---
title: API reference
description: Every export in the package — the handler, the helper, the attributes, and the types.
group: Reference
order: 20
---

## keyRove(event, options?)

Handles keyboard navigation within the event's navigation root, moving focus to
the element the pressed key resolves to.

```ts
import { keyRove } from '@mixedrays/keyrove';

list.addEventListener('keydown', (e) => keyRove(e));
```

The root is the nearest ancestor of the event target carrying
`data-keyrove-root`, falling back to the element the listener is attached to
(`currentTarget`). That fallback is what lets one delegated listener serve
several independent groups — see
[several groups, one listener](/docs/installation#several-groups-one-listener).
Because it is the _nearest_ ancestor, roots can also be
[nested](/docs/examples/nested-roots): the innermost one governs while focus is
inside it.

`preventDefault()` is called for every key keyrove acts on, so the page does not
scroll while you arrow through a list. Keys it does not act on are left
untouched.

### Keys

| Key                                      | In a list                   | In a grid                  |
| ---------------------------------------- | --------------------------- | -------------------------- |
| `ArrowDown` (or `data-keyrove-next-key`) | Next item                   | Next row, same column      |
| `ArrowUp` (or `data-keyrove-prev-key`)   | Previous item               | Previous row, same column  |
| `ArrowRight`                             | —                           | Next cell in the row       |
| `ArrowLeft`                              | —                           | Previous cell in the row   |
| `Home`                                   | First navigable item        | First navigable item       |
| `End`                                    | Last navigable item         | Last navigable item        |
| `PageDown`                               | Forward `page-length` items | Forward `page-length` rows |
| `PageUp`                                 | Back `page-length` items    | Back `page-length` rows    |

`Home`, `End`, `PageUp`, and `PageDown` only act once focus is genuinely inside
an item. Without that gate they would be swallowed — and native page scrolling
lost — on a container that has no focused item to move from.

### options.callbacks

Fired _after_ focus has moved, and only when it actually moved: a no-op at a
grid edge fires nothing.

```ts
keyRove(e, {
  callbacks: {
    next: ({ focused }) => console.log('moved to', focused),
    prev: ({ focused }) => {},
    home: ({ focused }) => {},
    end: ({ focused }) => {},
    pageUp: ({ focused }) => {},
    pageDown: ({ focused }) => {},
  },
});
```

Every callback is optional and receives `{ focused }` — the element that now has
focus. In a grid, a left or right cell move reports as `prev` and `next`.

## toggleTabIndex({ root, isActive })

Sets `tabindex` to `0` or `-1` on a single element.

```ts
import { toggleTabIndex } from '@mixedrays/keyrove';

toggleTabIndex({ root: firstItem, isActive: true });
```

Exported for the cases where you manage the tab stop yourself — establishing the
first one in a [roving group](/docs/examples/roving-tabindex), or restoring it
after re-rendering a list. Descendant tab stops are deliberately left alone;
roving tabindex only needs the item itself to carry the stop.

A nullish `root` is a no-op, so a query that found nothing does not need
guarding at the call site.

## Attributes

| Attribute                      | On   | Default     | Meaning                                                                        |
| ------------------------------ | ---- | ----------- | ------------------------------------------------------------------------------ |
| `data-keyrove-item`            | item | —           | Marks an element as navigable.                                                 |
| `data-keyrove-skip`            | item | —           | Passed over when moving; stays in the DOM order.                               |
| `data-keyrove-roving-tabindex` | item | —           | Moves the `tabindex="0"` tab stop with focus.                                  |
| `data-keyrove-root`            | root | —           | Marks the navigation root explicitly, instead of using the listener's element. |
| `data-keyrove-cols-length`     | root | `1`         | A value above 1 switches the group to grid navigation.                         |
| `data-keyrove-page-length`     | root | `10`        | Items per page jump — whole rows in a grid.                                    |
| `data-keyrove-next-key`        | root | `ArrowDown` | The `KeyboardEvent.code` that moves forward.                                   |
| `data-keyrove-prev-key`        | root | `ArrowUp`   | The `KeyboardEvent.code` that moves back.                                      |

Root attributes are read on every keypress rather than cached, so changing one
takes effect immediately — see
[responsive grids](/docs/examples/grid#responsive-grids).

Elements carrying `disabled` are excluded from navigation without needing
`data-keyrove-skip`.

### Constants

Each attribute name is also exported, so markup built in JavaScript need not
hardcode strings:

```ts
import {
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_SKIP,
  KEYROVE_ATTR_ROOT,
  KEYROVE_ATTR_NEXT_KEY,
  KEYROVE_ATTR_PREV_KEY,
  KEYROVE_ATTR_PAGE_LENGTH,
  KEYROVE_ATTR_COLS_LENGTH,
  KEYROVE_ATTR_ROVING_TABINDEX,
} from '@mixedrays/keyrove';
```

## Types

```ts
import type {
  Callbacks,
  KeyRoveCode,
  KeyRoveEvent,
  Options,
} from '@mixedrays/keyrove';
```

### KeyRoveEvent

The shape keyrove needs from a keydown event — structural rather than a union of
`KeyboardEvent | React.KeyboardEvent`, so the package stays dependency-free
while accepting both.

```ts
type KeyRoveEvent = {
  code: KeyRoveCode;
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  preventDefault: () => void;
};
```

### KeyRoveCode

A `KeyboardEvent.code`. The union arm keeps it assignable from a plain `string`
— which is how both the DOM and React type `code` — while editors still complete
the codes keyrove acts on. It documents intent; it does not validate.

```ts
type KeyRoveCode =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown'
  | (string & {});
```

### Callbacks

```ts
type Callbacks = {
  [K in 'home' | 'end' | 'next' | 'prev' | 'pageUp' | 'pageDown']?: (args: {
    focused: Element | null;
  }) => void;
};

type Options = { callbacks?: Callbacks };
```
