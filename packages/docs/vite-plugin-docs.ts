import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Plugin, ViteDevServer } from 'vite';

import {
  CONTENT_DIR,
  loadPages,
  toNav,
  toReadingOrder,
  type NavGroup,
  type Page,
} from './build/content.ts';
import { renderMarkdown } from './build/markdown.ts';
import { createHrefResolver, renderPage, routeToPath } from './build/layout.ts';
import { toLlmsTxt, toMarkdown, toMarkdownPath } from './build/plaintext.ts';

/**
 * Builds the site out of `content/**\/*.md`.
 *
 * One rendering path serves both modes. In dev a middleware renders on request,
 * so an edit to a markdown file is visible on reload with no build step; in
 * build the same renderer stamps every page into `dist` once Vite has bundled
 * the shell. Nothing is generated into the source tree in between.
 *
 * Each page is emitted twice — `dist/docs/api/index.html` for the browser and
 * `dist/docs/api.md` for anything reading the docs as text — which is what
 * makes every URL on the site work with `.md` appended.
 */

const LLMS_TXT = 'llms.txt';

type Site = {
  pages: Page[];
  nav: NavGroup[];
  readingOrder: Page[];
  byRoute: Map<string, Page>;
  /** Keyed by the emitted path, e.g. `docs/api.md`. */
  byMarkdownPath: Map<string, Page>;
};

const loadSite = async (): Promise<Site> => {
  const pages = await loadPages();
  const nav = toNav(pages);

  return {
    pages,
    nav,
    readingOrder: toReadingOrder(nav),
    byRoute: new Map(pages.map((page) => [page.route, page])),
    byMarkdownPath: new Map(
      pages.map((page) => [toMarkdownPath(page.route), page]),
    ),
  };
};

export const keyroveDocs = (): Plugin => {
  let base = '/';
  let root = '';
  let outDir = '';
  let site: Promise<Site> | undefined;

  const getSite = () => (site ??= loadSite());

  /** Renders one page into the shell, which Vite has already processed. */
  const render = async (page: Page, template: string) => {
    const resolveHref = createHrefResolver(base);
    const { html, headings } = await renderMarkdown(page.body, { resolveHref });
    const { nav, readingOrder } = await getSite();

    return renderPage(template, {
      page,
      html,
      headings,
      nav,
      readingOrder,
      resolveHref,
    });
  };

  /**
   * Strips the deploy base and any trailing slash off a request, so that
   * `/docs/api`, `/docs/api/` and (under a based deploy) `/keyrove/docs/api`
   * all resolve to the same page.
   */
  const toRoute = (url: string) => {
    const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
    const withoutBase = pathname.startsWith(base)
      ? pathname.slice(base.length)
      : pathname.replace(/^\//, '');

    return withoutBase.replace(/\/$/, '');
  };

  const serveDev = async (server: ViteDevServer, url: string) => {
    const { byRoute, byMarkdownPath, nav, pages } = await getSite();
    const route = toRoute(url);

    if (route === LLMS_TXT) {
      const landing = pages.find((page) => page.layout === 'landing');
      return { type: 'text/plain', body: toLlmsTxt(landing, nav, base) };
    }

    const markdownPage = byMarkdownPath.get(route);
    if (markdownPage) {
      return { type: 'text/markdown', body: toMarkdown(markdownPage) };
    }

    const page = byRoute.get(route);
    if (!page) return null;

    const template = await readFile(path.join(root, 'index.html'), 'utf8');
    // Runs the shell through Vite so the page gets the HMR client and the
    // entry's `/src/main.ts` resolves the same way it does for index.html.
    const shell = await server.transformIndexHtml(
      routeToPath(page.route),
      template,
    );

    return { type: 'text/html', body: await render(page, shell) };
  };

  return {
    name: 'keyrove-docs',

    configResolved(config) {
      base = config.base;
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },

    configureServer(server) {
      // Markdown is not a module in the graph, so an edit produces no HMR
      // update of its own — drop the cache and reload the page instead.
      server.watcher.add(CONTENT_DIR);
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(CONTENT_DIR)) return;

        site = undefined;
        server.ws.send({ type: 'full-reload' });
      });

      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();

        serveDev(server, req.url ?? '/')
          .then((result) => {
            // Anything the content model does not own — assets, the entry
            // module, Vite's own endpoints — carries on down the stack.
            if (!result) return next();

            res.setHeader('Content-Type', `${result.type}; charset=utf-8`);
            res.end(result.body);
          })
          .catch(next);
      });
    },

    /**
     * Vite builds `index.html` alone: one bundle, one stylesheet, one set of
     * hashed URLs. Every page is stamped out of the result here, so the asset
     * names never have to be threaded through the renderer.
     */
    async closeBundle() {
      const shellPath = path.join(outDir, 'index.html');
      const shell = await readFile(shellPath, 'utf8');
      const { pages, nav } = await getSite();

      const write = async (file: string, body: string) => {
        const target = path.join(outDir, file);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, body);
      };

      await Promise.all(
        pages.map(async (page) => {
          // Extensionless URLs, so that appending `.md` to any of them lands
          // on the markdown sitting beside it rather than inside it.
          const file =
            page.route === '' ? 'index.html' : `${page.route}/index.html`;

          await write(file, await render(page, shell));
          await write(toMarkdownPath(page.route), toMarkdown(page));
        }),
      );

      const landing = pages.find((page) => page.layout === 'landing');
      await write(LLMS_TXT, toLlmsTxt(landing, nav, base));

      this.info(
        `stamped ${pages.length} pages, their .md twins, and ${LLMS_TXT}`,
      );
    },
  };
};
