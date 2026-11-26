import type { Page } from './content.ts';
import { expandDemos, type Demos } from './demos.ts';
import { toHtmlTree, type HtmlNode } from './html-tree.ts';
import { expandIcons, stripIcons } from './icons.ts';
import { parseMarkdown, type Heading, type Section } from './markdown.ts';
import { expandMeta } from './meta.ts';

/** One parse, so body, rail and search ids can't disagree. */
export type RenderedPage = {
  page: Page;
  /** The h2 and h3 headings, for the "On this page" rail. */
  headings: Heading[];
  /** The page split at those headings, for the search index. */
  sections: Section[];
  markdown: string;
  /** Runs Shiki, so it renders on first call, once. */
  tree: () => Promise<HtmlNode[]>;
};

// Frontmatter becomes a title and description, so the twin stands alone.
const toTwin = (page: Page, body: string) => {
  const heading = `# ${page.title}`;
  const lead = page.description === '' ? '' : `\n\n> ${page.description}`;

  return `${heading}${lead}\n\n${stripIcons(body)}\n`;
};

export const renderPage = (page: Page, demos: Demos): RenderedPage => {
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
