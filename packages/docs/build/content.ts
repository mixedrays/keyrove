import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';

/**
 * The content model: every page on the site is one markdown file.
 *
 * Nothing here renders anything — this module answers "what pages exist, what
 * do they claim about themselves, and how do they group in the sidebar", and
 * the render step in `layout.ts` takes it from there.
 */

export const CONTENT_DIR = fileURLToPath(
  new URL('../content/', import.meta.url),
);

export type Layout = 'docs' | 'landing';

export type Page = {
  /**
   * The URL path with no leading or trailing slash: `''` for the landing page,
   * `docs/examples/basic` for `content/docs/examples/basic.md`. Every other
   * path on the site — the page's directory, its `.md` twin, its links to its
   * siblings — is derived from this.
   */
  route: string;
  /** Absolute path of the source file, for the dev server's watcher. */
  file: string;
  title: string;
  description: string;
  /** Markdown body with the frontmatter block already stripped. */
  body: string;
  layout: Layout;
  /** Sidebar section. Pages without one stay out of the docs nav entirely. */
  group: string | null;
  /** Sort key within the group; also orders the groups, by their lowest value. */
  order: number;
};

export type NavGroup = { label: string; pages: Page[] };

/** Frontmatter is authored by hand, so treat every field as missing until proven otherwise. */
const readString = (data: Record<string, unknown>, key: string) => {
  const value = data[key];
  return typeof value === 'string' ? value : undefined;
};

const toRoute = (relativePath: string) =>
  relativePath
    .replace(/\.md$/, '')
    // `content/index.md` is the site root, and any `index.md` in a directory is
    // that directory — neither should end up with `/index` in its URL.
    .replace(/(^|\/)index$/, '')
    .replace(/^\/|\/$/g, '');

/** Every `.md` under `content/`, as paths relative to it, in a stable order. */
const listMarkdown = async (dir: string, prefix = ''): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith('_'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (entry) => {
        const relativePath = `${prefix}${entry.name}`;

        if (entry.isDirectory()) {
          return listMarkdown(path.join(dir, entry.name), `${relativePath}/`);
        }

        return entry.name.endsWith('.md') ? [relativePath] : [];
      }),
  );

  return nested.flat();
};

const loadPage = async (relativePath: string): Promise<Page> => {
  const file = path.join(CONTENT_DIR, relativePath);
  const { data, content } = matter(await readFile(file, 'utf8'));

  const title = readString(data, 'title');
  if (title === undefined) {
    throw new Error(`[docs] ${relativePath} is missing a frontmatter title.`);
  }

  const layout = readString(data, 'layout') === 'landing' ? 'landing' : 'docs';

  return {
    route: toRoute(relativePath),
    file,
    title,
    description: readString(data, 'description') ?? '',
    body: content.trim(),
    layout,
    group: readString(data, 'group') ?? null,
    order:
      typeof data.order === 'number' ? data.order : Number.MAX_SAFE_INTEGER,
  };
};

export const loadPages = async (): Promise<Page[]> => {
  const files = await listMarkdown(CONTENT_DIR);
  const pages = await Promise.all(files.map(loadPage));

  const seen = new Map<string, string>();
  for (const page of pages) {
    const clash = seen.get(page.route);
    if (clash !== undefined) {
      throw new Error(
        `[docs] ${page.file} and ${clash} both resolve to the route "/${page.route}".`,
      );
    }
    seen.set(page.route, page.file);
  }

  return pages.sort(
    (a, b) => a.order - b.order || a.route.localeCompare(b.route),
  );
};

/**
 * The sidebar: pages that declare a `group`, bucketed by it.
 *
 * Group order follows the lowest `order` in each group rather than a separate
 * list to maintain — moving a page's number moves its section with it when it
 * is the section's first page.
 */
export const toNav = (pages: Page[]): NavGroup[] => {
  const groups = new Map<string, Page[]>();

  for (const page of pages) {
    if (page.group === null) continue;
    const existing = groups.get(page.group);
    if (existing) existing.push(page);
    else groups.set(page.group, [page]);
  }

  return [...groups]
    .map(([label, groupPages]) => ({
      label,
      pages: [...groupPages].sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.pages[0].order - b.pages[0].order);
};

/** The sidebar order, flattened — what prev/next at the foot of a page walk. */
export const toReadingOrder = (nav: NavGroup[]): Page[] =>
  nav.flatMap((group) => group.pages);
