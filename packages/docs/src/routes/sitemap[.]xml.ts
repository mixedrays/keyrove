import { createFileRoute } from '@tanstack/react-router';

import { serveFile } from '@/server/files.ts';

export const Route = createFileRoute('/sitemap.xml')({
  server: { handlers: { GET: ({ pathname }) => serveFile(pathname) } },
});
