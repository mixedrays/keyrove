import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
  type AnyRouteMatch,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { notFound } from 'virtual:docs/site';

import appCss from '../app.css?url';
import { FAVICON_FILE } from '../../build/paths.ts';
import { DocsLayout } from '@/components/docs-layout.tsx';
import { DocsPage } from '@/components/docs-page.tsx';
import { SearchProvider } from '@/components/search.tsx';
import { THEME_SCRIPT } from '@/theme.ts';

/**
 * Whether the router is showing the not-found page: a URL no route matches
 * marks the root's match, and a page a loader could not find marks its own.
 */
const isNotFound = (matches: AnyRouteMatch[]) =>
  matches.some((match) => match._notFound || match.status === 'notFound');

/**
 * Every URL the content model has no page for, on the client and in dev. The
 * build prerenders the same page at `/404` for Cloudflare Pages to serve.
 */
function NotFound() {
  return (
    <DocsLayout>
      <DocsPage route={notFound.route} />
    </DocsLayout>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  // Where a not-found page was rendered, for src/router.tsx to hydrate it at:
  // `/404` when the build prerendered it, and wherever the miss was in dev.
  const renderedAt = useRouterState({
    select: ({ matches, location }) =>
      isNotFound(matches) || matches.some((match) => match.routeId === '/404')
        ? location.pathname
        : undefined,
  });

  return (
    // The inline script below sets `data-theme` before React hydrates, which
    // it has no way to know about.
    <html lang="en" data-rendered-at={renderedAt} suppressHydrationWarning>
      <head>
        {/* React hoists the stylesheet above this, so the script waits for it
            to download before it runs. The page paints after both either
            way — the stylesheet is render-blocking — so the stored theme is
            still the first one shown. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <SearchProvider>{children}</SearchProvider>
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: ({ matches }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      ...(isNotFound(matches) ? notFound.head.meta : []),
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: `${import.meta.env.BASE_URL}${FAVICON_FILE}`,
      },
      // The stylesheet twice: a preload, then the link that applies it. The
      // preload is for Cloudflare Pages rather than for the browser, which
      // finds the link on its own: Pages turns a page's preload tags into a
      // 103 Early Hint, so the stylesheet is already downloading while the
      // HTML is still on its way. Neither carries `crossorigin` — Pages skips
      // any preload with an attribute beyond `rel`, `href` and `as`.
      { rel: 'preload', as: 'style', href: appCss },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});
