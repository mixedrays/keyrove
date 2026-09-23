import path from 'node:path';

import { CONTENT_DIR, type NavGroup, type Page } from './content.ts';
import { icon } from './icons.ts';
import type { Heading } from './markdown.ts';
import { META } from './meta.ts';
import { renderStructuredData } from './structured-data.ts';

/**
 * The HTML around a rendered markdown body: header, sidebar, "On this page"
 * rail, pager, footer.
 *
 * Every one of these is emitted at build time rather than assembled in the
 * browser, so a page arrives complete — no nav flash, and the sidebar is real
 * markup for crawlers and for anyone reading with scripting off.
 */

/** Where the source markdown lives, for the "View source" link. */
const SOURCE_BASE = `${META.repoUrl}/blob/main/packages/docs/content`;

/** The site icon, emitted at the root beside `robots.txt`. */
export const FAVICON_FILE = 'favicon.svg';

/**
 * Placeholders the shell in index.html reserves.
 *
 * Vite builds that file once — bundling the entry, hashing the assets, and
 * leaving these untouched — and every page is then stamped out of the result,
 * so all pages share one script URL without this module having to know what
 * it turned out to be. The stylesheet is the exception: which one a page links
 * depends on the page, so its URL is passed in rather than read off the shell.
 */
const SLOTS = {
  head: '<!--page-head-->',
  styles: '<!--page-styles-->',
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
 * `dist/docs/api.html`) so that appending `.md` lands on the source
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
          <button type="button" class="search-trigger" data-search-open hidden
            aria-label="Search documentation" aria-haspopup="dialog" aria-controls="docs-search"
            aria-keyshortcuts="Meta+k Control+k">
            ${icon('search', 'size-4')}
            <span class="hidden lg:inline">Search</span>
            <kbd class="hidden sm:inline" data-search-shortcut>Ctrl K</kbd>
          </button>
          <nav class="hidden items-center gap-4 text-sm md:flex md:gap-6">
            ${link(resolveHref('/docs/introduction'), `${icon('book', 'size-4')}Docs`, 'header-link')}
            ${link(resolveHref('/docs/examples'), `${icon('grid', 'size-4')}Examples`, 'header-link')}
            ${link(resolveHref('/docs/api'), `${icon('braces', 'size-4')}API`, 'header-link')}
            ${link(META.repoUrl, `${icon('github', 'size-4')}GitHub`, 'header-link')}
            <!-- A hair smaller than its neighbours: the npm mark is a solid
                 block where the rest of the set is drawn in outline, so at a
                 matching size it reads heavier than everything beside it. -->
            ${link(META.npmUrl, `${icon('npm', 'size-3.5')}npm`, 'header-link')}
          </nav>
          <!-- The nav is hidden on narrow screens, so the repo keeps an
               icon-only stop in the header there rather than dropping out of
               it entirely. -->
          ${link(META.repoUrl, icon('github', 'size-4'), 'icon-button md:hidden', ' aria-label="keyrove on GitHub"')}
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

const renderSearch =
  () => `<dialog id="docs-search" class="search-dialog" aria-labelledby="search-title">
  <div class="search-panel">
    <h2 id="search-title" class="sr-only">Search documentation</h2>
    <div class="search-input-row">
      ${icon('search', 'size-5')}
      <label for="search-input" class="sr-only">Search documentation</label>
      <input id="search-input" type="text" autofocus
        placeholder="Search documentation…" autocomplete="off" spellcheck="false"
        aria-describedby="search-help" enterkeyhint="go" />
      <button type="button" class="icon-button" data-search-close aria-label="Close search">
        ${icon('close', 'size-4')}
      </button>
    </div>
    <!-- keyrove moves focus to native links; the input is not a combobox. -->
    <ul id="search-results" class="search-results" aria-label="Search results"></ul>
    <p class="search-status" data-search-status role="status" aria-live="polite" aria-atomic="true"></p>
    <button type="button" class="search-retry" data-search-retry hidden>Retry search</button>
    <p id="search-help" class="search-help"><span><kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> to select</span><span><kbd class="kbd">Enter</kbd> to open</span><span><kbd class="kbd">Esc</kbd> to close</span></p>
  </div>
</dialog>`;

