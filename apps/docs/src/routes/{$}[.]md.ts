import { createFileRoute } from '@tanstack/react-router';

import { serveFile } from '@/server/files.ts';

/** Twins outside `docs/`: `/index.md` and `/404.md`. */
export const Route = createFileRoute('/{$}.md')({
  server: {
    handlers: { GET: ({ pathname }) => serveFile(pathname) },
  },
});
