import { useHydrated } from '@tanstack/react-router';
import {
  Suspense,
  createContext,
  lazy,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Icon } from '@/components/icon.tsx';
import { Button } from '@/components/ui/button.tsx';
import { isApple } from '@/lib/utils.ts';

// The dialog, engine and index load on first use, not with the page.

const loadDialog = () => import('@/components/search-dialog.tsx');
const SearchDialog = lazy(loadDialog);

const SearchContext = createContext<{ open: boolean; show: () => void }>({
  open: false,
  show: () => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Stays mounted after first open, so the query survives and reopening is instant.
  const [mounted, setMounted] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  const show = () => {
    if (document.activeElement instanceof HTMLElement) {
      opener.current = document.activeElement;
    }
    setMounted(true);
    setOpen(true);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.shiftKey ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== 'k'
      )
        return;
      event.preventDefault();
      if (!event.repeat) show();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <SearchContext value={{ open, show }}>
      {children}
      {mounted && (
        <Suspense>
          <SearchDialog open={open} onOpenChange={setOpen} opener={opener} />
        </Suspense>
      )}
    </SearchContext>
  );
}

export const useSearchOpen = () => useContext(SearchContext).open;

/** Hidden until the bundle runs: there is no search without it. */
export function SearchTrigger() {
  const { open, show } = useContext(SearchContext);
  const hydrated = useHydrated();
  const [shortcut, setShortcut] = useState('Ctrl K');

  useEffect(() => {
    if (isApple()) setShortcut('⌘ K');
  }, []);

  return (
    <Button
      className="search-trigger"
      hidden={!hydrated}
      aria-label="Search documentation"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? 'docs-search' : undefined}
      aria-keyshortcuts="Meta+k Control+k"
      onClick={show}
      // A pointer on its way to the button starts the dialog's download.
      onPointerEnter={() => void loadDialog()}
      onFocus={() => void loadDialog()}
    >
      <Icon name="search" className="size-4" />
      <span className="hidden lg:inline">Search</span>
      <kbd className="hidden sm:inline">{shortcut}</kbd>
    </Button>
  );
}
