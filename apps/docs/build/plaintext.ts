import { GENERATED_FILES, type Addresses } from './addresses.ts';
import type { NavGroup, Page } from './content.ts';
import type { RenderedPage } from './page-render.ts';

/** https://llmstxt.org. Sections follow sidebar order. */
export const toLlmsTxt = (
  landing: Page | undefined,
  nav: NavGroup[],
  addresses: Addresses,
) => {
  const sections = nav.map((group) => {
    const entries = group.pages
      .map((page) => {
        const summary = page.description === '' ? '' : `: ${page.description}`;
        return `- [${page.title}](${addresses.twinUrl(page.route)})${summary}`;
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
    `for example ${addresses.pageUrl('docs/api')} renders the API reference, and ${addresses.twinUrl('docs/api')} returns its source.`,
    `All of the pages below, in full and in this order, are one file at ${addresses.url(GENERATED_FILES.llmsFullTxt.path)}.`,
  ].join('\n');

  return `${[preamble, ...sections].join('\n\n')}\n`;
};

/** Each page is led by its URL, so a quoted section traces back to it. */
export const toLlmsFullTxt = (
  landing: Page | undefined,
  readingOrder: RenderedPage[],
  addresses: Addresses,
) => {
  const preamble = [
    '# keyrove',
    '',
    `> ${landing?.description ?? ''}`,
    '',
    `The full text of every page indexed by ${addresses.url(GENERATED_FILES.llmsTxt.path)}, in the same order.`,
  ].join('\n');

  const pages = readingOrder.map(
    ({ page, markdown }) =>
      `Source: ${addresses.pageUrl(page.route)}\n\n${markdown.trimEnd()}`,
  );

  // Under a line of text, `---` would make it a heading.
  return `${[preamble, ...pages].join('\n\n---\n\n')}\n`;
};

/**
 * `.md` twins are left out so the HTML ranks. `lastmod` is dropped where git
 * can't date a page: the field is worth having only while every date is true.
 */
export const toSitemap = (pages: Page[], addresses: Addresses) => {
  const urls = pages
    .filter((page) => !page.noindex)
    // The landing page has no `order`; the site root belongs at the top.
    .sort((a, b) => Number(a.route !== '') - Number(b.route !== ''))
    .map((page) => {
      const lastmod =
        page.lastModified === null
          ? ''
          : `<lastmod>${page.lastModified}</lastmod>`;

      return `  <url><loc>${addresses.pageUrl(page.route)}</loc>${lastmod}</url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
};

// Named though `*` admits them, so the permission reads as a decision. A
// crawler obeys only its most specific group, so the signal repeats there.
// Twins aren't disallowed: `_headers` sends them `noindex` instead.
const AI_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'PerplexityBot',
  'CCBot',
];

const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=yes';

export const toRobotsTxt = (addresses: Addresses) =>
  `User-agent: *
Content-Signal: ${CONTENT_SIGNAL}
Allow: /

${AI_CRAWLERS.map((agent) => `User-agent: ${agent}`).join('\n')}
Content-Signal: ${CONTENT_SIGNAL}
Allow: /

Sitemap: ${addresses.url(GENERATED_FILES.sitemap.path)}
`;
