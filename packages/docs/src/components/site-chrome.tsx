import type { ReactNode } from 'react';
import { meta } from 'virtual:docs/site';

import { Icon } from '@/components/icon.tsx';
import { SearchTrigger } from '@/components/search.tsx';
import { SiteLink } from '@/components/site-link.tsx';
import { ThemeToggle } from '@/components/theme-toggle.tsx';

/**
 * The header and footer every page shares.
 *
 * The landing page's content is narrower than the docs grid; the header and
 * footer rows track whichever the page between them uses.
 */

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
      <div
        className={
          layout === 'landing' ? 'header-row header-row-narrow' : 'header-row'
        }
      >
        <div className="flex items-center gap-2">
          {menu}
          <SiteLink href="/" className="wordmark">
            <Icon name="keyboard" className="size-6" />
            keyrove
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
            {/* A hair smaller than its neighbours: the npm mark is a solid
                block where the rest of the set is drawn in outline, so at a
                matching size it reads heavier than everything beside it. */}
            <a href={meta.npmUrl} className="header-link">
              <Icon name="npm" className="size-3.5" />
              npm
            </a>
          </nav>
          {/* The nav is hidden on narrow screens, so the repo keeps an
              icon-only stop in the header there rather than dropping out of
              it entirely. */}
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

/**
 * The foot of every page: what the package is, and the places a reader is
 * most likely to want next, including llms.txt, which is otherwise linked
 * only from the sidebar. The row takes the header's width, so the two frame
 * the same column.
 */
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
            <Icon name="keyboard" className="size-5" />
            keyrove
          </SiteLink>
          <span>
            v{meta.packageVersion} &middot;{' '}
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
          <SiteLink href="/llms.txt" className="footer-link">
            llms.txt
          </SiteLink>
        </nav>
      </div>
    </footer>
  );
}
