# keyrove repository

This repository is a pnpm monorepo for [keyrove](packages/keyrove), a
framework-agnostic keyboard navigation library for lists, grids and trees.

## Packages

| Package                   | Path                                 | Description                                         |
| ------------------------- | ------------------------------------ | --------------------------------------------------- |
| `@mixedrays/keyrove`      | [packages/keyrove](packages/keyrove) | The library. Published to npm.                      |
| `@mixedrays/keyrove/docs` | [packages/docs](packages/docs)       | Documentation site and landing page. Not published. |

## Getting started

Requires [pnpm](https://pnpm.io) 10 and Node 20+.

```sh
pnpm install
```

## Scripts

Run from the repo root:

| Command           | Does                                                  |
| ----------------- | ----------------------------------------------------- |
| `pnpm dev`        | Starts the docs site on a local dev server.           |
| `pnpm test`       | Runs the test suite across the workspace.             |
| `pnpm test:watch` | Runs the library tests in watch mode.                 |
| `pnpm lint`       | Checks formatting across the workspace with Prettier. |
| `pnpm format`     | Rewrites files to Prettier style.                     |
| `pnpm build`      | Builds every package.                                 |
| `pnpm bench`      | Times `keyRove` in headless Chrome.                   |
| `pnpm typecheck`  | Type-checks every package.                            |
| `pnpm preview`    | Serves the built docs site.                           |

The benchmark's method and recorded results are in
[packages/keyrove/bench](packages/keyrove/bench/README.md).

Any script can be aimed at one package with a filter:

```sh
pnpm --filter @mixedrays/keyrove test
pnpm --filter @mixedrays/keyrove/docs build
```

## How the docs site works

Every page is one markdown file under
[packages/docs/content](packages/docs/content), and its path is its URL:
`content/docs/examples/basic.md` is served at `/docs/examples/basic`. Adding a
page means adding a file — the sidebar, the "On this page" rail, the prev/next
pager, and `llms.txt` are all derived from what is on disk.

Frontmatter carries the little that cannot be inferred:

```yaml
---
title: Basic list
description: One sentence, used as the page lead and in llms.txt.
group: Examples # sidebar section; omit to keep a page out of the nav
order: 10 # sorts within the group, and sorts the groups by their lowest
---
```

### Markdown for machines

Appending `.md` to any URL returns that page as markdown — `/docs/api` renders
the API reference, `/docs/api.md` returns its source — and
[`/llms.txt`](https://llmstxt.org) indexes the lot. Both are generated from the
same content, in dev and in the build, so they cannot drift from the rendered
pages.

The served markdown is not the file verbatim: frontmatter is site plumbing, so
it is replaced by the `title` as an H1 and the `description` as a blockquote,
leaving a document that stands on its own when fetched in isolation.

### Documentation search

The header search button and `Cmd+K` / `Ctrl+K` open a native dialog. MiniSearch
and `search-index.json` load on first use. The index contains docs page leads
and individual sections, with heading IDs allocated by the same parser as the
rendered pages; landing and `noindex` pages are excluded. Titles and headings
rank above body matches, with prefix matching and typo tolerance enabled.

The results are a keyrove group: the site navigating with its own library.
Each result is a link and keeps its own tab stop, so Tab walks the results as
well as the arrows; `keyRove` moves focus between the links, looping at the
ends. keyrove leaves a text field its caret keys, so the box
focuses an end of the list itself to hand focus over, and a character typed on
a result sends focus back to the box.

The Vite plugin generates the index in development and production. Markdown
edits invalidate the development cache and reload the page, including search.
Run the search indexing tests with `pnpm --filter @mixedrays/keyrove/docs test`.

### Sidebar navigation

Both sidebars use keyrove for roving focus and looping arrow navigation.
`Alt+Shift+E` (`Option+Shift+E` on macOS) focuses the left navigation;
`Alt+Shift+O` focuses the visible "On this page" sidebar. They are Alt+Shift
chords because browsers reserve most Ctrl/Cmd+Shift letters (`Ctrl+Shift+I`
opens DevTools). The shortcuts use `focusKeys` to return to each group's tab
stop. The left group starts on the current page; the right one follows the
active section while focus is outside it.
The left shortcut opens the mobile drawer when needed; shortcuts leave an
open search dialog alone. The closed drawer is `visibility: hidden`, so its
links are out of the Tab order. Each sidebar shows its shortcut beside its
first heading on hover, and the arrow keys as well while keyboard focus is
inside it.

### Live demos

A content file embeds a demo with `<div data-demo="grid"></div>`. The markup
behind it is one file under
[packages/docs/content/_demos](packages/docs/content/_demos), named after the
demo. [packages/docs/build/demos.ts](packages/docs/build/demos.ts) stamps it
into the page twice, once as live elements and once as the source block under
them, so the two cannot drift. Repeated items wrapped in `<!-- fold -->` …
`<!-- /fold -->` still run but collapse to one comment in the source block,
which keeps a 24-item list from costing 24 lines of a page that is also served
as markdown.

Layout the demo needs but the library does not teach — the grid's columns, the
long list's scroll box — goes in `data-demo-class` on the placeholder rather
than in the fragment, so what a reader copies is markup they can paste as-is.
[packages/docs/src/demos.ts](packages/docs/src/demos.ts) wires the behaviour
markup cannot carry: the keydown listener, the move log, and the copy button.

For a compact **demo panel** on any docs page, add a label:

````md
<div data-demo="loop" data-demo-label="account menu"></div>

```ts
import { keyRove } from '@mixedrays/keyrove';

const menu = document.querySelector('#account-menu');
menu.addEventListener('keydown', (e) => keyRove(e));
```
````

The panel includes a live preview, a single-line readout, and tabs for the
fragment's HTML and the adjacent code blocks. It uses the opposite theme to
the page and keeps long code blocks scrollable. Omit `data-demo-label` to use
the existing detailed demo presentation. `data-demo-class`, when needed,
goes before `data-demo-label`.

[demo-panel.css](packages/docs/src/demo-panel.css) owns the shared presentation;
the embedding page owns column widths and spacing. No hero or landing classes
are required. Code-only examples can use a
`<div class="demo-panel demo-panel--code">` around adjacent fenced blocks,
with blank lines between the wrapper and the fences.

### Build

[packages/docs/vite-plugin-docs.ts](packages/docs/vite-plugin-docs.ts) drives
both modes from one renderer. In dev a middleware renders on request; in the
build, Vite bundles `index.html` once and every page is stamped out of the
result, so all pages share one set of hashed asset URLs.

Pages are emitted as `dist/docs/api.html` and served at extensionless URLs
(`/docs/api`), which is what lets `.md` be appended. Cloudflare Pages redirects
`/docs/api/` there, so the URL that links, canonical tags and the sitemap name
answers directly. Extensionless URLs rule out relative asset paths, so links
are absolute to `base` — set `DOCS_BASE` when deploying to a subpath:

```sh
DOCS_BASE=/keyrove/ pnpm --filter @mixedrays/keyrove/docs build
```

`DOCS_SITE_URL` sets the origin used for the links in `llms.txt`.

### Resolving the library

The docs site aliases `@mixedrays/keyrove` to the library's TypeScript source
(see [packages/docs/vite.config.ts](packages/docs/vite.config.ts)), so
`pnpm dev` hot-reloads library edits without a build step in between. The
published package still ships `dist` — nothing about its `exports` changes.

## License

MIT
