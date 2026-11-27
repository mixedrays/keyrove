import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { pages } from 'virtual:docs/site';

import { DocsPage } from '@/components/docs-page.tsx';
import { hasPage, loadPage } from '@/content.ts';

export const Route = createFileRoute('/_docs/docs/$')({
  loader: async ({ params }) => {
    const route = `docs/${params._splat ?? ''}`.replace(/\/+$/, '');

    // Readers get `/docs` by trimming any docs URL. public/_redirects handles
    // it in production; this is dev's equivalent.
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
