import type { NavGroup, Page } from './content.ts';
import { META } from './meta.ts';
import { createHrefResolver, routeToPath, toMarkdownPath } from './paths.ts';
import { toStructuredData } from './structured-data.ts';

/**
 * A page's `<head>`, in the shape a TanStack Router `head()` returns: the
 * title, the description, and what a crawler and a link unfurler need.
 *
 * Worked out at build time beside the page's HTML, so the browser bundle never
 * carries the manifests or the site's origin around just to rebuild it.
 */

export type HeadMeta =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { 'script:ld+json': Record<string, unknown> };

export type HeadLink = { rel: string; href: string; type?: string };

export type Head = { meta: HeadMeta[]; links: HeadLink[] };

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

/**
 * Every page hangs its own name off the wordmark, except the landing page,
 * whose name is the wordmark — leaving it to describe itself at a length no
 * search result or link unfurl will show. `titleTag` in frontmatter is how
 * either falls back to a line written for the slot.
 */
const toTitle = (page: Page) =>
  page.titleTag ??
  (page.layout === 'landing'
    ? `keyrove — ${page.description}`
    : `${page.title} — keyrove`);

/**
 * Which URL is the canonical one, and what to show when the page is shared.
 *
 * Every route has a `.md` twin at a sibling path, so which of the two is the
 * indexable one has to be said outright rather than left to be guessed — and
 * the twin is named as an alternate, so an agent holding the page finds the
 * markdown without guessing at its URL. A page marked `noindex` skips all of it
 * and says so instead — it is served at every dead URL, so it has no canonical
 * URL of its own to claim.
 */
export const toHead = (page: Page, nav: NavGroup[], base: string): Head => {
  const title = toTitle(page);
  const meta: HeadMeta[] = [
    { title },
    { name: 'description', content: page.description },
  ];

  if (page.noindex) {
    return {
      meta: [...meta, { name: 'robots', content: 'noindex, follow' }],
      links: [],
    };
  }

  const resolveHref = createHrefResolver(base);
  const toUrl = (route: string) =>
    `${META.siteUrl}${resolveHref(routeToPath(route))}`;
  const url = toUrl(page.route);
  const image = `${META.siteUrl}${resolveHref(OG_IMAGE.path)}`;

  return {
    meta: [
      ...meta,
      {
        property: 'og:type',
        content: page.layout === 'landing' ? 'website' : 'article',
      },
      { property: 'og:site_name', content: 'keyrove' },
      // The prose is American — "license", "color", "behavior". That is also
      // what an absent og:locale is taken to mean, so this only says it outright.
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: page.description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: String(OG_IMAGE.width) },
      { property: 'og:image:height', content: String(OG_IMAGE.height) },
      { property: 'og:image:alt', content: OG_IMAGE.alt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: page.description },
      { name: 'twitter:image', content: image },
      {
        'script:ld+json': toStructuredData({
          page,
          nav,
          toUrl,
          imageUrl: image,
        }),
      },
    ],
    links: [
      { rel: 'canonical', href: url },
      // `type` names the format. The twin is served as `text/plain` so that a
      // browser shows it rather than downloading it — see public/_headers.
      {
        rel: 'alternate',
        type: 'text/markdown',
        href: `${META.siteUrl}${resolveHref(toMarkdownPath(page.route))}`,
      },
    ],
  };
};
