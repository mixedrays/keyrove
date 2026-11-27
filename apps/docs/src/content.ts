import { use } from 'react';
import { loaders, type PageContent } from 'virtual:docs/site';

// A chunk, not loader data, which would serialise every page twice. On first
// paint `usePage` suspends and React keeps the server markup.

const cache = new Map<string, Promise<PageContent>>();
const loaded = new Map<string, PageContent>();

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
