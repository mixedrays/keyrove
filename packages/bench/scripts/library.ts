/**
 * The library under test: which one it is, and building it.
 *
 * The runner can measure keyrove at any git ref, not only the working tree.
 * Checking a ref out would not do: the benchmark itself is younger than most
 * releases, so it would vanish with the checkout. Instead the library's
 * source is read out of git into a scratch directory, and the working tree
 * is left alone.
 *
 * Every source, the working tree's included, is built the same way, with this
 * checkout's Vite and the settings keyrove's own config uses: one ES module,
 * unminified. Two versions then differ only in their source, not in the
 * toolchain that happened to build their release.
 */

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

import type { LibraryInfo } from '../src/types.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const LIBRARY = 'packages/keyrove';

const git = (...args: string[]) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const readVersion = (libraryRoot: string): string =>
  JSON.parse(readFileSync(join(libraryRoot, 'package.json'), 'utf8')).version;

/** The working tree's library: its version, commit, and whether it has edits. */
export const describeWorkingTree = (): LibraryInfo => {
  const version = readVersion(join(repoRoot, LIBRARY));

  try {
    const dirty = git('status', '--porcelain', '--', `${LIBRARY}/src`) !== '';
    return {
      version,
      commit: git('rev-parse', '--short', 'HEAD'),
      ...(dirty ? { dirty } : {}),
    };
  } catch {
    // Not a git checkout: the version is all there is to say.
    return { version };
  }
};

/** A report file name out of a ref: `release/2.1` becomes `release-2.1`. */
export const reportName = (ref: string) => ref.replace(/[^\w.-]+/g, '-');

const exited = (child: ChildProcess) =>
  new Promise<number | null>((done) => child.on('close', done));

/** Runs `from | to` and fails with whatever either wrote to stderr. */
const pipe = async (
  [fromCommand, ...fromArgs]: string[],
  [toCommand, ...toArgs]: string[],
) => {
  const from = spawn(fromCommand, fromArgs, { cwd: repoRoot });
  const to = spawn(toCommand, toArgs);
  let stderr = '';
  from.stderr.on('data', (chunk) => (stderr += chunk));
  to.stderr.on('data', (chunk) => (stderr += chunk));
  from.stdout.pipe(to.stdin);

  // Either can close first, so wait for both before judging either.
  const codes = await Promise.all([exited(from), exited(to)]);
  if (codes.some((code) => code !== 0)) {
    throw new Error(stderr.trim() || `${fromCommand} | ${toCommand} failed`);
  }
};

/**
 * The library source to build, copied into `dir`: from `ref` when given,
 * else from the working tree, uncommitted edits and all.
 */
export const prepareSource = async (
  ref: string | undefined,
  dir: string,
): Promise<{ root: string; info: LibraryInfo }> => {
  const root = join(dir, LIBRARY);
  await mkdir(root, { recursive: true });

  if (!ref) {
    await cp(join(repoRoot, LIBRARY, 'src'), join(root, 'src'), {
      recursive: true,
    });
    await cp(
      join(repoRoot, LIBRARY, 'package.json'),
      join(root, 'package.json'),
    );
    return { root, info: describeWorkingTree() };
  }

  let commit: string;
  try {
    commit = git('rev-parse', '--verify', '--short', `${ref}^{commit}`);
  } catch {
    throw new Error(`"${ref}" is not a tag, branch or commit in this repo.`);
  }
  try {
    git('cat-file', '-e', `${commit}:${LIBRARY}/src/index.ts`);
  } catch {
    throw new Error(`${ref} has no ${LIBRARY}/src/index.ts to build.`);
  }

  await pipe(
    [
      'git',
      'archive',
      '--format=tar',
      commit,
      `${LIBRARY}/src`,
      `${LIBRARY}/package.json`,
    ],
    ['tar', '-x', '-C', dir],
  );

  return { root, info: { version: readVersion(root), ref, commit } };
};

/** Builds a library source tree into `outDir`; resolves with its module. */
export const buildLibrary = async (libraryRoot: string, outDir: string) => {
  await build({
    configFile: false,
    logLevel: 'warn',
    root: libraryRoot,
    build: {
      lib: {
        entry: join(libraryRoot, 'src', 'index.ts'),
        formats: ['es'],
        fileName: () => 'index.js',
      },
      outDir,
      emptyOutDir: true,
      minify: false,
    },
  });

  return join(outDir, 'index.js');
};
