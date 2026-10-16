import path from 'node:path';

import type { Plugin } from 'vite';

import {
  CONTENT_DIR,
  loadPages,
  toNav,
  toReadingOrder,
  type NavGroup,
  type Page,
} from './build/content.ts';
import { loadDemos } from './build/demos.ts';
import { toHead } from './build/head.ts';
import { faviconSvg } from './build/icons.ts';
import { META } from './build/meta.ts';
import { renderPage, type RenderedPage } from './build/page-render.ts';
import { FAVICON_FILE, toMarkdownPath } from './build/paths.ts';
import {
  toLlmsFullTxt,
  toLlmsTxt,
  toRobotsTxt,
  toSitemap,
} from './build/plaintext.ts';
import { toSearchIndex } from './build/search.ts';

/**
 * Hands `content/**\/*.md` to the TanStack Start app as modules.
 *
 * Three virtual modules carry the site, and nothing is generated into the
 * source tree:
 *
 * - `virtual:docs/site` — the sidebar, the reading order, what each page says
 *   about itself, and a lazy import per page. Small, and in every bundle.
 * - `virtual:docs/page/<route>` — one page's rendered markdown, as the tree
 *   build/html-tree.ts makes of it, its headings and its `<head>`. A chunk of its own, so the browser fetches a page's body
 *   when it navigates there and never the other twenty-five.
 * - `virtual:docs/files` — every file the site serves that is not a page: the
 *   `.md` twins, llms.txt, the sitemap. Only the server routes import it, and
 *   the prerender writes what they answer into the build.
 *
 * Markdown runs through the same renderer in dev and in the build. In dev an
 * edit to a content file drops the cache and reloads the page; nothing else
 * needs to know a file changed.
 */

const SITE_ID = 'virtual:docs/site';
const PAGE_PREFIX = 'virtual:docs/page/';
const FILES_ID = 'virtual:docs/files';

/** Rollup's convention for a module that is not on disk. */
const RESOLVED = '\0';

/**
 * Cloudflare Pages looks for `404.html` on an unmatched route, which is what
 * the page at this route is prerendered to. Without it every dead URL answers
 * 200 with the landing page — a soft 404, and the same content indexed under
 * every wrong address.
 */
const NOT_FOUND_ROUTE = '404';

type Site = {
  pages: Page[];
  nav: NavGroup[];
  readingOrder: Page[];
  /**
   * Every page, parsed once when the site loads. Its HTML tree is rendered the
   * first time a page module asks for it, and kept.
   */
  byRoute: Map<string, RenderedPage>;
};

/** A generated file, keyed by the path it is served at. */
type Generated = { type: string; body: string };

const loadSite = async (): Promise<Site> => {
  const [pages, demos] = await Promise.all([loadPages(), loadDemos()]);
  const nav = toNav(pages);

  if (!pages.some((page) => page.route === NOT_FOUND_ROUTE)) {
    throw new Error(
      `[docs] content/${NOT_FOUND_ROUTE}.md is missing; Pages needs a ${NOT_FOUND_ROUTE}.html to answer dead URLs.`,
    );
  }

  return {
    pages,
    nav,
    readingOrder: toReadingOrder(nav),
    byRoute: new Map(
      pages.map((page) => [page.route, renderPage(page, demos)]),
    ),
  };
};

/** Every path the build prerenders: each page, its `.md` twin, and the generated files. */
export const listPrerenderPaths = async (): Promise<string[]> => {
  const pages = await loadPages();

  return [
    ...pages.flatMap((page) => [
      `/${page.route}`,
      `/${toMarkdownPath(page.route)}`,
    ]),
    ...GENERATED_FILES.map((file) => `/${file}`),
  ];
};

/** The non-page files, listed once so the prerender asks for exactly these. */
const GENERATED_FILES = [
  'search-index.json',
  'llms.txt',
  'llms-full.txt',
  'sitemap.xml',
  'robots.txt',
  FAVICON_FILE,
];

const toGenerated = (site: Site, base: string): Record<string, Generated> => {
  const landing = site.pages.find((page) => page.layout === 'landing');
  const rendered = (page: Page) => site.byRoute.get(page.route)!;

  const files: Record<string, Generated> = {
    'search-index.json': {
      type: 'application/json',
      body: toSearchIndex(site.pages.map(rendered)),
    },
    'llms.txt': {
      type: 'text/plain',
      body: toLlmsTxt(landing, site.nav, base),
    },
    'llms-full.txt': {
      type: 'text/plain',
      body: toLlmsFullTxt(landing, site.readingOrder.map(rendered), base),
    },
    'sitemap.xml': {
      type: 'application/xml',
      body: toSitemap(site.pages, base),
    },
    'robots.txt': { type: 'text/plain', body: toRobotsTxt(base) },
    [FAVICON_FILE]: { type: 'image/svg+xml', body: faviconSvg },
  };

  for (const page of site.pages) {
    files[toMarkdownPath(page.route)] = {
      type: 'text/markdown',
      body: rendered(page).markdown,
    };
  }

  return files;
};

