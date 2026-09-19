import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { loadPublished } from './npm.ts';

/**
 * The facts the site states about the project, read from the manifests and the
 * registry rather than written down a second time in prose that would go stale.
 *
 * The docs version is the docs package's own, so releasing the site is what
 * moves it. The repository and author come from the workspace root, which is
 * the only manifest that carries them. The library's version and size come
 * from npm (see npm.ts).
 *
 * All of it is loaded once, at module load — the manifests synchronously, the
 * registry behind a top-level await: every render needs them, and nothing here
 * can change while the process is running, so a promise would only have to be
 * threaded through the whole layout.
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
const localVersion = library.version ?? '';

if (
  repoUrl === '' ||
  author === '' ||
  version === '' ||
  packageName === '' ||
  localVersion === ''
) {
  throw new Error(
    '[docs] a package.json is missing its name, version, repository or author.',
  );
}

const published = await loadPublished(packageName);

export const META = {
  version,
  siteUrl,
  repoUrl,
  /** The repository without its scheme, e.g. `github.com/mixedrays/keyrove`. */
  repoLabel: repoUrl.replace(/^https?:\/\//, ''),
  author,
  authorUrl: `https://github.com/${author}`,
  packageName,
  /**
   * The published library's version, which is not `version` above — that one
   * is the docs package's, and the two move independently. npm's `latest`
   * when the registry answers, the workspace manifest's when it does not.
   */
  packageVersion: published?.version ?? localVersion,
  npmUrl: `https://www.npmjs.com/package/${packageName}`,
} as const;

/**
 * The placeholder the About page writes, alone on its line.
 *
 * The facts expand to markdown rather than to HTML so that one expansion
 * serves both the rendered page and its `.md` twin — anything fetching
 * `/docs/about.md` gets the version and the links, not an empty `<div>`.
 */
const ABOUT_PLACEHOLDER = /^<div data-about><\/div>$/gm;

const renderFacts = () =>
  [
    `- **Package** — [${META.packageName}](${META.npmUrl}) on npm`,
    `- **Docs version** — ${META.version}`,
    `- **Repository** — [${META.repoLabel}](${META.repoUrl})`,
    `- **Author** — [@${META.author}](${META.authorUrl})`,
  ].join('\n');

/**
 * A chip on the landing page that npm fills in, alone on its line inside the
 * `.hero-tags` list: `<li data-npm="version"></li>`.
 *
 * A fact npm did not supply takes its line with it. The version is never
 * filled in from the workspace manifest here, because that one can be a
 * release behind, and a chip that is missing reads better than one that is
 * wrong.
 */
const NPM_PLACEHOLDER = /^<li data-npm="(\w+)"><\/li>\n?/gm;

const kilobytes = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

const npmFacts: Record<string, string | undefined> = {
  version: published && `v${published.version}`,
  size:
    published?.gzipSize === undefined
      ? undefined
      : `${kilobytes.format(published.gzipSize / 1000)} kB gzipped`,
};

const renderNpmFact = (_match: string, fact: string) => {
  if (!(fact in npmFacts)) {
    throw new Error(`[docs] no npm fact is called "${fact}".`);
  }

  const text = npmFacts[fact];
  return text ? `<li>${text}</li>\n` : '';
};

/** Replaces the About placeholder and the landing page's npm chips. */
export const expandMeta = (body: string): string =>
  body
    .replace(ABOUT_PLACEHOLDER, renderFacts)
    .replace(NPM_PLACEHOLDER, renderNpmFact);
