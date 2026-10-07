import { createFileRoute } from '@tanstack/react-router';

import { serveFile } from '@/server/files.ts';

/**
 * The `.md` twin of every docs page: `/docs/api.md` beside `/docs/api`. A
 * route of its own rather than a case of the page route, whose `$` would
 * otherwise claim it.
 */
export const Route = createFileRoute('/docs/{$}.md')({
  server: {
    handlers: { GET: ({ params }) => serveFile(`docs/${params._splat}.md`) },
  },
});
