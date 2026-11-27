import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
  type AnyRouteMatch,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { notFound } from 'virtual:docs/site';

import appCss from '../style.css?url';
import { GENERATED_FILES } from '../../build/addresses.ts';
import { addresses } from '@/addresses.ts';
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

/** The build prerenders the same page at `/404` for Cloudflare Pages. */
function NotFound() {
  return (
    <DocsLayout>
      <DocsPage route={notFound.route} />
    </DocsLayout>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  // For src/router.tsx to hydrate the not-found page where it was rendered.
  const renderedAt = useRouterState({
    select: ({ matches, location }) =>
      isNotFound(matches) || matches.some((match) => match.routeId === '/404')
        ? location.pathname
        : undefined,
  });

  return (
    // The inline script sets `data-theme` before hydration.
    <html lang="en" data-rendered-at={renderedAt} suppressHydrationWarning>
      <head>
        {/* Waits for the hoisted stylesheet, but the page paints after both
            anyway, so the stored theme is still the first shown. */}
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
        href: addresses.href(GENERATED_FILES.favicon.path),
      },
      // The preload becomes a Cloudflare Pages 103 Early Hint. No
      // `crossorigin`: Pages skips preloads with attributes beyond rel/href/as.
      { rel: 'preload', as: 'style', href: appCss },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});
