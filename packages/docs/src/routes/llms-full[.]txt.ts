import { createFileRoute } from '@tanstack/react-router';

import { serveFile } from '@/server/files.ts';

export const Route = createFileRoute('/llms-full.txt')({
  server: { handlers: { GET: () => serveFile('llms-full.txt') } },
});
