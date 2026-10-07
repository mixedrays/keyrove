import { files } from 'virtual:docs/files';

/**
 * Answers with one of the generated files — a `.md` twin, llms.txt, the
 * sitemap — as vite-plugin-content.ts produced it. The build prerenders every
 * one of these routes into a static file, so this only ever runs in dev and
 * during the prerender itself.
 */
export const serveFile = (path: string) => {
  const file = files[path];
  if (!file) return new Response('Not found', { status: 404 });

  return new Response(file.body, {
    headers: { 'Content-Type': `${file.type}; charset=utf-8` },
  });
};
