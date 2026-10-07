import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { pages } from 'virtual:docs/site';

import { DocsPage } from '@/components/docs-page.tsx';
import { hasPage, loadPage } from '@/content.ts';

/** Every page under `content/docs/`, at the path its file has there. */
export const Route = createFileRoute('/_docs/docs/$')({
  loader: async ({ params }) => {
    const route = `docs/${params._splat ?? ''}`.replace(/\/+$/, '');

    // `/docs` has no page of its own — the Guide group starts at the
    // introduction — but it is the URL a reader gets by trimming any docs URL.
    // public/_redirects answers it in production; this is the same in dev.
    if (route === 'docs') {
      throw redirect({ to: '/docs/$', params: { _splat: 'introduction' } });
    }

    if (!hasPage(route) || pages[route].layout !== 'docs') throw notFound();

    return { route, head: (await loadPage(route)).head };
  },
  head: ({ loaderData }) => loaderData?.head ?? {},
  component: function DocsRoute() {
    const { route } = Route.useLoaderData();
    return <DocsPage route={route} />;
  },
});
