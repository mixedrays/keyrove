import { createFileRoute } from '@tanstack/react-router';
import { notFound } from 'virtual:docs/site';

import { DocsLayout } from '@/components/docs-layout.tsx';
import { DocsPage } from '@/components/docs-page.tsx';
import { loadPage } from '@/content.ts';

// Prerendered to `404.html`, which Cloudflare Pages serves for unknown URLs.
export const Route = createFileRoute('/404')({
  loader: async () => {
    await loadPage(notFound.route);
  },
  head: () => notFound.head,
  component: () => (
    <DocsLayout>
      <DocsPage route={notFound.route} />
    </DocsLayout>
  ),
});
