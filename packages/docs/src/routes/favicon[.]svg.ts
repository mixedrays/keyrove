import { createFileRoute } from '@tanstack/react-router';

import { serveFile } from '@/server/files.ts';

export const Route = createFileRoute('/favicon.svg')({
  server: { handlers: { GET: () => serveFile('favicon.svg') } },
});
