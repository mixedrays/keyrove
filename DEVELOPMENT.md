# keyrove repository

This repository is a pnpm monorepo for [keyrove](packages/keyrove), a
framework-agnostic keyboard navigation library for lists, grids and trees.

## Packages

| Package                    | Path                                 | Description                                         |
| -------------------------- | ------------------------------------ | --------------------------------------------------- |
| `@mixedrays/keyrove`       | [packages/keyrove](packages/keyrove) | The library. Published to npm.                      |
| `@mixedrays/keyrove/docs`  | [packages/docs](packages/docs)       | Documentation site and landing page. Not published. |
| `@mixedrays/keyrove/bench` | [packages/bench](packages/bench)     | Browser benchmark and its UI. Not published.        |

## Getting started

Requires [pnpm](https://pnpm.io) 10 and Node 20+.

```sh
pnpm install
```

## Scripts

Run from the repo root:

| Command               | Does                                                       |
| --------------------- | ---------------------------------------------------------- |
| `pnpm dev`            | Starts the docs site on a local dev server.                |
| `pnpm test`           | Runs the test suite across the workspace.                  |
| `pnpm test:watch`     | Runs the library tests in watch mode.                      |
| `pnpm test:browser`   | Runs the library's browser tests in headless Chromium.     |
| `pnpm lint`           | Checks formatting across the workspace with Prettier.      |
| `pnpm format`         | Rewrites files to Prettier style.                          |
| `pnpm build`          | Builds every package.                                      |
| `pnpm bench`          | Opens the benchmark UI to time `keyRove` in a browser.     |
| `pnpm bench:headless` | Times `keyRove` in headless Chrome and prints tables.      |
| `pnpm typecheck`      | Type-checks every package.                                 |
| `pnpm preview`        | Serves the built docs site.                                |
| `pnpm publish:npm`    | Publishes the library to npm. See [Releasing](#releasing). |

The benchmark's method and recorded results are in
[packages/bench](packages/bench/README.md), with how to compare releases:
`pnpm bench:headless -- --ref v2.1.0 --ref v2.2.0` benchmarks each tag and
saves a report for it, and `pnpm bench` compares them side by side.

Any script can be aimed at one package with a filter:

```sh
pnpm --filter @mixedrays/keyrove test
pnpm --filter @mixedrays/keyrove/docs build
```

## Browser tests

`pnpm test` runs the library's unit suite in jsdom, which has no layout, no
Tab order and no notion of an element that refuses focus. `pnpm test:browser`
covers that part of the contract in a real browser: a small suite under
[packages/keyrove/browser](packages/keyrove/browser) that imports the
library's public entry and drives it with real key presses and clicks. It
checks that Tab and Shift+Tab enter, leave and return to a roving group, that
nested groups keep their own stops, that navigation works in a shadow root,
and that a hidden or inert target leaves focus and the stop alone.

It runs on Vitest's browser mode with Playwright, in headless Chromium.
Install the browser once:

```sh
pnpm --filter @mixedrays/keyrove exec playwright install chromium
```

CI runs the suite on every pull request. Put a test there only when it needs
a real browser; everything else belongs in the unit suite.

## Releasing

A release happens in two halves: CI cuts it, and the npm publish is done by
hand.

1. Merge a pull request into `main`. The
   [Release workflow](.github/workflows/release.yml) runs release-it, which
   derives the next version from the conventional commits since the last tag,
   bumps `packages/keyrove/package.json`, updates the changelog, commits and
   tags `vX.Y.Z` on `main`, and creates the GitHub release. A merge with no
   `feat` or `fix` commits releases nothing.
2. Once the workflow has finished, publish that version from an up-to-date
   `main`:

   ```sh
   git switch main
   git pull
   npm login
   pnpm publish:npm
   ```

`pnpm publish:npm` builds, type-checks and tests the library before publishing
it. pnpm refuses to publish from a branch other than `main`, from a dirty
working tree, or from a `main` behind its remote. If the version is already on
npm, it publishes nothing.

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
keywords: [list, arrow keys] # JSON-LD keywords; optional
group: Examples # sidebar section; omit to keep a page out of the nav
order: 10 # sorts within the group, and sorts the groups by their lowest
---
```

### Markdown for machines

Appending `.md` to any URL returns that page as markdown — `/docs/api` renders
the API reference, `/docs/api.md` returns its source — and
[`/llms.txt`](https://llmstxt.org) indexes the lot. `/llms-full.txt` is every
page `llms.txt` lists, in full, in one file. All of them are generated from the
same content, in dev and in the build, so they cannot drift from the rendered
pages.

The served markdown is not the file verbatim: frontmatter is site plumbing, so
it is replaced by the `title` as an H1 and the `description` as a blockquote,
leaving a document that stands on its own when fetched in isolation.

### Documentation search

The header search button and `Cmd+K` / `Ctrl+K` open a dialog. The dialog's
code, MiniSearch and `search-index.json` load on first use. The index contains
docs page leads and individual sections, with heading IDs allocated by the
same parser as the rendered pages; landing and `noindex` pages are excluded.
Titles and headings rank above body matches, with prefix matching and typo
tolerance enabled.

The dialog is Base UI's, with its autocomplete inside: focus stays in the
box while the arrows move a highlight through the results, and Enter follows
the highlighted result — the first one until the reader moves it. Each result
is a link, so a modified click still opens it in a new tab.

The content plugin generates the index in development and production.
Markdown edits invalidate the development cache and reload the page,
including search. Run the search indexing tests with
`pnpm --filter @mixedrays/keyrove/docs test`.

### Sidebar navigation

Both sidebars use keyrove for roving focus and looping arrow navigation.
`Alt+Shift+E` (`Option+Shift+E` on macOS) focuses the left navigation;
`Alt+Shift+O` focuses the visible "On this page" sidebar. They are Alt+Shift
chords because browsers reserve most Ctrl/Cmd+Shift letters (`Ctrl+Shift+I`
opens DevTools). The shortcuts use `focusKeys` to return to each group's tab
stop. The left group starts on the current page; the right one follows the
active section while focus is outside it.
The left shortcut opens the mobile drawer when needed; shortcuts leave an
open search dialog alone. The drawer is a Base UI sheet: it exists only while
open, traps focus while it is, and opens on the current page's link. Each
sidebar shows its shortcut beside its first heading on hover, and the arrow
keys as well while keyboard focus is inside it.

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
markup cannot carry: the keydown listener and the move log. React draws the
panel around a demo, with its code tabs and copy button, but leaves the live
preview as the fragment's own markup, which keyrove rearranges as keys are
pressed.

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

### UI components

The site is a [TanStack Start](https://tanstack.com/start) app, and its UI
components are [shadcn/ui](https://ui.shadcn.com) on
[Base UI](https://base-ui.com) primitives, in
[packages/docs/src/components/ui](packages/docs/src/components/ui). They keep
shadcn's API but not its styles: each passes the class style.css already draws
that part of the site with, since a Tailwind utility on the component would
outrank every rule in the stylesheet's components layer. `components.json`
is set up for the shadcn CLI, so `pnpm dlx shadcn@latest add <component>`
works from `packages/docs`.

Keyboard navigation is split by who has it built in. Base UI owns it where its
component does — the code tabs and the landing page's pattern tabs, the search
results, the dialog's and drawer's focus trap. keyrove owns everything Base UI
has no component for: the sidebar and "On this page" rails, the 404's links,
the landing hero and every demo.

### Build

[packages/docs/vite-plugin-content.ts](packages/docs/vite-plugin-content.ts)
hands the content to the app as virtual modules: the sidebar and each page's
metadata in one, each page's rendered body in a chunk of its own, and the
generated files — the `.md` twins, `llms.txt`, the sitemap — in a third that
only the server routes under
[packages/docs/src/routes](packages/docs/src/routes) import. Markdown renders
through the same code in dev and in the build. A page's body reaches the
browser as a tree of elements built at build time rather than as HTML, so
there is no HTML parser in the bundle and nothing for hydration to disagree
about.

`pnpm build` prerenders every page, every `.md` twin and every generated file
into `dist/client`, which is what Cloudflare Pages serves; nothing runs on a
server. The first page a reader opens is that HTML. Following a link from there
swaps the page in place, loading only that page's chunk — hovering the link
starts the download.

Pages are emitted as `dist/client/docs/api.html` and served at extensionless
URLs (`/docs/api`), which is what lets `.md` be appended. Cloudflare Pages
redirects `/docs/api/` there, so the URL that links, canonical tags and the
sitemap name answers directly. The not-found page is prerendered to
`404.html`, which Pages serves for any URL it has no file for; the router then
hydrates it as the page it was rendered as. Extensionless URLs rule out
relative asset paths, so links are absolute to `base` — set `DOCS_BASE` when
deploying to a subpath:

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
