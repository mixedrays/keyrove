# keyrove

Monorepo for [keyrove](packages/keyrove) — framework-agnostic keyboard
navigation for lists and grids, driven by `data-*` attributes. Arrow keys are
the default binding, not the only one, and native <kbd>Tab</kbd> navigation is
left intact.

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
| `pnpm typecheck`  | Type-checks every package.                            |
| `pnpm preview`    | Serves the built docs site.                           |

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

### Live demos

A content file embeds a demo with `<div data-demo="grid"></div>`. The shape of
each demo lives in [packages/docs/src/demos.ts](packages/docs/src/demos.ts),
which keeps a 24-item list from costing 24 lines of a file that is also served
as markdown.

### Build

[packages/docs/vite-plugin-docs.ts](packages/docs/vite-plugin-docs.ts) drives
both modes from one renderer. In dev a middleware renders on request; in the
build, Vite bundles `index.html` once and every page is stamped out of the
result, so all pages share one set of hashed asset URLs.

Pages are emitted as `dist/docs/api/index.html` and served at extensionless
URLs, which is what lets `.md` be appended. That rules out relative asset paths,
so links are absolute to `base` — set `DOCS_BASE` when deploying to a subpath:

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
