import path from 'node:path';

import type { Plugin } from 'vite';

import {
  createAddresses,
  GENERATED_FILES,
  pagePath,
  twinPath,
  type Addresses,
  type GeneratedFile,
} from './build/addresses.ts';
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
import {
  toLlmsFullTxt,
  toLlmsTxt,
  toRobotsTxt,
  toSitemap,
} from './build/plaintext.ts';
import { toSearchIndex } from './build/search.ts';

/**
 * Virtual modules; nothing is generated into the source tree:
 *
 * - `virtual:docs/site`: sidebar, reading order and a lazy import per page.
 * - `virtual:docs/page/<route>`: one page, its own chunk, fetched on navigation.
 * - `virtual:docs/files`: `.md` twins, llms.txt, sitemap. Server routes only.
 */

const SITE_ID = 'virtual:docs/site';
const PAGE_PREFIX = 'virtual:docs/page/';
const FILES_ID = 'virtual:docs/files';

/** Rollup's convention for a module that is not on disk. */
const RESOLVED = '\0';

// Cloudflare Pages serves `404.html` on an unmatched route; without it every
// dead URL is a soft 404 with the landing page.
const NOT_FOUND_ROUTE = '404';

type Site = {
  pages: Page[];
  nav: NavGroup[];
  readingOrder: Page[];
  /** Parsed on load; each HTML tree is rendered on first ask and kept. */
  byRoute: Map<string, RenderedPage>;
};

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

export const listPrerenderPaths = async (): Promise<string[]> => {
  const pages = await loadPages();

  return [
    ...pages.flatMap((page) => [pagePath(page.route), twinPath(page.route)]),
    ...Object.values(GENERATED_FILES).map((file) => file.path),
  ];
};

const toGenerated = (
  site: Site,
  addresses: Addresses,
): Record<string, Generated> => {
  const landing = site.pages.find((page) => page.layout === 'landing');
  const rendered = (page: Page) => site.byRoute.get(page.route)!;

  // A file declared in the registry without a body here doesn't typecheck.
  const bodies: Record<GeneratedFile, string> = {
    searchIndex: toSearchIndex(site.pages.map(rendered)),
    llmsTxt: toLlmsTxt(landing, site.nav, addresses),
    llmsFullTxt: toLlmsFullTxt(
      landing,
      site.readingOrder.map(rendered),
      addresses,
    ),
    sitemap: toSitemap(site.pages, addresses),
    robotsTxt: toRobotsTxt(addresses),
    favicon: faviconSvg,
  };

  const files: Record<string, Generated> = {};

  for (const [name, { path, type }] of Object.entries(GENERATED_FILES)) {
    files[path] = { type, body: bodies[name as GeneratedFile] };
  }

  for (const page of site.pages) {
    files[twinPath(page.route)] = {
      type: 'text/markdown',
      body: rendered(page).markdown,
    };
  }

  return files;
};

const SOURCE_BASE = `${META.repoUrl}/blob/main/apps/docs/content`;

const toPageInfo = (page: Page) => ({
  route: page.route,
  title: page.title,
  description: page.description,
  layout: page.layout,
  noindex: page.noindex,
  // Not the route: `docs/examples/index.md` is served at `docs/examples`.
  sourceUrl: `${SOURCE_BASE}/${path.relative(CONTENT_DIR, page.file)}`,
});

const toSiteModule = (site: Site, addresses: Addresses) => {
  const data = {
    meta: {
      packageVersion: META.packageVersion,
      docsVersion: META.version,
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
    // The root route shows it at unknown URLs, with no loader to fetch it.
    notFound: {
      route: NOT_FOUND_ROUTE,
      head: toHead(
        site.byRoute.get(NOT_FOUND_ROUTE)!.page,
        site.nav,
        addresses,
      ),
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
  let addresses = createAddresses({ base: '/', siteUrl: META.siteUrl });
  let site: Promise<Site> | undefined;

  const getSite = () => (site ??= loadSite());

  const toPageModule = async (route: string) => {
    const { byRoute, nav } = await getSite();
    const rendered = byRoute.get(route);
    if (!rendered) throw new Error(`[docs] no page at the route "/${route}".`);

    // Kept, so the second environment doesn't run Shiki again.
    return `export default ${JSON.stringify({
      tree: await rendered.tree(),
      headings: rendered.headings,
      head: toHead(rendered.page, nav, addresses),
    })};`;
  };

  return {
    name: 'keyrove-docs-content',

    configResolved(config) {
      addresses = createAddresses({ base: config.base, siteUrl: META.siteUrl });
    },

    resolveId(id) {
      if (id === SITE_ID || id === FILES_ID || id.startsWith(PAGE_PREFIX)) {
        return RESOLVED + id;
      }
    },

    async load(id) {
      if (!id.startsWith(RESOLVED)) return;
      const virtual = id.slice(RESOLVED.length);

      if (virtual === SITE_ID) return toSiteModule(await getSite(), addresses);

      if (virtual === FILES_ID) {
        const files = toGenerated(await getSite(), addresses);
        return `export const files = ${JSON.stringify(files)};`;
      }

      if (virtual.startsWith(PAGE_PREFIX)) {
        return toPageModule(virtual.slice(PAGE_PREFIX.length));
      }
    },

    configureServer(server) {
      // Markdown isn't in the module graph, so an edit gets no HMR update.
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
