import type { ReactNode } from 'react';
import { meta } from 'virtual:docs/site';

import { GENERATED_FILES } from '../../build/addresses.ts';
import { Icon } from '@/components/icon.tsx';
import { SearchTrigger } from '@/components/search.tsx';
import { SiteLink } from '@/components/site-link.tsx';
import { ThemeToggle } from '@/components/theme-toggle.tsx';
import { Wordmark } from '@/components/wordmark.tsx';

type Layout = 'docs' | 'landing';

export function SiteHeader({
  layout,
  menu,
}: {
  layout: Layout;
  /** The drawer toggle, on a docs page. */
  menu?: ReactNode;
}) {
  return (
    <header className="site-header">
      {/* Past the header, and on a docs page past the sidebar too. */}
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <div
        className={
          layout === 'landing' ? 'header-row header-row-narrow' : 'header-row'
        }
      >
        <div className="flex items-center gap-2">
          {menu}
          <SiteLink href="/" className="wordmark">
            <Wordmark className="h-6" />
          </SiteLink>
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          <SearchTrigger />
          <nav className="hidden items-center gap-4 text-sm md:flex md:gap-6">
            <SiteLink href="/docs/introduction" className="header-link">
              <Icon name="book" className="size-4" />
              Docs
            </SiteLink>
            <SiteLink href="/docs/examples" className="header-link">
              <Icon name="grid" className="size-4" />
              Examples
            </SiteLink>
            <SiteLink href="/docs/api" className="header-link">
              <Icon name="braces" className="size-4" />
              API
            </SiteLink>
            <a href={meta.repoUrl} className="header-link">
              <Icon name="github" className="size-4" />
              GitHub
            </a>
            {/* Smaller: a solid mark reads heavier than outlines at one size. */}
            <a href={meta.npmUrl} className="header-link">
              <Icon name="npm" className="size-3.5" />
              npm
            </a>
          </nav>
          {/* No drawer on the landing page, so narrow screens keep a Docs link. */}
          {layout === 'landing' ? (
            <SiteLink
              href="/docs/introduction"
              className="header-link px-1.5 text-sm md:hidden"
            >
              Docs
            </SiteLink>
          ) : null}
          {/* Icon-only on narrow screens, where the nav is hidden. */}
          <a
            href={meta.repoUrl}
            className="icon-button md:hidden"
            aria-label="keyrove on GitHub"
          >
            <Icon name="github" className="size-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ layout }: { layout: Layout }) {
  return (
    <footer className="site-footer">
      <div
        className={
          layout === 'landing' ? 'footer-row header-row-narrow' : 'footer-row'
        }
      >
        <p className="footer-meta">
          <SiteLink href="/" className="wordmark">
            <Wordmark className="h-5" />
          </SiteLink>
          <span>
            v{meta.packageVersion} &middot; docs v{meta.docsVersion} &middot;{' '}
            <SiteLink href="/docs/license" className="footer-link">
              MIT licensed
            </SiteLink>
          </span>
        </p>
        <nav className="footer-links" aria-label="Footer">
          <SiteLink href="/docs/introduction" className="footer-link">
            Docs
          </SiteLink>
          <SiteLink href="/docs/examples" className="footer-link">
            Examples
          </SiteLink>
          <SiteLink href="/docs/api" className="footer-link">
            API
          </SiteLink>
          <a href={meta.repoUrl} className="footer-link">
            GitHub
          </a>
          <a href={meta.npmUrl} className="footer-link">
            npm
          </a>
          <SiteLink href={GENERATED_FILES.llmsTxt.path} className="footer-link">
            llms.txt
          </SiteLink>
        </nav>
      </div>
    </footer>
  );
}
