/**
 * The modules vite-plugin-content.ts serves. Their shapes are written out here
 * rather than inferred, because the plugin emits them as source text.
 */

declare module 'virtual:docs/site' {
  import type { Layout, NavLink } from '../build/content.ts';
  import type { Head } from '../build/head.ts';
  import type { HtmlNode } from '../build/html-tree.ts';
  import type { Heading } from '../build/markdown.ts';

  export type PageInfo = {
    route: string;
    title: string;
    description: string;
    layout: Layout;
    noindex: boolean;
    /** The source file on GitHub, for "View source". */
    sourceUrl: string;
  };

  export type PageContent = {
    /** The rendered markdown body, links still site-absolute. */
    tree: HtmlNode[];
    headings: Heading[];
    head: Head;
  };

  export const meta: {
    packageVersion: string;
    repoUrl: string;
    npmUrl: string;
  };

  /** The sidebar, each group's pages as routes. */
  export const nav: { label: string; pages: string[]; links: NavLink[] }[];

  export const pages: Record<string, PageInfo>;

  /** The sidebar order, flattened — what the pager walks. */
  export const readingOrder: string[];

  /** The not-found page: its route, and the head the root route shows for it. */
  export const notFound: { route: string; head: Head };

  export const loaders: Record<string, () => Promise<{ default: PageContent }>>;
}

declare module 'virtual:docs/files' {
  /** Every non-page file, keyed by the path it is served at, e.g. `docs/api.md`. */
  export const files: Record<string, { type: string; body: string }>;
}
