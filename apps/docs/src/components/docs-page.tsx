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
      <main id="content" tabIndex={-1} className="docs-main outline-none">
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

// Keyed by route: React would otherwise reuse one page's demo components for
// another's at the same tree position, never mounting the new behaviour.
export function DocsPage({ route }: { route: string }) {
  return (
    <Suspense>
      <DocsPageContent key={route} route={route} />
    </Suspense>
  );
}
