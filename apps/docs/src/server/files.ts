import { files } from 'virtual:docs/files';

/**
 * Runs only in dev and the prerender. `pathname` comes with the base stripped.
 * The prerender adds a trailing slash, which the router ignores, so this does.
 */
export const serveFile = (pathname: string) => {
  const file = files[pathname.replace(/\/$/, '')];
  if (!file) return new Response('Not found', { status: 404 });

  return new Response(file.body, {
    headers: { 'Content-Type': `${file.type}; charset=utf-8` },
  });
};
