import { createFileRoute } from '@tanstack/react-router';

import { serveFile } from '@/server/files.ts';

export const Route = createFileRoute('/robots.txt')({
  server: { handlers: { GET: () => serveFile('robots.txt') } },
});
