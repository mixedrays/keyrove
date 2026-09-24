import type { NavGroup, Page } from './content.ts';
import { expandDemos, type Demos } from './demos.ts';
import { stripIcons } from './icons.ts';
import { routeToPath, toMarkdownPath } from './layout.ts';
import { expandMeta, META } from './meta.ts';

/**
 * The machine-readable half of the site: the markdown twins, llms.txt and
 * llms-full.txt, and the two files crawlers look for.
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
  const body = stripIcons(
    expandMeta(expandDemos(page.body, demos, 'markdown')),
  );

  return `${heading}${lead}\n\n${body}\n`;
};

/** A page's absolute URL: `docs/api` → `https://keyrove.pages.dev/docs/api`. */
const toPageUrl = (route: string, base: string) =>
  `${META.siteUrl}${base}${routeToPath(route).replace(/^\//, '')}`;

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
    `All of the pages below, in full and in this order, are one file at ${META.siteUrl}${base}llms-full.txt.`,
  ].join('\n');

  return `${[preamble, ...sections].join('\n\n')}\n`;
};

/**
 * llms-full.txt — every page llms.txt lists, in full, as one file.
 *
 * An agent that wants all of the docs gets them in one fetch rather than one
 * per twin. The pages are the twins as served, in llms.txt's order, each
 * preceded by the URL it lives at: links between pages are root-relative, and
 * a section quoted out of this file should still be traceable to its page.
 */
export const toLlmsFullTxt = (
  landing: Page | undefined,
  readingOrder: Page[],
  demos: Demos,
  base: string,
) => {
  const preamble = [
    '# keyrove',
    '',
    `> ${landing?.description ?? ''}`,
    '',
    `The full text of every page indexed by ${META.siteUrl}${base}llms.txt, in the same order.`,
  ].join('\n');

  const pages = readingOrder.map(
    (page) =>
      `Source: ${toPageUrl(page.route, base)}\n\n${toMarkdown(page, demos).trimEnd()}`,
  );

  // Blank lines on both sides of each rule: straight under a line of text,
  // `---` would make that line a heading instead.
  return `${[preamble, ...pages].join('\n\n---\n\n')}\n`;
};

/** The URL a page's markdown is served at, for the "View as Markdown" link. */
export const markdownHref = (page: Page) => `${routeToPath(page.route)}.md`;

/**
 * sitemap.xml — every indexable page, as an absolute URL.
 *
 * The `.md` twins are left out on purpose: they are the same document at a
 * sibling path, and it is the HTML that should rank. `_headers` serves them
 * `noindex` to settle it — a sitemap only offers URLs, it does not withdraw
 * the ones it omits.
 *
 * `lastmod` comes from the commit that last touched the page's source, and is
 * dropped for a page git cannot date: the field is worth having only while
 * every date in it is true.
 */
export const toSitemap = (pages: Page[], base: string) => {
  const urls = pages
    .filter((page) => !page.noindex)
    // The landing page carries no `order`, so it sorts last among the pages;
    // in a sitemap the site root belongs at the top.
    .sort((a, b) => Number(a.route !== '') - Number(b.route !== ''))
    .map((page) => {
      const lastmod =
        page.lastModified === null
          ? ''
          : `<lastmod>${page.lastModified}</lastmod>`;

      return `  <url><loc>${toPageUrl(page.route, base)}</loc>${lastmod}</url>`;
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
 * The `.md` twins are not disallowed: they are worth reading as text, and a
 * `Disallow` would stop the fetch rather than the indexing. `_headers` sends
 * them `X-Robots-Tag: noindex` instead, which keeps them readable and keeps
 * them out of the index — a `text/plain` response cannot carry the canonical
 * tag that would otherwise pair each twin with its page.
 *
 * The AI crawlers are admitted by `*` already. They are named anyway, and
 * `Content-Signal` (https://contentsignals.org) says what the content may be
 * used for, so that the permission reads as a decision rather than as a
 * default nobody got round to changing. The docs are MIT licensed and the site
 * serves llms.txt for agents to read, so every use is allowed, training
 * included. A crawler obeys only the most specific group naming it, so the
 * signal is repeated in theirs.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'PerplexityBot',
  'CCBot',
];

const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=yes';

export const toRobotsTxt = (base: string) =>
  `User-agent: *
Content-Signal: ${CONTENT_SIGNAL}
Allow: /

${AI_CRAWLERS.map((agent) => `User-agent: ${agent}`).join('\n')}
Content-Signal: ${CONTENT_SIGNAL}
Allow: /

Sitemap: ${META.siteUrl}${base}sitemap.xml
`;
