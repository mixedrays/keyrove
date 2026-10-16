import { createFileRoute } from '@tanstack/react-router';
import { notFound } from 'virtual:docs/site';

import { DocsLayout } from '@/components/docs-layout.tsx';
import { DocsPage } from '@/components/docs-page.tsx';
import { loadPage } from '@/content.ts';

/**
 * The not-found page at a URL of its own, so the build prerenders it to
 * `404.html` — which Cloudflare Pages serves, with a 404, for any URL it has
 * no file for. Rendered exactly as the root route's not-found component is.
 */
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
