import type { Page } from './content.ts';
import { expandDemos, type Demos } from './demos.ts';
import { toHtmlTree, type HtmlNode } from './html-tree.ts';
import { expandIcons, stripIcons } from './icons.ts';
import { parseMarkdown, type Heading, type Section } from './markdown.ts';
import { expandMeta } from './meta.ts';

/**
 * Everything the site makes of one page, from one parse.
 *
 * The page body, the rail and the search index are three readings of the same
 * tokens, so the ids they name cannot disagree. The order the page goes
 * through — placeholders expanded, markdown parsed, HTML rendered, icons drawn
 * — is written down here and nowhere else.
 *
 * The `.md` twin is the one projection that is not parsed: it is the source
 * with its placeholders expanded, and a demo expands differently there — as
 * its source block alone, not as live markup with the source beside it.
 */
export type RenderedPage = {
  page: Page;
  /** The h2 and h3 headings, for the "On this page" rail. */
  headings: Heading[];
  /** The page split at those headings, for the search index. */
  sections: Section[];
  /** The page as standalone markdown, served at its URL with `.md` appended. */
  markdown: string;
  /**
   * The body as the tree src/components/markdown.tsx draws. The only
   * projection that runs Shiki, so it is rendered on the first call rather
   * than up front, and once.
   */
  tree: () => Promise<HtmlNode[]>;
};

/**
 * A page's `.md` twin.
 *
 * Frontmatter is site plumbing, so it is replaced by the title and description
 * it carried, leaving a document that stands on its own when fetched in
 * isolation. Demos are expanded, so the markup a page documents reaches a
 * reader who never runs the site — the placeholder on its own carries none of
 * it. Icons are dropped: there is nothing to draw them with, and an empty
 * `<span>` would only be noise beside the text it decorates.
 */
const toTwin = (page: Page, body: string) => {
  const heading = `# ${page.title}`;
  const lead = page.description === '' ? '' : `\n\n> ${page.description}`;

  return `${heading}${lead}\n\n${stripIcons(body)}\n`;
};

export const renderPage = (page: Page, demos: Demos): RenderedPage => {
  // The About and License facts expand to markdown, so one expansion serves
  // the HTML and the twin alike.
  const body = expandMeta(page.body);
  const parsed = parseMarkdown(expandDemos(body, demos, 'html'));

  let tree: Promise<HtmlNode[]> | undefined;

  return {
    page,
    headings: parsed.headings,
    sections: parsed.sections,
    markdown: toTwin(page, expandDemos(body, demos, 'markdown')),
    tree: () =>
      (tree ??= parsed.render().then((html) => toHtmlTree(expandIcons(html)))),
  };
};
