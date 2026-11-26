// Extensionless URLs, so appending `.md` lands on the twin. Relative hrefs
// resolve inconsistently without a trailing slash, hence an explicit base.

/** `docs/examples/basic` → `/docs/examples/basic`; the landing page → `/`. */
export const pagePath = (route: string) => `/${route}`;

/** The `.md` twin of a page: `docs/api` → `/docs/api.md`, the landing page → `/index.md`. */
export const twinPath = (route: string) =>
  `/${route === '' ? 'index' : route}.md`;

// Each also needs a route file under `src/routes/`; the prerender fails on a
// 404, so a missing one can't go unnoticed.
export const GENERATED_FILES = {
  searchIndex: { path: '/search-index.json', type: 'application/json' },
  llmsTxt: { path: '/llms.txt', type: 'text/plain' },
  llmsFullTxt: { path: '/llms-full.txt', type: 'text/plain' },
  sitemap: { path: '/sitemap.xml', type: 'application/xml' },
  robotsTxt: { path: '/robots.txt', type: 'text/plain' },
  favicon: { path: '/favicon.svg', type: 'image/svg+xml' },
} as const;

export type GeneratedFile = keyof typeof GENERATED_FILES;

export type Addresses = ReturnType<typeof createAddresses>;

// Only the build knows `siteUrl`; the browser asks for hrefs alone.
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