const renderSidebar = (
  nav: NavGroup[],
  current: Page,
  resolveHref: HrefResolver,
) => {
  const groups = nav
    .map((group) => {
      // Pages first, then whatever the group carries that is not one — the
      // generated llms.txt, which has no route to mark as current.
      const items = [
        ...group.pages.map((page) =>
          link(
            resolveHref(routeToPath(page.route)),
            escapeHtml(page.title),
            'sidebar-link',
            page.route === current.route ? ' aria-current="page"' : '',
          ),
        ),
        ...group.links.map((entry) =>
          link(
            resolveHref(entry.href),
            escapeHtml(entry.label),
            'sidebar-link',
          ),
        ),
      ];

      return `<div class="sidebar-group">
            <p class="sidebar-heading">${escapeHtml(group.label)}</p>
            <ul>
              ${items.map((item) => `<li>${item}</li>`).join('\n              ')}
            </ul>
          </div>`;
    })
    .join('\n          ');

  return `<div class="sidebar-backdrop" data-sidebar-close hidden></div>
        <aside id="docs-sidebar" class="sidebar">
          <nav class="sidebar-nav" aria-label="Docs">
          ${groups}
          </nav>
        </aside>`;
};

const renderToc = (headings: Heading[]) => {
  // Nothing to list on a page with no headings, and the rail carries nothing
  // else, so it is left out of the markup entirely rather than sitting empty.
  if (headings.length === 0) return '';

  return `<aside class="toc" aria-labelledby="docs-toc-heading">
          <div class="toc-inner">
            <p id="docs-toc-heading" class="toc-heading">On this page</p>
            <ul class="toc-list">
              ${headings
                .map(
                  (heading) =>
                    `<li><a href="#${heading.id}" class="toc-link" data-toc-link data-level="${heading.level}">${escapeHtml(heading.text)}</a></li>`,
                )
                .join('\n              ')}
            </ul>
          </div>
        </aside>`;
};

/**
 * The page's own source, in three forms: the markdown twin, the same file on
 * the clipboard, and the file in the repo.
 *
 * These sit between the title and the lead rather than at the foot of the "On
 * this page" rail, which is hidden below `xl` — where they used to live, a
 * narrow screen lost them along with the rail.
 */
