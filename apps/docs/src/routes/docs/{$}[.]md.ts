import { createFileRoute } from '@tanstack/react-router';

import { serveFile } from '@/server/files.ts';

// Its own route, or the page route's `$` would claim it.
export const Route = createFileRoute('/docs/{$}.md')({
  server: {
    handlers: { GET: ({ pathname }) => serveFile(pathname) },
  },
});
