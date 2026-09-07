# Contributing to keyrove

> **Draft.** This guide is a work in progress. The basics below are enough to
> get a change in; the rest will be filled in later.

## Setting up

The repository is a pnpm monorepo. [DEVELOPMENT.md](DEVELOPMENT.md) describes
the packages, the scripts, and how the docs site is built.

```sh
pnpm install
pnpm dev
```

## Before opening a pull request

Run the same checks CI runs:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm format` fixes formatting.

There are two READMEs. The root `README.md` is a short entry point that links to
the docs site; `packages/keyrove/README.md` is the detailed one published to
npm. A change to the public API usually touches the package README and the docs
under `packages/docs/content`, and the root README only if the basic example
changes.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, and so on, with `!` after the
type for a breaking change (`feat!:`). The changelog and the next version number
are generated from them at release time, so the type matters.

## Bugs and proposals

Open an [issue](https://github.com/mixedrays/keyrove/issues) with a minimal
reproduction for a bug, or a short description for a change, before starting on
anything large.

## Still to be written

- Which branch pull requests should target, and how they are reviewed.
- Guidelines for adding examples and docs pages.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT license](LICENSE).