const renderPageActions = (page: Page, resolveHref: HrefResolver) => {
  const markdownHref = resolveHref(`${routeToPath(page.route)}.md`);
  // From the file rather than the route: `docs/examples/index.md` is served
  // at `docs/examples`, and the route alone would name a file that is not there.
  const sourceHref = `${SOURCE_BASE}/${path.relative(CONTENT_DIR, page.file)}`;

  // Every label is wrapped, icons are not: the underline is drawn on the span
  // so it stops at the text instead of running under the glyph beside it.
  return `<div class="page-actions">
              ${link(markdownHref, `${icon('markdown', 'size-3.5')}<span>View as Markdown</span>`, 'page-action')}
              <button
                type="button"
                class="page-action"
                data-copy-markdown="${escapeHtml(markdownHref)}"
              >${icon('copy', 'size-3.5 icon-idle')}${icon('check', 'size-3.5 icon-done')}<span data-copy-label>Copy page</span></button>
              ${link(sourceHref, `${icon('github', 'size-3.5')}<span>View source</span>`, 'page-action')}
            </div>`;
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

/**
 * The foot of every page: what the package is, and the places a reader is
 * most likely to want next, including llms.txt, which is otherwise linked
 * only from the sidebar. The row takes the header's width, so the two frame
 * the same column.
 */
const renderFooter = (resolveHref: HrefResolver, page: Page) => {
  const rowClass =
    page.layout === 'landing' ? 'footer-row header-row-narrow' : 'footer-row';

  const links = [
    link(resolveHref('/docs/introduction'), 'Docs', 'footer-link'),
    link(resolveHref('/docs/examples'), 'Examples', 'footer-link'),
    link(resolveHref('/docs/api'), 'API', 'footer-link'),
    link(META.repoUrl, 'GitHub', 'footer-link'),
    link(META.npmUrl, 'npm', 'footer-link'),
    link(resolveHref('/llms.txt'), 'llms.txt', 'footer-link'),
  ];

  return `<footer class="site-footer">
      <div class="${rowClass}">
        <p class="footer-meta">
          ${link(resolveHref('/'), `${icon('keyboard', 'size-5')}keyrove`, 'wordmark')}
          <span>v${escapeHtml(META.packageVersion)} &middot; MIT licensed</span>
        </p>
        <nav class="footer-links" aria-label="Footer">
          ${links.join('\n          ')}
        </nav>
      </div>
    </footer>`;
};

export type PageRender = {
  page: Page;
  html: string;
  headings: Heading[];
  nav: NavGroup[];
  /** Sidebar order, flattened — the pager's prev/next come off this. */
  readingOrder: Page[];
  resolveHref: HrefResolver;
  /** The stylesheet's final URL — hashed in a build. */
  stylesheet: string;
};

/**
 * The stylesheet twice: a preload, then the link that applies it.
 *
 * The preload is for Cloudflare Pages rather than for the browser, which finds
 * the link on its own. Pages turns a page's `<link rel="preload">` tags into
 * `Link` headers and sends them as a 103 Early Hint, so the stylesheet is
 * already downloading while the HTML is still on its way.
 *
 * Neither tag carries `crossorigin`, which Vite puts on the tags it injects.
 * Pages skips any `<link>` with an attribute beyond `rel`, `href` and `as`, and
 * a preload only serves a request made in the same CORS mode, so the link has
 * to match it. The sheet is same-origin, so the attribute bought nothing.
 */
const renderStylesheet = (href: string) =>
  [
    `<link rel="preload" as="style" href="${escapeHtml(href)}" />`,
    `<link rel="stylesheet" href="${escapeHtml(href)}" />`,
  ].join('\n    ');

const renderDocsBody = ({
  page,
  html,
  headings,
  nav,
  readingOrder,
  resolveHref,
}: PageRender) => {
  const index = readingOrder.findIndex((entry) => entry.route === page.route);
  // A page outside the sidebar — the 404 — has no siblings to page between,
  // and index -1 would otherwise offer the first page as its "next".
  const pager =
    index === -1
      ? ''
      : renderPager(
          readingOrder[index - 1],
          readingOrder[index + 1],
          resolveHref,
        );

  return `${renderHeader(resolveHref, page)}
    <div class="docs-shell">
      ${renderSidebar(nav, page, resolveHref)}
        <main class="docs-main">
          <div class="markdown">
            <h1>${escapeHtml(page.title)}</h1>
            ${renderPageActions(page, resolveHref)}
            ${page.description ? `<p class="lead">${escapeHtml(page.description)}</p>` : ''}
            ${html}
          </div>
          ${pager}
        </main>
        ${renderToc(headings)}
    </div>
    ${renderFooter(resolveHref, page)}`;
};

const renderLandingBody = ({ page, html, resolveHref }: PageRender) =>
  `${renderHeader(resolveHref, page)}
    <main class="landing markdown">
      ${html}
    </main>
    ${renderFooter(resolveHref, page)}`;

/**
 * The social card, reused by every page: 1200x630, served from `public/`.
 *
 * One image rather than one per page — the card carries the library's name and
 * what it does, which is what an unfurled link needs to say whichever page was
 * shared.
 */
const OG_IMAGE = {
  path: '/og.png',
  width: 1200,
  height: 630,
  alt: 'keyrove — framework-agnostic keyboard navigation for lists, grids and trees.',
} as const;

const meta = (attribute: 'name' | 'property', key: string, content: string) =>
  `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;

/**
 * What a crawler and a link unfurler need: which URL is the canonical one, and
 * what to show when the page is shared.
 *
 * Every route has a `.md` twin at a sibling path, so which of the two is the
 * indexable one has to be said outright rather than left to be guessed. A page
 * marked `noindex` skips all of it and says so instead — it is served at every
 * dead URL, so it has no canonical URL of its own to claim.
 */
const renderIndexingTags = (
  { page, nav, resolveHref }: PageRender,
  title: string,
) => {
  if (page.noindex) return [meta('name', 'robots', 'noindex, follow')];

  const toUrl = (route: string) =>
    `${META.siteUrl}${resolveHref(routeToPath(route))}`;
  const url = toUrl(page.route);
  const image = `${META.siteUrl}${resolveHref(OG_IMAGE.path)}`;

  return [
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    meta(
      'property',
      'og:type',
      page.layout === 'landing' ? 'website' : 'article',
    ),
    meta('property', 'og:site_name', 'keyrove'),
    // The prose is American — "license", "color", "behavior". That is also
    // what an absent og:locale is taken to mean, so this only says it outright.
    meta('property', 'og:locale', 'en_US'),
    meta('property', 'og:title', title),
    meta('property', 'og:description', page.description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('property', 'og:image:width', String(OG_IMAGE.width)),
    meta('property', 'og:image:height', String(OG_IMAGE.height)),
    meta('property', 'og:image:alt', OG_IMAGE.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', page.description),
    meta('name', 'twitter:image', image),
    renderStructuredData({ page, nav, toUrl, imageUrl: image }),
  ];
};

/**
 * Comments explain the templates to whoever edits them; the browser has no use
 * for them. The shell in index.html and the header above carry ~1.5 KB of
 * rationale between them, and it would otherwise be sent 20 times over — once
 * per page — for about a tenth of each page's compressed weight.
 *
 * A regex is enough because nothing that reaches here opens a comment it does
 * not close: a code block showing markup arrives from shiki with its `<`
 * already escaped (`&#x3C;!--`), so an example that documents a comment keeps
 * it. Leading indentation and the trailing newline go too, so a comment that
 * had a line to itself does not leave a blank one behind.
 *
 * Runs after the slots are filled — they are comments themselves.
 */
const stripComments = (html: string) =>
  html.replace(/[ \t]*<!--[\s\S]*?-->\n?/g, '');

/** Stamps one page out of the built shell. */
export const renderPage = (template: string, render: PageRender) => {
  for (const slot of [SLOTS.styles, SLOTS.body]) {
    if (!template.includes(slot)) {
      throw new Error(`[docs] index.html is missing the ${slot} placeholder.`);
    }
  }

  const { page } = render;
  const body =
    page.layout === 'landing'
      ? renderLandingBody(render)
      : renderDocsBody(render);

  // Every page hangs its own name off the wordmark, except the landing page,
  // whose name is the wordmark — leaving it to describe itself at a length no
  // search result or link unfurl will show. `titleTag` in frontmatter is how
  // either falls back to a line written for the slot.
  const title =
    page.titleTag ??
    (page.layout === 'landing'
      ? `keyrove — ${page.description}`
      : `${page.title} — keyrove`);

  const head = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<link rel="icon" type="image/svg+xml" href="${escapeHtml(render.resolveHref(`/${FAVICON_FILE}`))}" />`,
    ...renderIndexingTags(render, title),
  ].join('\n    ');

  return stripComments(
    template
      .replace(SLOTS.head, head)
      .replace(SLOTS.styles, renderStylesheet(render.stylesheet))
      .replace(SLOTS.body, `${body}${renderSearch()}`),
  );
};
