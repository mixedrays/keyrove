import { followFocus, initRovingTabindex, keyRove } from '@mixedrays/keyrove';
import { useLocation } from '@tanstack/react-router';
import { useCallback, useEffect, useRef } from 'react';
import { nav, pages } from 'virtual:docs/site';

import { Icon } from '@/components/icon.tsx';
import {
  KeysHint,
  navGroup,
  useNavShortcut,
  useRovingStop,
  type NavShortcut,
} from '@/components/nav-keys.tsx';
import { SiteLink } from '@/components/site-link.tsx';
import { Button } from '@/components/ui/button.tsx';
import { SheetContent, SheetTrigger } from '@/components/ui/sheet.tsx';

/**
 * The docs navigation: a sticky column from `lg` up, and below it a drawer the
 * header's menu button slides in. Both draw the same groups — derived from
 * the content, so adding a page adds its link — and both move on keyrove's
 * arrows with one tab stop, which starts on the current page.
 */

const SHORTCUT: NavShortcut = { combo: 'alt+shift+KeyE', label: 'Alt+Shift+E' };

const group = navGroup('.sidebar-link');

/** Tailwind's `lg`, where the column replaces the drawer. */
const DESKTOP = '(min-width: 64rem)';

function SidebarNav() {
  return (
    <nav className="sidebar-nav" aria-label="Docs">
      {nav.map((entry, index) => (
        <div className="sidebar-group" key={entry.label}>
          {index === 0 && <KeysHint label={SHORTCUT.label} />}
          <p className="sidebar-heading">{entry.label}</p>
          <ul>
            {/* Pages first, then whatever the group carries that is not one —
                the generated llms.txt, which has no route to mark as current. */}
            {entry.pages.map((route) => (
              <li key={route}>
                <SiteLink href={`/${route}`} className="sidebar-link">
                  {pages[route].title}
                </SiteLink>
              </li>
            ))}
            {entry.links.map((link) => (
              <li key={link.href}>
                <SiteLink href={link.href} className="sidebar-link">
                  {link.label}
                </SiteLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** The column, from `lg` up. Hidden below it, where the drawer stands in. */
export function Sidebar({ onReveal }: { onReveal: () => void }) {
  const root = useRef<HTMLElement>(null);
  const pathname = useLocation({ select: (location) => location.pathname });

  useRovingStop(root, group, '[aria-current="page"]', pathname);
  useNavShortcut(root, group, SHORTCUT, () => {
    if (matchMedia(DESKTOP).matches) return false;
    onReveal();
    return true;
  });

  return (
    <aside
      ref={root}
      id="docs-sidebar"
      className="sidebar"
      aria-keyshortcuts={SHORTCUT.label}
      onKeyDown={(event) => keyRove(event, group)}
      onFocus={(event) => followFocus(event, group)}
    >
      <SidebarNav />
    </aside>
  );
}

/**
 * The drawer, below `lg`. Base UI's sheet traps focus while it is open, closes
 * on Escape and on the backdrop, and hands focus back to the menu button; it
 * opens on the current page's link.
 */
export function SidebarDrawer({ onClose }: { onClose: () => void }) {
  const root = useRef<HTMLDivElement | null>(null);

  // The drawer's links exist only while it is open, so its tab stop is set
  // as they arrive rather than on navigation.
  const attach = useCallback((element: HTMLDivElement | null) => {
    root.current = element;
    if (element) {
      initRovingTabindex(element, {
        ...group,
        initial: element.querySelector('[aria-current="page"]'),
      });
    }
  }, []);

  // The drawer is the narrow layout's alone; widening the window past `lg`
  // with it open would leave a backdrop over the column that replaced it.
  useEffect(() => {
    const query = matchMedia(DESKTOP);
    const onChange = () => query.matches && onClose();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [onClose]);

  return (
    <SheetContent
      ref={attach}
      id="docs-sidebar-drawer"
      side="left"
      className="sidebar-drawer"
      overlayClassName="sidebar-backdrop"
      aria-label="Navigation"
      initialFocus={() =>
        root.current?.querySelector<HTMLElement>('[aria-current="page"]') ??
        true
      }
      onKeyDown={(event) => keyRove(event, group)}
      onFocus={(event) => followFocus(event, group)}
      // Navigating within the drawer should not leave it covering the page it
      // just moved to.
      onClick={(event) => {
        if ((event.target as Element).closest('a')) onClose();
      }}
    >
      <SidebarNav />
    </SheetContent>
  );
}

/** The header's menu button, which only has a drawer to open below `lg`. */
export function SidebarToggle({ open }: { open: boolean }) {
  return (
    <SheetTrigger
      render={
        <Button
          variant="icon"
          className="lg:hidden"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
        />
      }
    >
      <Icon name="menu" className="size-4" />
    </SheetTrigger>
  );
}
