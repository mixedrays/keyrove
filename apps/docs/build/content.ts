import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';

import { GENERATED_FILES } from './addresses.ts';
import { loadLastModified } from './git.ts';

export const CONTENT_DIR = fileURLToPath(
  new URL('../content/', import.meta.url),
);

export type Layout = 'docs' | 'landing';

export type Page = {
  /** No leading or trailing slash: `''` for the landing page. */
  route: string;
  /** Absolute path of the source file, for the dev server's watcher. */
  file: string;
  title: string;
  description: string;
  /**
   * Verbatim `<title>`, for the landing page: its name is the wordmark, and
   * its description is too long for a search result.
   */
  titleTag: string | null;
  body: string;
  layout: Layout;
  /** Sidebar section. Pages without one stay out of the docs nav entirely. */
  group: string | null;
  /** Sort key within the group; also orders the groups, by their lowest value. */
  order: number;
  /** JSON-LD `keywords`; empty leaves them out. */
  keywords: string[];
  /** For pages that aren't destinations, like the 404 body. */
  noindex: boolean;
  /** Last commit, ISO 8601, for the sitemap's `lastmod`; `null` if unknown. */
  lastModified: string | null;
};

/** A sidebar entry with no page behind it — see EXTRA_LINKS. */
export type NavLink = { label: string; href: string };

export type NavGroup = { label: string; pages: Page[]; links: NavLink[] };

// llms.txt is generated, so no markdown file carries its frontmatter. Kept
// out of the reading order.
const EXTRA_LINKS: Record<string, NavLink[]> = {
  Guide: [{ label: 'llms.txt', href: GENERATED_FILES.llmsTxt.path }],
};

const readString = (data: Record<string, unknown>, key: string) => {
  const value = data[key];
  return typeof value === 'string' ? value : undefined;
};

// Throws on anything else: `keywords: grid, rtl` is one string, not two.
const readStringList = (
  data: Record<string, unknown>,
  key: string,
  relativePath: string,
) => {
  const value = data[key];
  if (value === undefined) return [];

  if (
    !Array.isArray(value) ||
    !value.every((item): item is string => typeof item === 'string')
  ) {
    throw new Error(
      `[docs] ${relativePath}: frontmatter ${key} should be a list of strings.`,
    );
  }

  return value;
};

const toRoute = (relativePath: string) =>
  relativePath
    .replace(/\.md$/, '')
    .replace(/(^|\/)index$/, '')
    .replace(/^\/|\/$/g, '');

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

const loadPage = async (
  relativePath: string,
  lastModified: Map<string, string>,
): Promise<Page> => {
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
    titleTag: readString(data, 'titleTag') ?? null,
    body: content.trim(),
    layout,
    group: readString(data, 'group') ?? null,
    order:
      typeof data.order === 'number' ? data.order : Number.MAX_SAFE_INTEGER,
    keywords: readStringList(data, 'keywords', relativePath),
    noindex: data.noindex === true,
    lastModified: lastModified.get(file) ?? null,
  };
};

export const loadPages = async (): Promise<Page[]> => {
  const [files, lastModified] = await Promise.all([
    listMarkdown(CONTENT_DIR),
    loadLastModified(CONTENT_DIR),
  ]);
  const pages = await Promise.all(
    files.map((file) => loadPage(file, lastModified)),
  );

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

// Groups sort by their lowest `order`, so there's no separate list to keep.
export const toNav = (pages: Page[]): NavGroup[] => {
  const groups = new Map<string, Page[]>();

  for (const page of pages) {
    if (page.group === null) continue;
    const existing = groups.get(page.group);
    if (existing) existing.push(page);
    else groups.set(page.group, [page]);
  }

  // Renaming a group in frontmatter alone would silently drop its extra links.
  for (const label of Object.keys(EXTRA_LINKS)) {
    if (groups.has(label)) continue;

    throw new Error(
      `[docs] EXTRA_LINKS names a "${label}" group, but no page is in one.`,
    );
  }

  return [...groups]
    .map(([label, groupPages]) => ({
      label,
      pages: [...groupPages].sort((a, b) => a.order - b.order),
      links: EXTRA_LINKS[label] ?? [],
    }))
    .sort((a, b) => a.pages[0].order - b.pages[0].order);
};

export const toReadingOrder = (nav: NavGroup[]): Page[] =>
  nav.flatMap((group) => group.pages);
