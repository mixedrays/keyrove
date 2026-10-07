import { useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { useSearchOpen } from '@/components/search.tsx';
import {
  Sidebar,
  SidebarDrawer,
  SidebarToggle,
} from '@/components/sidebar.tsx';
import { SiteFooter, SiteHeader } from '@/components/site-chrome.tsx';
import { Sheet } from '@/components/ui/sheet.tsx';

/**
 * Sidebar, content, rail — and the header and footer around them. Every docs
 * page and the 404 render in here.
 */
export function DocsLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const searching = useSearchOpen();
  const router = useRouter();

  // Search opens over everything; two modal layers would each try to keep
  // focus, so the drawer steps aside for it.
  useEffect(() => {
    if (searching) setDrawerOpen(false);
  }, [searching]);

  // A page loaded from its URL starts with focus on nothing, which is what
  // lets its first demo take it. A client-side navigation would otherwise keep
  // it on the sidebar link that was followed, so it is handed back as the
  // navigation starts — before the new page renders and its demo mounts.
  useEffect(
    () =>
      router.subscribe('onBeforeNavigate', ({ pathChanged }) => {
        if (pathChanged && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }),
    [router],
  );

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SiteHeader layout="docs" menu={<SidebarToggle open={drawerOpen} />} />
      {/* The centre column is `minmax(0, 1fr)` rather than `1fr` so a wide
          code block or table scrolls inside itself instead of stretching the
          grid past the viewport. */}
      <div className="docs-shell">
        <Sidebar onReveal={() => setDrawerOpen(true)} />
        <SidebarDrawer onClose={closeDrawer} />
        {children}
      </div>
      <SiteFooter layout="docs" />
    </Sheet>
  );
}
