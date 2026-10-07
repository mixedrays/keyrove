import { use } from 'react';
import { loaders, type PageContent } from 'virtual:docs/site';

/**
 * A page's body, loaded once and then read synchronously.
 *
 * The body is a chunk of its own rather than loader data, so it is never
 * serialised into the prerendered HTML beside the markup it already rendered —
 * that would send every page twice. A route's loader awaits `loadPage`, which
 * leaves the module here for the component to read; on the first paint, where
 * the browser hydrates without running loaders, `usePage` suspends on the same
 * promise and React keeps the server's markup until the chunk arrives.
 */

const cache = new Map<string, Promise<PageContent>>();
const loaded = new Map<string, PageContent>();

/** Whether `route` is a page the content model knows. */
export const hasPage = (route: string) =>
  Object.prototype.hasOwnProperty.call(loaders, route);

export const loadPage = (route: string): Promise<PageContent> => {
  let pending = cache.get(route);
  if (!pending) {
    pending = loaders[route]().then(({ default: content }) => {
      loaded.set(route, content);
      return content;
    });
    cache.set(route, pending);
  }
  return pending;
};

export const usePage = (route: string): PageContent =>
  loaded.get(route) ?? use(loadPage(route));
