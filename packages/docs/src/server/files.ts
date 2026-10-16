import { files } from 'virtual:docs/files';

/**
 * Answers with one of the generated files — a `.md` twin, llms.txt, the
 * sitemap — as vite-plugin-content.ts produced it. The build prerenders every
 * one of these routes into a static file, so this only ever runs in dev and
 * during the prerender itself.
 *
 * Each file route passes on the `pathname` its handler is given: the request's
 * path, with the deploy base already stripped by the router — `/docs/api.md`
 * under any base. The files are keyed by those same site paths, from
 * build/addresses.ts, so no route spells out which file it serves.
 *
 * The prerender asks for every path with a trailing slash, `/docs/api.md/`,
 * which the router matches as if it had none, and so does this.
 */
export const serveFile = (pathname: string) => {
  const file = files[pathname.replace(/\/$/, '')];
  if (!file) return new Response('Not found', { status: 404 });

  return new Response(file.body, {
    headers: { 'Content-Type': `${file.type}; charset=utf-8` },
  });
};
