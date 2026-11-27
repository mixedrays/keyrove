import type { NavGroup, Page } from './content.ts';
import { META } from './meta.ts';

// Asserts only what the page or a manifest states: structured data claiming
// more than the page shows earns a manual action.

const AUTHOR = {
  '@type': 'Person',
  name: META.author,
  url: META.authorUrl,
} as const;

const keywords = (page: Page) =>
  page.keywords.length === 0 ? {} : { keywords: page.keywords };

type Context = {
  page: Page;
  nav: NavGroup[];
  /** `docs/api` → `https://keyrove.pages.dev/docs/api`; `''` → the site root. */
  toUrl: (route: string) => string;
  /** The social card, which doubles as each node's `image`. */
  imageUrl: string;
};

// Where Google takes a result's site name from: "keyrove", not the domain.
const webSite = ({ toUrl }: Context) => ({
  '@type': 'WebSite',
  '@id': `${toUrl('')}#website`,
  name: 'keyrove',
  url: toUrl(''),
  inLanguage: 'en',
});

// Not `SoftwareApplication`: its rich results want a rating or price.
const softwareSourceCode = ({ page, toUrl, imageUrl }: Context) => ({
  '@type': 'SoftwareSourceCode',
  name: 'keyrove',
  alternateName: META.packageName,
  description: page.description,
  url: toUrl(page.route),
  image: imageUrl,
  codeRepository: META.repoUrl,
  programmingLanguage: 'TypeScript',
  runtimePlatform: 'Web browser',
  license: 'https://opensource.org/licenses/MIT',
  version: META.packageVersion,
  author: AUTHOR,
  inLanguage: 'en',
  ...keywords(page),
});

// `dateModified` follows the sitemap's `lastmod`, omitted on the same terms.
const techArticle = (context: Context) => {
  const { page, toUrl, imageUrl } = context;

  return {
    '@type': 'TechArticle',
    headline: page.title,
    description: page.description,
    url: toUrl(page.route),
    image: imageUrl,
    author: AUTHOR,
    inLanguage: 'en',
    ...(page.lastModified === null ? {} : { dateModified: page.lastModified }),
    ...keywords(page),
    isPartOf: webSite(context),
  };
};

// A group's crumb points at its first page, and is dropped on that page.
const breadcrumbList = ({ page, nav, toUrl }: Context) => {
  const group = nav.find((entry) =>
    entry.pages.some((item) => item.route === page.route),
  );
  const section =
    group && group.pages[0].route !== page.route
      ? [{ name: group.label, route: group.pages[0].route }]
      : [];

  const trail = [
    { name: 'keyrove', route: '' },
    ...section,
    { name: page.title, route: page.route },
  ];

  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: toUrl(entry.route),
    })),
  };
};

// One `@graph`, so a crawler reading one block sees every node. TanStack
// Router escapes the JSON for its `<script>`.
export const toStructuredData = (
  context: Context,
): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@graph':
    context.page.layout === 'landing'
      ? [webSite(context), softwareSourceCode(context)]
      : [techArticle(context), breadcrumbList(context)],
});
