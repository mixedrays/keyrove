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

/**
 * The documentation search: a dialog over the page, opened from the header or
 * with ⌘K / Ctrl+K anywhere. The dialog, its engine and its index all load on
 * first use rather than with the page — see src/components/search-dialog.tsx.
 */

const loadDialog = () => import('@/components/search-dialog.tsx');
const SearchDialog = lazy(loadDialog);

const SearchContext = createContext<{ open: boolean; show: () => void }>({
  open: false,
  show: () => {},
});

/** Holds whether search is open, and opens it on ⌘K / Ctrl+K. */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Mounted from the first open on, so that closing it keeps the query and
  // reopening it is instant.
  const [mounted, setMounted] = useState(false);
  // Where focus goes back to on close: wherever it was when search opened.
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

/** Whether search is open, for whatever has to step aside for it. */
export const useSearchOpen = () => useContext(SearchContext).open;

/**
 * The header's search button. Hidden until the bundle has run, since there is
 * no search without it; the chip prints the shortcut as the keycaps do.
 */
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
