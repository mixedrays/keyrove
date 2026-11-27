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

export function Sidebar() {
  const rail = useKeyboardRail(RAIL);

  return (
    <aside {...rail.props} id="docs-sidebar" className="sidebar">
      <SidebarNav hint={rail.hint} />
    </aside>
  );
}

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

  // Widening past `lg` while open would leave a backdrop over the column.
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
      onClick={(event) => {
        if ((event.target as Element).closest('a')) onClose();
      }}
    >
      <SidebarNav hint={rail.hint} />
    </SheetContent>
  );
}

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
