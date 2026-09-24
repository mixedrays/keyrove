import type { NavGroup, Page } from './content.ts';
import { META } from './meta.ts';

/**
 * JSON-LD saying what each page is.
 *
 * The meta tags in the head say how a page should be *shown*; this says what
 * it *is* — a software library on the landing page, a technical article in the
 * docs — and where it sits in the site. The breadcrumb is the part with a
 * visible payoff: a docs result renders as `keyrove › Examples › Grid` instead
 * of as a bare URL.
 *
 * Everything asserted here is already stated on the page or in a manifest.
 * Structured data that claims more than the page shows is what earns a manual
 * action, so there is nothing in these nodes a reader could not verify.
 */

/** The author of everything on the site, as one reusable node. */
const AUTHOR = {
  '@type': 'Person',
  name: META.author,
  url: META.authorUrl,
} as const;

/** The page's frontmatter keywords, or nothing when it has none. */
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

/**
 * The site as a whole, which is where Google takes a result's site name from —
 * "keyrove" above the link rather than "keyrove.pages.dev". It looks for the
 * node on the landing page; every article repeats it as the site it is part of,
 * under the same `@id`.
 */
const webSite = ({ toUrl }: Context) => ({
  '@type': 'WebSite',
  '@id': `${toUrl('')}#website`,
  name: 'keyrove',
  url: toUrl(''),
  inLanguage: 'en',
});

/**
 * The landing page: the library itself.
 *
 * `SoftwareSourceCode` rather than `SoftwareApplication` — this is a package
 * to build with, not an app to run, and the application type's rich results
 * want a rating or a price that a library has neither of.
 */
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

/**
 * A docs page: one article, part of the site.
 *
 * `dateModified` is the sitemap's `lastmod` — the last commit to the page's
 * source — and is left out on the same terms, when git cannot date the page.
 */
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

/**
 * The trail from the site root down to the page.
 *
 * A group's crumb points at its first page: the examples overview for
 * Examples, and for Guide, which has no page of its own, the introduction —
 * the same places the header's links go. On that first page the group crumb
 * is dropped instead of pointing at the page it sits beside.
 */
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

/**
 * The page's nodes as one `<script>`.
 *
 * A single `@graph` rather than a script per node: it is the same payload, and
 * a crawler reading one block cannot pair an article with a breadcrumb it did
 * not find.
 */
export const renderStructuredData = (context: Context): string => {
  const graph = {
    '@context': 'https://schema.org',
    '@graph':
      context.page.layout === 'landing'
        ? [webSite(context), softwareSourceCode(context)]
        : [techArticle(context), breadcrumbList(context)],
  };

  // Inside a <script> the parser is looking for `</script>`, not for HTML
  // entities, so the JSON is escaped at `<` alone. Running it through
  // escapeHtml would turn every quote in it into an entity and break the parse.
  const json = JSON.stringify(graph).replace(/</g, '\\u003c');

  return `<script type="application/ld+json">${json}</script>`;
};
