import { useEffect, type ReactNode } from 'react';
import { nav, pages } from 'virtual:docs/site';

import { pagePath } from '../../build/addresses.ts';
import { Icon } from '@/components/icon.tsx';
import {
  useKeyboardRail,
  type KeyboardRail,
} from '@/components/keyboard-rail.tsx';
import { SiteLink } from '@/components/site-link.tsx';
import { Button } from '@/components/ui/button.tsx';
import { SheetContent, SheetTrigger } from '@/components/ui/sheet.tsx';

/**
 * The docs navigation: a sticky column from `lg` up, and below it a drawer the
 * header's menu button slides in. Both draw the same groups — derived from
 * the content, so adding a page adds its link — and both move on keyrove's
 * arrows with one tab stop, which starts on the current page.
 */

const RAIL: KeyboardRail = {
  items: '.sidebar-link',
  shortcut: { combo: 'alt+shift+KeyE', label: 'Alt+Shift+E' },
  stop: '[aria-current="page"]',
};

/** Tailwind's `lg`, where the column replaces the drawer. */
const DESKTOP = '(min-width: 64rem)';

function SidebarNav({ hint }: { hint: ReactNode }) {
  return (
    <nav className="sidebar-nav" aria-label="Docs">
      {nav.map((entry, index) => (
        <div className="sidebar-group" key={entry.label}>
          {index === 0 && hint}
          <p className="sidebar-heading">{entry.label}</p>
          <ul>
            {/* Pages first, then whatever the group carries that is not one —
                the generated llms.txt, which has no route to mark as current. */}
            {entry.pages.map((route) => (
              <li key={route}>
                <SiteLink href={pagePath(route)} className="sidebar-link">
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
export function Sidebar() {
  const rail = useKeyboardRail(RAIL);

  return (
    <aside {...rail.props} id="docs-sidebar" className="sidebar">
      <SidebarNav hint={rail.hint} />
    </aside>
  );
}

/**
 * The drawer, below `lg`. Base UI's sheet traps focus while it is open, closes
 * on Escape and on the backdrop, and hands focus back to the menu button; it
 * opens on the current page's link. Below `lg` the chord opens it, too.
 */
export function SidebarDrawer({
  onOpen,
  onClose,
}: {
  onOpen: () => void;
  onClose: () => void;
}) {
  const rail = useKeyboardRail({
    ...RAIL,
    reveal: () => {
      if (matchMedia(DESKTOP).matches) return false;
      onOpen();
      return true;
    },
  });

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
      {...rail.props}
      id="docs-sidebar-drawer"
      side="left"
      className="sidebar-drawer"
      overlayClassName="sidebar-backdrop"
      aria-label="Navigation"
      initialFocus={() => rail.findStop() ?? true}
      // Navigating within the drawer should not leave it covering the page it
      // just moved to.
      onClick={(event) => {
        if ((event.target as Element).closest('a')) onClose();
      }}
    >
      <SidebarNav hint={rail.hint} />
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
