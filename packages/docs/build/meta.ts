import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The facts the About page states about the project, read from the manifests
 * rather than written down a second time in prose that would go stale.
 *
 * The version is the docs package's own, so releasing the site is what moves
 * it. The repository and author come from the workspace root, which is the
 * only manifest that carries them.
 *
 * Both files are read synchronously at module load: they are small, every
 * render needs them, and nothing here can change while the process is running,
 * so a promise would only have to be threaded through the whole layout.
 */

type Manifest = {
  name?: string;
  version?: string;
  author?: string;
  repository?: { url?: string };
};

const readManifest = (relativePath: string): Manifest =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8'),
  ) as Manifest;

/** `git+https://github.com/mixedrays/keyrove.git` → a URL a browser can open. */
const toBrowserUrl = (url: string) =>
  url.replace(/^git\+/, '').replace(/\.git$/, '');

/**
 * `mixedrays <mixedrays@gmail.com>` → `mixedrays`.
 *
 * npm's author field carries an address; the site links to a GitHub profile
 * instead, so the address stays out of the generated HTML.
 */
const toAuthorName = (author: string) => author.replace(/\s*<.*$/, '').trim();

const docs = readManifest('../package.json');
const workspace = readManifest('../../../package.json');
// The published library, which is the one an npm link should point at — the
// docs package is private and its name is not a package name.
const library = readManifest('../../keyrove/package.json');

/**
 * Where the site is deployed.
 *
 * Canonical tags, Open Graph, the sitemap and llms.txt all need absolute URLs,
 * and nothing in a static build can work out its own origin. Overridable so a
 * preview deploy describes itself rather than claiming to be production.
 */
const siteUrl = (
  process.env.DOCS_SITE_URL ?? 'https://keyrove.pages.dev'
).replace(/\/$/, '');

const repoUrl = toBrowserUrl(workspace.repository?.url ?? '');
const author = toAuthorName(workspace.author ?? '');
const version = docs.version ?? '';
const packageName = library.name ?? '';

if (repoUrl === '' || author === '' || version === '' || packageName === '') {
  throw new Error(
    '[docs] a package.json is missing its name, version, repository or author.',
  );
}

export const META = {
  version,
  siteUrl,
  repoUrl,
  /** The repository without its scheme, e.g. `github.com/mixedrays/keyrove`. */
  repoLabel: repoUrl.replace(/^https?:\/\//, ''),
  author,
  authorUrl: `https://github.com/${author}`,
  packageName,
  npmUrl: `https://www.npmjs.com/package/${packageName}`,
} as const;

/**
 * The placeholder the About page writes, alone on its line.
 *
 * The facts expand to markdown rather than to HTML so that one expansion
 * serves both the rendered page and its `.md` twin — anything fetching
 * `/docs/about.md` gets the version and the links, not an empty `<div>`.
 */
const PLACEHOLDER = /^<div data-about><\/div>$/gm;

const renderFacts = () =>
  [
    `- **Package** — [${META.packageName}](${META.npmUrl}) on npm`,
    `- **Docs version** — ${META.version}`,
    `- **Repository** — [${META.repoLabel}](${META.repoUrl})`,
    `- **Author** — [@${META.author}](${META.authorUrl})`,
  ].join('\n');

/** Replaces the About placeholder with the manifests' facts. */
export const expandMeta = (body: string): string =>
  body.replace(PLACEHOLDER, renderFacts);
