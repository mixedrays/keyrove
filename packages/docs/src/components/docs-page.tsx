import { Suspense } from 'react';
import { pages } from 'virtual:docs/site';

import { Markdown } from '@/components/markdown.tsx';
import { PageActions } from '@/components/page-actions.tsx';
import { Pager } from '@/components/pager.tsx';
import { Toc } from '@/components/toc.tsx';
import { usePage } from '@/content.ts';

function DocsPageContent({ route }: { route: string }) {
  const { tree, headings } = usePage(route);
  const page = pages[route];

  return (
    <>
      <main className="docs-main">
        {/* The page itself, title to last line; the pager after it is
            navigation between pages, not part of this one. */}
        <article className="markdown">
          <h1>{page.title}</h1>
          <PageActions page={page} />
          {page.description ? <p className="lead">{page.description}</p> : null}
          <Markdown tree={tree} />
        </article>
        <Pager route={route} />
      </main>
      <Toc headings={headings} />
    </>
  );
}

/**
 * One docs page, between the sidebar and the edge of the layout.
 *
 * Suspended on its own, so that on the first paint the chrome around it
 * hydrates while the page's chunk is still on its way — see src/content.ts.
 *
 * Keyed by its route, so moving to another page draws it afresh. Two pages
 * have demos at the same places in their trees, and React would otherwise
 * keep one page's demo components for the next — swapping in the new demo's
 * markup without ever mounting its behaviour.
 */
export function DocsPage({ route }: { route: string }) {
  return (
    <Suspense>
      <DocsPageContent key={route} route={route} />
    </Suspense>
  );
}
