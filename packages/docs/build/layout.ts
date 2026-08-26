import type { NavGroup, Page } from './content.ts';
import { icon } from './icons.ts';
import type { Heading } from './markdown.ts';

/**
 * The HTML around a rendered markdown body: header, sidebar, "On this page"
 * rail, pager, footer.
 *
 * Every one of these is emitted at build time rather than assembled in the
 * browser, so a page arrives complete — no nav flash, and the sidebar is real
 * markup for crawlers and for anyone reading with scripting off.
 */

export const GITHUB_URL = 'https://github.com/mixedrays/keyrove';

/** Where the source markdown lives, for the "Edit this page" link. */
const EDIT_BASE = `${GITHUB_URL}/edit/main/packages/docs/content`;

/**
 * Placeholders the shell in index.html reserves.
 *
 * Vite builds that file once — bundling the entry, hashing the assets, and
 * leaving these untouched — and every page is then stamped out of the result,
 * so all pages share one set of asset URLs without this module having to know
 * what those URLs turned out to be.
 */
const SLOTS = {
  head: '<!--page-head-->',
  body: '<!--page-body-->',
} as const;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Site-absolute hrefs, honouring the deploy base.
 *
 * Pages are served at extensionless URLs (`/docs/api`, from
 * `dist/docs/api/index.html`) so that appending `.md` lands on the source
 * beside it. Relative hrefs cannot be resolved consistently against a URL with
 * no trailing slash, hence absolute paths and an explicit base.
 */
export const createHrefResolver =
  (base: string) =>
  (href: string): string =>
    `${base}${href.replace(/^\//, '')}`;

export type HrefResolver = ReturnType<typeof createHrefResolver>;

/** `docs/examples/basic` → `/docs/examples/basic`; the landing page → `/`. */
export const routeToPath = (route: string) => `/${route}`;

const link = (href: string, label: string, className: string, extra = '') =>
  `<a href="${escapeHtml(href)}" class="${className}"${extra}>${label}</a>`;

const renderHeader = (resolveHref: HrefResolver, page: Page) => {
  // The sidebar toggle only has anything to open on a docs page.
  const menuButton =
    page.layout === 'docs'
      ? `<button
            type="button"
            data-sidebar-toggle
            aria-expanded="false"
            aria-controls="docs-sidebar"
            aria-label="Open navigation"
            class="icon-button lg:hidden"
          >${icon('menu', 'size-4')}</button>`
      : '';

  const rowClass =
    page.layout === 'landing' ? 'header-row header-row-narrow' : 'header-row';

  return `<header class="site-header">
      <div class="${rowClass}">
        <div class="flex items-center gap-2">
          ${menuButton}
          ${link(resolveHref('/'), `${icon('keyboard', 'size-6')}keyrove`, 'wordmark')}
        </div>
        <div class="flex items-center gap-1 sm:gap-4">
          <nav class="hidden items-center gap-4 text-sm sm:flex sm:gap-6">
            ${link(resolveHref('/docs/introduction'), `${icon('book', 'size-4')}Docs`, 'header-link')}
            ${link(resolveHref('/docs/examples/basic'), `${icon('grid', 'size-4')}Examples`, 'header-link')}
            ${link(resolveHref('/docs/api'), `${icon('braces', 'size-4')}API`, 'header-link')}
            ${link(GITHUB_URL, `${icon('github', 'size-4')}GitHub`, 'header-link')}
          </nav>
          <!-- The nav is hidden on narrow screens, so the repo keeps an
               icon-only stop in the header there rather than dropping out of
               it entirely. -->
          ${link(GITHUB_URL, icon('github', 'size-4'), 'icon-button sm:hidden', ' aria-label="keyrove on GitHub"')}
          <!-- Both glyphs ship; style.css shows one per theme. Picking in
               script would mean an empty button until the bundle ran, and the
               theme is not known until the inline head script has run anyway. -->
          <button
            type="button"
            data-theme-toggle
            class="icon-button"
            aria-label="Switch between light and dark theme"
          >${icon('sun', 'size-4 icon-light')}${icon('moon', 'size-4 icon-dark')}</button>
        </div>
      </div>
    </header>`;
};

const renderSidebar = (
  nav: NavGroup[],
  current: Page,
  resolveHref: HrefResolver,
) => {
  const groups = nav
    .map(
      (group) => `<div class="sidebar-group">
            <p class="sidebar-heading">${escapeHtml(group.label)}</p>
            <ul>
              ${group.pages
                .map((page) => {
                  const active = page.route === current.route;
                  return `<li>${link(
                    resolveHref(routeToPath(page.route)),
                    escapeHtml(page.title),
                    'sidebar-link',
                    active ? ' aria-current="page"' : '',
                  )}</li>`;
                })
                .join('\n              ')}
            </ul>
          </div>`,
    )
    .join('\n          ');

  return `<div class="sidebar-backdrop" data-sidebar-close hidden></div>
        <aside id="docs-sidebar" class="sidebar">
          <nav class="sidebar-nav" aria-label="Docs">
          ${groups}
          </nav>
        </aside>`;
};

