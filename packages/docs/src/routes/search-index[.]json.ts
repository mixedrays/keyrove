import { createFileRoute } from '@tanstack/react-router';

import { serveFile } from '@/server/files.ts';

export const Route = createFileRoute('/search-index.json')({
  server: { handlers: { GET: () => serveFile('search-index.json') } },
});
