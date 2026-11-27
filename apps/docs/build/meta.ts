import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Read from the manifests so prose can't go stale. Read synchronously: small,
// needed by every render, and unchanging while running.

type Manifest = {
  name?: string;
  version?: string;
  author?: string;
  repository?: { url?: string };
};

const readText = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

const readManifest = (relativePath: string): Manifest =>
  JSON.parse(readText(relativePath)) as Manifest;

/** `git+https://github.com/mixedrays/keyrove.git` → a URL a browser can open. */
const toBrowserUrl = (url: string) =>
  url.replace(/^git\+/, '').replace(/\.git$/, '');

// Keeps the email address out of the generated HTML.
const toAuthorName = (author: string) => author.replace(/\s*<.*$/, '').trim();

const docs = readManifest('../package.json');
const workspace = readManifest('../../../package.json');
// The docs package is private, so npm has no page for it.
const library = readManifest('../../../packages/keyrove/package.json');

// A static build can't know its origin. Overridable so a preview deploy
// doesn't claim to be production.
const siteUrl = (
  process.env.DOCS_SITE_URL ?? 'https://keyrove.pages.dev'
).replace(/\/$/, '');

const repoUrl = toBrowserUrl(workspace.repository?.url ?? '');
const author = toAuthorName(workspace.author ?? '');
const version = docs.version ?? '';
const packageName = library.name ?? '';
const packageVersion = library.version ?? '';

if (
  repoUrl === '' ||
  author === '' ||
  version === '' ||
  packageName === '' ||
  packageVersion === ''
) {
  throw new Error(
    '[docs] a package.json is missing its name, version, repository or author.',
  );
}

export const META = {
  version,
  /** On `main`, the branch the site deploys from. */
  versionUrl: `${repoUrl}/blob/main/apps/docs/package.json`,
  siteUrl,
  repoUrl,
  repoLabel: repoUrl.replace(/^https?:\/\//, ''),
  author,
  authorUrl: `https://github.com/${author}`,
  packageName,
  /** The library's version; `version` above is the docs package's. */
  packageVersion,
  npmUrl: `https://www.npmjs.com/package/${packageName}`,
} as const;

// Expands to markdown, so the `.md` twin gets the facts too.
const PLACEHOLDER = /^<div data-about><\/div>$/gm;

const renderFacts = () =>
  [
    // A lone "Docs version" would read as the release it documents.
    `- **Package** — [${META.packageName}](${META.npmUrl}) ${META.packageVersion} on npm`,
    `- **Docs version** — [${META.version}](${META.versionUrl}), numbered separately from the package`,
    `- **Repository** — [${META.repoLabel}](${META.repoUrl})`,
    `- **Author** — [@${META.author}](${META.authorUrl})`,
  ].join('\n');

// The file's first line becomes the heading; markdown rejoins the wrapped rest.
const LICENSE_PLACEHOLDER = /^<div data-license><\/div>$/gm;

const licenseText = readText('../../../packages/keyrove/LICENSE')
  .replace(/^.*\n/, '')
  .trim();

export const expandMeta = (body: string): string =>
  body
    .replace(PLACEHOLDER, renderFacts)
    .replace(LICENSE_PLACEHOLDER, () => licenseText);
