import type { Addresses } from './addresses.ts';
import type { NavGroup, Page } from './content.ts';
import { toStructuredData } from './structured-data.ts';

// Built at build time, so the bundle never carries the manifests or origin.

type HeadMeta =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { 'script:ld+json': Record<string, unknown> };

type HeadLink = { rel: string; href: string; type?: string };

export type Head = { meta: HeadMeta[]; links: HeadLink[] };

// One card for every page: the library's name and purpose is what any
// unfurled link needs to say.
const OG_IMAGE = {
  path: '/og.png',
  width: 1200,
  height: 630,
  alt: 'keyrove — framework-agnostic keyboard navigation for lists, grids and trees.',
} as const;

// The landing page's name is the wordmark, so it needs `titleTag`.
const toTitle = (page: Page) =>
  page.titleTag ??
  (page.layout === 'landing'
    ? `keyrove — ${page.description}`
    : `${page.title} — keyrove`);

// The canonical is stated outright because of the `.md` twin, which is named
// as an alternate. `noindex` (the 404) has no canonical URL to claim.
export const toHead = (
  page: Page,
  nav: NavGroup[],
  addresses: Addresses,
): Head => {
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

  const url = addresses.pageUrl(page.route);
  const image = addresses.url(OG_IMAGE.path);

  return {
    meta: [
      ...meta,
      {
        property: 'og:type',
        content: page.layout === 'landing' ? 'website' : 'article',
      },
      { property: 'og:site_name', content: 'keyrove' },
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
          toUrl: addresses.pageUrl,
          imageUrl: image,
        }),
      },
    ],
    links: [
      { rel: 'canonical', href: url },
      // The twin is served as `text/plain` so a browser shows it.
      {
        rel: 'alternate',
        type: 'text/markdown',
        href: addresses.twinUrl(page.route),
      },
    ],
  };
};
