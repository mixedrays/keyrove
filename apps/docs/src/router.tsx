import { createRouter, type LocationRewrite } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

// `404.html`, prerendered at `/404`, hydrated at the typed URL would match a
// different route and React would discard it. So the router reads the typed
// address as `/404`; the bar keeps what was typed.
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
    notFoundMode: 'root',
    scrollRestoration: true,
    defaultPreload: 'intent',
    rewrite: notFoundRewrite(),
  });

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
