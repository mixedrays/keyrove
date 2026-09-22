# keyrove

[![npm](https://img.shields.io/npm/v/@mixedrays/keyrove?color=4f46e5)](https://www.npmjs.com/package/@mixedrays/keyrove)
[![minzipped size](https://img.shields.io/bundlejs/size/%40mixedrays%2Fkeyrove?color=4f46e5&label=minzipped%20size)](https://bundlejs.com/?q=%40mixedrays%2Fkeyrove)
[![license](https://img.shields.io/npm/l/@mixedrays/keyrove?color=4f46e5)](https://github.com/mixedrays/keyrove/blob/main/LICENSE)

Keyboard navigation for lists, grids and trees. Configure it with data
attributes or JavaScript options, in any framework.

## Getting started

```sh
pnpm add @mixedrays/keyrove
```

Mark the navigable elements with `data-keyrove-item`, give them a tab stop, and
pass the container's keydown event to `keyRove`:

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

Use an `items` option when you cannot add attributes to the markup. This
selects the same list items without `data-keyrove-item`; keep their tabindex:

```ts
document
  .querySelector('#menu')
  .addEventListener('keydown', (e) => keyRove(e, { items: 'li' }));
```

Options override attributes one setting at a time, with
[scope and replacement differences](https://keyrove.pages.dev/docs/attributes-and-options#configuration-differences).

`keyRove` accepts native keyboard events and compatible framework events,
including React synthetic events. The
[installation guide](https://keyrove.pages.dev/docs/installation) shows setup
for vanilla JavaScript, React, Vue and Svelte.

## Documentation

- [Introduction](https://keyrove.pages.dev/docs/introduction) — how it works,
  which keys move focus, and what it leaves to you.
- [Attributes and options](https://keyrove.pages.dev/docs/attributes-and-options)
  — the two places a group can be described, and which to reach for.
- [Examples](https://keyrove.pages.dev/docs/examples/basic) — live demos of
  lists, grids, trees, custom keys, roving tabindex, nested roots and more.
- [API reference](https://keyrove.pages.dev/docs/api) — every attribute,
  option and export.

## Contributing

Read the
[contributing guide](https://github.com/mixedrays/keyrove/blob/main/CONTRIBUTING.md)
to learn how to set up the repository, run the checks, and propose changes.

## Releases

Every version is listed in the
[changelog](https://github.com/mixedrays/keyrove/blob/main/packages/keyrove/CHANGELOG.md)
and on the [releases page](https://github.com/mixedrays/keyrove/releases).

## License

This project is licensed under the terms of the
[MIT license](https://github.com/mixedrays/keyrove/blob/main/LICENSE).
