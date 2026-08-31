import type { NavGroup, Page } from './content.ts';
import { expandDemos, type Demos } from './demos.ts';
import { routeToPath } from './layout.ts';
import { expandMeta } from './meta.ts';

/**
 * The machine-readable half of the site.
 *
 * Every page is served twice: as HTML at `/docs/api`, and as markdown at
 * `/docs/api.md`. The markdown is not the raw source file — frontmatter is
 * site plumbing, so it is replaced by the title and description it carried,
 * leaving a document that stands on its own when fetched in isolation.
 */

/**
 * Absolute origin for the links in llms.txt, e.g. `https://keyrove.dev`.
 *
 * The convention calls for absolute URLs, but the site does not know where it
 * is deployed; with this unset the links stay root-relative, which still
 * resolves for anything fetching llms.txt from the site itself.
 */
const SITE_URL = (process.env.DOCS_SITE_URL ?? '').replace(/\/$/, '');

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
  const url = (route: string) => `${SITE_URL}${base}${toMarkdownPath(route)}`;

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
