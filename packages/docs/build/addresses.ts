/**
 * Every address the site has, worked out in one place.
 *
 * A page's route — `docs/api`, or `''` for the landing page — has a site path,
 * `/docs/api`, which is how content, chrome, the router and the prerender all
 * name it. Pages are served at extensionless URLs (`/docs/api`, from
 * `dist/client/docs/api.html`) so that appending `.md` lands on the twin
 * beside it.
 *
 * A deploy puts every site path under its base, e.g. `/keyrove/` for a GitHub
 * Pages project site. Relative hrefs cannot be resolved consistently against a
 * URL with no trailing slash, hence site paths and an explicit base.
 *
 * Nothing here touches the filesystem, so the browser bundle imports it too.
 */

/** `docs/examples/basic` → `/docs/examples/basic`; the landing page → `/`. */
export const pagePath = (route: string) => `/${route}`;

/** The `.md` twin of a page: `docs/api` → `/docs/api.md`, the landing page → `/index.md`. */
export const twinPath = (route: string) =>
  `/${route === '' ? 'index' : route}.md`;

/**
 * Every file the site generates besides the pages and their twins, declared
 * once: the prerender lists these paths, vite-plugin-content.ts gives each its
 * body, and src/server/files.ts serves it at its path.
 *
 * Each also needs a route file under `src/routes/`, which TanStack Start's
 * file-based routing wants one of per URL. Those only hand the request to
 * `serveFile`, and the prerender fails on any path that answers 404, so a
 * missing route cannot go unnoticed.
 */
export const GENERATED_FILES = {
  searchIndex: { path: '/search-index.json', type: 'application/json' },
  llmsTxt: { path: '/llms.txt', type: 'text/plain' },
  llmsFullTxt: { path: '/llms-full.txt', type: 'text/plain' },
  sitemap: { path: '/sitemap.xml', type: 'application/xml' },
  robotsTxt: { path: '/robots.txt', type: 'text/plain' },
  // The site icon, at the root beside robots.txt.
  favicon: { path: '/favicon.svg', type: 'image/svg+xml' },
} as const;

export type GeneratedFile = keyof typeof GENERATED_FILES;

export type Addresses = ReturnType<typeof createAddresses>;

/**
 * Site paths as one deploy serves them: under `base`, at `siteUrl`.
 *
 * Canonical tags, Open Graph, the sitemap and llms.txt need absolute URLs, and
 * only the build knows the site URL. The browser bundle leaves it out and asks
 * for hrefs alone, which resolve against whichever origin served the page.
 */
export const createAddresses = ({
  base,
  siteUrl = '',
}: {
  base: string;
  siteUrl?: string;
}) => {
  /** `/docs/api#followfocus` → `/keyrove/docs/api#followfocus`, under `/keyrove/`. */
  const href = (path: string) => `${base}${path.replace(/^\//, '')}`;

  /** `/docs/api` → `https://keyrove.pages.dev/docs/api`. */
  const url = (path: string) => `${siteUrl}${href(path)}`;

  return {
    href,
    url,
    pageUrl: (route: string) => url(pagePath(route)),
    twinUrl: (route: string) => url(twinPath(route)),
  };
};
