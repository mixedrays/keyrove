import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';

import { Markdown } from '@/components/markdown.tsx';
import { SiteFooter, SiteHeader } from '@/components/site-chrome.tsx';
import { loadPage, usePage } from '@/content.ts';

const ROUTE = '';

function LandingContent() {
  return <Markdown tree={usePage(ROUTE).tree} />;
}

function Landing() {
  return (
    <>
      <SiteHeader layout="landing" />
      <main>
        {/* The classes sit on the article rather than on main so that every
            rule keyed to them, child combinators included, sees the same
            structure it did before main had an article in it. */}
        <article className="landing markdown">
          <Suspense>
            <LandingContent />
          </Suspense>
        </article>
      </main>
      <SiteFooter layout="landing" />
    </>
  );
}

export const Route = createFileRoute('/')({
  loader: async () => ({ head: (await loadPage(ROUTE)).head }),
  head: ({ loaderData }) => loaderData?.head ?? {},
  component: Landing,
});
