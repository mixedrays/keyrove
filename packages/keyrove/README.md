# @mixedrays/keyrove

Framework-agnostic arrow-key navigation for lists and grids, driven by `data-*`
attributes.

```sh
pnpm add @mixedrays/keyrove
```

## Usage

Mark navigable elements with `data-keyrove-item`, give them a tab stop, and pass
the container's keydown event to `keyRove`.

```html
<ul id="menu">
  <li data-keyrove-item tabindex="0">Inbox</li>
  <li data-keyrove-item tabindex="0">Drafts</li>
  <li data-keyrove-item tabindex="0">Sent</li>
</ul>
```

```ts
import { keyRove } from '@mixedrays/keyrove';

document.querySelector('#menu').addEventListener('keydown', (e) => keyRove(e));
```

`keyRove` accepts anything shaped like a keydown event, so React, Vue and
Svelte synthetic events work without an adapter:

```tsx
<ul onKeyDown={(e) => keyRove(e)}>
  {items.map((item) => (
    <li key={item.id} data-keyrove-item tabIndex={0}>
      {item.label}
    </li>
  ))}
</ul>
```

## Attributes

| Attribute | On | Default | Meaning |
| --- | --- | --- | --- |
| `data-keyrove-item` | item | — | Marks an element as navigable. |
| `data-keyrove-skip` | item | — | Passed over when moving; stays in the DOM order. |
| `data-keyrove-roving-tabindex` | item | — | Moves the `tabindex="0"` tab stop with focus. |
| `data-keyrove-root` | root | — | Marks the navigation root explicitly, instead of using the listener's element. |
| `data-keyrove-cols-length` | root | `1` | A value above 1 switches the group to grid navigation. |
| `data-keyrove-page-length` | root | `10` | Items per page jump — whole rows in a grid. |
| `data-keyrove-next-key` | root | `ArrowDown` | The `KeyboardEvent.code` that moves forward. |
| `data-keyrove-prev-key` | root | `ArrowUp` | The `KeyboardEvent.code` that moves back. |

Every attribute name is also exported as a constant (`KEYROVE_ATTR_ITEM`,
`KEYROVE_ATTR_COLS_LENGTH`, …).

## Options

```ts
keyRove(e, {
  callbacks: {
    next: ({ focused }) => {},
    prev: ({ focused }) => {},
    home: ({ focused }) => {},
    end: ({ focused }) => {},
    pageUp: ({ focused }) => {},
    pageDown: ({ focused }) => {},
  },
});
```

Callbacks fire after focus has moved, and only when it actually moved.

`toggleTabIndex({ root, isActive })` is exported for cases where you manage the
tab stop yourself — restoring it after re-rendering a list, for instance.

## License

MIT
