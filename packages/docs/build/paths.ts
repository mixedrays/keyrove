/**
 * How a page's route turns into the URLs the site serves it at.
 *
 * Pages are served at extensionless URLs (`/docs/api`, from
 * `dist/client/docs/api.html`) so that appending `.md` lands on the source
 * beside it. Relative hrefs cannot be resolved consistently against a URL with
 * no trailing slash, hence absolute paths and an explicit base.
 *
 * Nothing here touches the filesystem, so the browser bundle imports it too.
 */

/** The site icon, emitted at the root beside `robots.txt`. */
export const FAVICON_FILE = 'favicon.svg';

/** Site-absolute hrefs, honouring the deploy base. */
export const createHrefResolver =
  (base: string) =>
  (href: string): string =>
    `${base}${href.replace(/^\//, '')}`;

export type HrefResolver = ReturnType<typeof createHrefResolver>;

/** `docs/examples/basic` → `/docs/examples/basic`; the landing page → `/`. */
export const routeToPath = (route: string) => `/${route}`;

/** The `.md` twin of a page: `docs/api` → `docs/api.md`, the landing page → `index.md`. */
export const toMarkdownPath = (route: string) =>
  route === '' ? 'index.md' : `${route}.md`;