/** Where the source markdown lives, for the "View source" link. */
const SOURCE_BASE = `${META.repoUrl}/blob/main/packages/docs/content`;

/**
 * What the chrome needs from a page without its body: enough to list it in the
 * sidebar, title the pager, and link to its source.
 */
const toPageInfo = (page: Page) => ({
  route: page.route,
  title: page.title,
  description: page.description,
  layout: page.layout,
  noindex: page.noindex,
  // From the file rather than the route: `docs/examples/index.md` is served
  // at `docs/examples`, and the route alone would name a file that is not there.
  sourceUrl: `${SOURCE_BASE}/${path.relative(CONTENT_DIR, page.file)}`,
});

const toSiteModule = (site: Site, base: string) => {
  const data = {
    meta: {
      packageVersion: META.packageVersion,
      repoUrl: META.repoUrl,
      npmUrl: META.npmUrl,
    },
    nav: site.nav.map((group) => ({
      label: group.label,
      pages: group.pages.map((page) => page.route),
      links: group.links,
    })),
    pages: Object.fromEntries(
      site.pages.map((page) => [page.route, toPageInfo(page)]),
    ),
    readingOrder: site.readingOrder.map((page) => page.route),
    // The not-found page's head, for the root route to show at any URL the
    // router has no page for — it has no loader of its own to fetch it with.
    notFound: {
      route: NOT_FOUND_ROUTE,
      head: toHead(site.byRoute.get(NOT_FOUND_ROUTE)!.page, site.nav, base),
    },
  };

  const loaders = site.pages
    .map(
      (page) =>
        `  ${JSON.stringify(page.route)}: () => import(${JSON.stringify(PAGE_PREFIX + page.route)}),`,
    )
    .join('\n');

  return [
    ...Object.entries(data).map(
      ([name, value]) => `export const ${name} = ${JSON.stringify(value)};`,
    ),
    `export const loaders = {\n${loaders}\n};`,
  ].join('\n');
};

export const docsContent = (): Plugin => {
  let base = '/';
  let site: Promise<Site> | undefined;

  const getSite = () => (site ??= loadSite());

  const toPageModule = async (route: string) => {
    const { byRoute, nav } = await getSite();
    const rendered = byRoute.get(route);
    if (!rendered) throw new Error(`[docs] no page at the route "/${route}".`);

    // The tree is rendered once and kept, so the second environment to load
    // this module does not run Shiki over the page again.
    return `export default ${JSON.stringify({
      tree: await rendered.tree(),
      headings: rendered.headings,
      head: toHead(rendered.page, nav, base),
    })};`;
  };

  return {
    name: 'keyrove-docs-content',

    configResolved(config) {
      base = config.base;
    },

    resolveId(id) {
      if (id === SITE_ID || id === FILES_ID || id.startsWith(PAGE_PREFIX)) {
        return RESOLVED + id;
      }
    },

    async load(id) {
      if (!id.startsWith(RESOLVED)) return;
      const virtual = id.slice(RESOLVED.length);

      if (virtual === SITE_ID) return toSiteModule(await getSite(), base);

      if (virtual === FILES_ID) {
        const files = toGenerated(await getSite(), base);
        return `export const files = ${JSON.stringify(files)};`;
      }

      if (virtual.startsWith(PAGE_PREFIX)) {
        return toPageModule(virtual.slice(PAGE_PREFIX.length));
      }
    },

    configureServer(server) {
      // Markdown is not a module in the graph, so an edit produces no HMR
      // update of its own — drop the caches and reload the page instead.
      server.watcher.add(CONTENT_DIR);
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(CONTENT_DIR)) return;

        site = undefined;

        for (const environment of Object.values(server.environments)) {
          const graph = environment.moduleGraph;
          for (const [moduleId, node] of graph.idToModuleMap) {
            if (moduleId.startsWith(`${RESOLVED}virtual:docs/`)) {
              graph.invalidateModule(node);
            }
          }
        }

        server.ws.send({ type: 'full-reload' });
      });
    },
  };
};
