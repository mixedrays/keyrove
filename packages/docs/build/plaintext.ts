import type { NavGroup, Page } from './content.ts';
import { expandDemos, type Demos } from './demos.ts';
import { routeToPath } from './layout.ts';
import { expandMeta, META } from './meta.ts';

/**
 * The machine-readable half of the site: the markdown twins, llms.txt, and the
 * two files crawlers look for.
 *
 * Every page is served twice: as HTML at `/docs/api`, and as markdown at
 * `/docs/api.md`. The markdown is not the raw source file — frontmatter is
 * site plumbing, so it is replaced by the title and description it carried,
 * leaving a document that stands on its own when fetched in isolation.
 */

/**
 * A page as standalone markdown.
 *
 * Demos are expanded on the way out, so the markup a page documents reaches a
 * reader who never runs the site — the placeholder on its own carries none of
 * it.
 */
export const toMarkdown = (page: Page, demos: Demos) => {
  const heading = `# ${page.title}`;
  const lead = page.description === '' ? '' : `\n\n> ${page.description}`;
  const body = expandMeta(expandDemos(page.body, demos, 'markdown'));

  return `${heading}${lead}\n\n${body}\n`;
};

/** The `.md` twin of a page: `docs/api` → `docs/api.md`, the landing page → `index.md`. */
export const toMarkdownPath = (route: string) =>
  route === '' ? 'index.md' : `${route}.md`;

/**
 * llms.txt — an index pointing at each page's markdown.
 *
 * See https://llmstxt.org. Groups become sections in sidebar order, so the file
 * reads in the same sequence a person would work through the docs.
 */
export const toLlmsTxt = (
  landing: Page | undefined,
  nav: NavGroup[],
  base: string,
) => {
  const url = (route: string) =>
    `${META.siteUrl}${base}${toMarkdownPath(route)}`;

  const sections = nav.map((group) => {
    const entries = group.pages
      .map((page) => {
        const summary = page.description === '' ? '' : `: ${page.description}`;
        return `- [${page.title}](${url(page.route)})${summary}`;
      })
      .join('\n');

    return `## ${group.label}\n\n${entries}`;
  });

  const intro = landing?.description ?? '';

  const preamble = [
    '# keyrove',
    '',
    `> ${intro}`,
    '',
    'Every page on this site is also available as markdown by appending `.md` to its URL —',
    `for example ${base}docs/api renders the API reference, and ${base}docs/api.md returns its source.`,
  ].join('\n');

  return `${[preamble, ...sections].join('\n\n')}\n`;
};

/** The URL a page's markdown is served at, for the "View as Markdown" link. */
export const markdownHref = (page: Page) => `${routeToPath(page.route)}.md`;

/**
 * sitemap.xml — every indexable page, as an absolute URL.
 *
 * The `.md` twins are left out on purpose: they are the same document at a
 * sibling path, and each page's canonical tag already points at the HTML.
 */
export const toSitemap = (pages: Page[], base: string) => {
  const urls = pages
    .filter((page) => !page.noindex)
    // The landing page carries no `order`, so it sorts last among the pages;
    // in a sitemap the site root belongs at the top.
    .sort((a, b) => Number(a.route !== '') - Number(b.route !== ''))
    .map((page) => {
      const path = `${base}${routeToPath(page.route).replace(/^\//, '')}`;
      return `  <url><loc>${META.siteUrl}${path}</loc></url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
};

/**
 * robots.txt — everything is crawlable, and here is the sitemap.
 *
 * The `.md` twins are not disallowed: they are worth reading as text, and the
 * canonical tag on each page is what settles which of the pair is indexed.
 */
export const toRobotsTxt = (base: string) =>
  `User-agent: *
Allow: /

Sitemap: ${META.siteUrl}${base}sitemap.xml
`;