const renderToc = (
  headings: Heading[],
  page: Page,
  resolveHref: HrefResolver,
) => {
  const markdownHref = resolveHref(`${routeToPath(page.route)}.md`);
  const editHref = `${EDIT_BASE}/${page.route === '' ? 'index' : page.route}.md`;

  const list =
    headings.length === 0
      ? ''
      : `<p class="toc-heading">On this page</p>
          <ul class="toc-list">
            ${headings
              .map(
                (heading) =>
                  `<li><a href="#${heading.id}" class="toc-link" data-toc-link data-level="${heading.level}">${escapeHtml(heading.text)}</a></li>`,
              )
              .join('\n            ')}
          </ul>`;

  return `<aside class="toc">
          <div class="toc-inner">
            ${list}
            <div class="toc-actions">
              ${link(markdownHref, `${icon('file', 'size-3.5')}View as Markdown`, 'toc-action')}
              <button
                type="button"
                class="toc-action"
                data-copy-markdown="${escapeHtml(markdownHref)}"
              >${icon('copy', 'size-3.5 icon-idle')}${icon('check', 'size-3.5 icon-done')}<span data-copy-label>Copy page</span></button>
              ${link(editHref, `${icon('pencil', 'size-3.5')}Edit this page`, 'toc-action')}
            </div>
          </div>
        </aside>`;
};

const renderPager = (
  prev: Page | undefined,
  next: Page | undefined,
  resolveHref: HrefResolver,
) => {
  if (!prev && !next) return '';

  const side = (page: Page | undefined, label: string, align: string) =>
    page
      ? link(
          resolveHref(routeToPath(page.route)),
          `<span class="pager-label">${label}</span><span class="pager-title">${escapeHtml(page.title)}</span>`,
          `pager-link ${align}`,
        )
      : '<span></span>';

  return `<nav class="pager" aria-label="Pagination">
            ${side(prev, 'Previous', 'items-start')}
            ${side(next, 'Next', 'items-end text-right')}
          </nav>`;
};

const renderFooter = () =>
  `<footer class="site-footer">
      MIT licensed &middot;
      <a href="${GITHUB_URL}" class="link">github.com/mixedrays/keyrove</a>
    </footer>`;

export type PageRender = {
  page: Page;
  html: string;
  headings: Heading[];
  nav: NavGroup[];
  /** Sidebar order, flattened — the pager's prev/next come off this. */
  readingOrder: Page[];
  resolveHref: HrefResolver;
};

const renderDocsBody = ({
  page,
  html,
  headings,
  nav,
  readingOrder,
  resolveHref,
}: PageRender) => {
  const index = readingOrder.findIndex((entry) => entry.route === page.route);

  return `${renderHeader(resolveHref, page)}
    <div class="docs-shell">
      ${renderSidebar(nav, page, resolveHref)}
        <main class="docs-main">
          <div class="markdown">
            <h1>${escapeHtml(page.title)}</h1>
            ${page.description ? `<p class="lead">${escapeHtml(page.description)}</p>` : ''}
            ${html}
          </div>
          ${renderPager(readingOrder[index - 1], readingOrder[index + 1], resolveHref)}
        </main>
        ${renderToc(headings, page, resolveHref)}
    </div>
    ${renderFooter()}`;
};

const renderLandingBody = ({ page, html, resolveHref }: PageRender) =>
  `${renderHeader(resolveHref, page)}
    <main class="landing markdown">
      ${html}
    </main>
    ${renderFooter()}`;

/** Stamps one page out of the built shell. */
export const renderPage = (template: string, render: PageRender) => {
  if (!template.includes(SLOTS.body)) {
    throw new Error(
      `[docs] index.html is missing the ${SLOTS.body} placeholder.`,
    );
  }

  const { page } = render;
  const body =
    page.layout === 'landing'
      ? renderLandingBody(render)
      : renderDocsBody(render);

  // The landing page's title is the wordmark on its own; every other page
  // hangs its own name off it.
  const title =
    page.layout === 'landing'
      ? `keyrove — ${page.description}`
      : `${page.title} — keyrove`;

  const head = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
  ].join('\n    ');

  return template.replace(SLOTS.head, head).replace(SLOTS.body, body);
};
