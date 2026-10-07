import { createRouter, type LocationRewrite } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

/**
 * Cloudflare Pages answers a URL it has no file for with `404.html`, which
 * the build prerendered at `/404`. Hydrated at the address the reader typed,
 * that page would be matched to a different route than the one that rendered
 * it, and React would throw the server's markup away. So the root route marks
 * a not-found page with the path it was rendered at, and where that is not the
 * address in the bar, the router reads the one address as the other — the bar
 * keeps what the reader typed.
 *
 * The paths are the router's own, inside the deploy base: TanStack strips the
 * base before a rewrite sees a URL, and adds it back after.
 */
const notFoundRewrite = (): LocationRewrite | undefined => {
  if (typeof document === 'undefined') return undefined;

  const renderedAt = document.documentElement.dataset.renderedAt;
  const base = import.meta.env.BASE_URL;
  const { pathname } = window.location;
  const servedAt = pathname.startsWith(base)
    ? `/${pathname.slice(base.length)}`
    : pathname;
  if (!renderedAt || renderedAt === servedAt) return undefined;

  return {
    input: ({ url }) => {
      if (url.pathname !== servedAt) return undefined;
      url.pathname = renderedAt;
      return url;
    },
    output: ({ url }) => {
      if (url.pathname !== renderedAt) return undefined;
      url.pathname = servedAt;
      return url;
    },
  };
};

export const getRouter = () =>
  createRouter({
    routeTree,
    basepath: import.meta.env.BASE_URL,
    // Pages are served at `/docs/api`, never `/docs/api/` — see vite.config.ts.
    trailingSlash: 'never',
    // A page the content model does not have renders the not-found page in
    // full, from the root, wherever in the tree the miss was found.
    notFoundMode: 'root',
    scrollRestoration: true,
    // Hovering a link loads the page it points at, so the click lands on a
    // page that is already in memory — what the speculation rules did when
    // every navigation was a full page load.
    defaultPreload: 'intent',
    rewrite: notFoundRewrite(),
  });

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
