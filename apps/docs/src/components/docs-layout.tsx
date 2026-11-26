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

export function DocsLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const searching = useSearchOpen();
  const router = useRouter();

  // Two modal layers would fight over focus, so the drawer yields to search.
  useEffect(() => {
    if (searching) setDrawerOpen(false);
  }, [searching]);

  // Release focus as navigation starts, so the new page's first demo can take
  // it as on a fresh load.
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
      {/* `minmax(0, 1fr)`, so wide blocks scroll rather than stretch the grid. */}
      <div className="docs-shell">
        <Sidebar />
        <SidebarDrawer onOpen={openDrawer} onClose={closeDrawer} />
        {children}
      </div>
      <SiteFooter layout="docs" />
    </Sheet>
  );
}
