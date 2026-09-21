# keyrove

[![npm](https://img.shields.io/npm/v/@mixedrays/keyrove?color=4f46e5)](https://www.npmjs.com/package/@mixedrays/keyrove)
[![minzipped size](https://img.shields.io/bundlejs/size/%40mixedrays%2Fkeyrove?color=4f46e5&label=minzipped%20size)](https://bundlejs.com/?q=%40mixedrays%2Fkeyrove)
[![license](https://img.shields.io/npm/l/@mixedrays/keyrove?color=4f46e5)](https://github.com/mixedrays/keyrove/blob/main/LICENSE)

Framework-agnostic keyboard navigation for lists, grids and trees, driven by
`data-*` attributes or a plain options object. Any key can move focus — arrows
are only the default — and native <kbd>Tab</kbd> navigation keeps working.

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

Where the markup is not yours to change — a component library's menu, a CMS's
output — every attribute has an option of the same name, so the same list can
be described in the call instead:

```ts
document
  .querySelector('#menu')
  .addEventListener('keydown', (e) => keyRove(e, { items: 'li' }));
```

`keyRove` takes anything shaped like a keydown event, so React, Vue and Svelte
synthetic events work without an adapter. The
[installation guide](https://keyrove.pages.dev/docs/installation) shows the
wiring in each framework.

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
