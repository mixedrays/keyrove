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
