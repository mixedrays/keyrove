import { useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { RAIL_ATTR } from '@/components/keyboard-rail.tsx';
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
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const searching = useSearchOpen();
  const router = useRouter();

  // Search opens over everything; two modal layers would each try to keep
  // focus, so the drawer steps aside for it.
  useEffect(() => {
    if (searching) setDrawerOpen(false);
  }, [searching]);

  // A page loaded from its URL starts with focus on nothing, which is what
  // lets its first demo take it, so a client-side navigation hands focus back
  // as it starts — before the new page renders and its demo mounts. Except
  // from a rail: a reader who followed a sidebar link keeps its arrows.
  useEffect(
    () =>
      router.subscribe('onBeforeNavigate', ({ pathChanged }) => {
        const active = document.activeElement;
        if (
          pathChanged &&
          active instanceof HTMLElement &&
          !active.closest(`[${RAIL_ATTR}]`)
        ) {
          active.blur();
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
        <Sidebar />
        <SidebarDrawer onOpen={openDrawer} onClose={closeDrawer} />
        {children}
      </div>
      <SiteFooter layout="docs" />
    </Sheet>
  );
}
