import { createFileRoute } from '@tanstack/react-router';

import { serveFile } from '@/server/files.ts';

/**
 * The `.md` twins of the pages outside `docs/`: `/index.md` for the landing
 * page and `/404.md`. Every page is served as markdown with `.md` appended to
 * its URL — see build/plaintext.ts for what the twin carries.
 */
export const Route = createFileRoute('/{$}.md')({
  server: {
    handlers: { GET: ({ params }) => serveFile(`${params._splat}.md`) },
  },
});
