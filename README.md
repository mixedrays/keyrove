# keyrove

Monorepo for [keyrove](packages/keyrove) — framework-agnostic arrow-key
navigation for lists and grids, driven by `data-*` attributes.

## Packages

| Package                   | Path                                 | Description                                   |
| ------------------------- | ------------------------------------ | --------------------------------------------- |
| `@mixedrays/keyrove`      | [packages/keyrove](packages/keyrove) | The library. Published to npm.                |
| `@mixedrays/keyrove/docs` | [packages/docs](packages/docs)       | Documentation site and landing page. Private. |

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

## How the docs resolve the library

The docs site aliases `@mixedrays/keyrove` to the library's TypeScript source
(see [packages/docs/vite.config.ts](packages/docs/vite.config.ts)), so
`pnpm dev` hot-reloads library edits without a build step in between. The
published package still ships `dist` — nothing about its `exports` changes.

## License

MIT
