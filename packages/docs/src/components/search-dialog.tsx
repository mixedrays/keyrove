import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';

import { Icon } from '@/components/icon.tsx';
import { SiteLink } from '@/components/site-link.tsx';
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteStatus,
} from '@/components/ui/autocomplete.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import type { SearchDocument } from '@/search-model.ts';

/**
 * The search dialog itself, in a chunk of its own: src/components/search.tsx
 * loads it the first time search is opened, or a pointer settles on the
 * button that opens it.
 *
 * The engine and `search-index.json` load the first time it opens, too. Base
 * UI's autocomplete owns the keys inside: focus stays in the input, the arrows
 * move a highlight through the results, and Enter follows the highlighted one
 * — the first, until the reader moves it.
 */

type Find = (query: string) => SearchDocument[];

let engine: Promise<Find> | undefined;

/** Loads once and is shared; a failure is forgotten so Retry can try again. */
const loadEngine = () => {
  engine ??= Promise.all([
    import('@/search-engine.ts'),
    fetch(`${import.meta.env.BASE_URL}search-index.json`).then((response) => {
      if (!response.ok) throw new Error(`Search index: ${response.status}`);
      return response.text();
    }),
  ])
    .then(([module, serialized]) => module.loadSearch(serialized))
    .catch((error) => {
      engine = undefined;
      throw error;
    });
  return engine;
};

/** Show the words around a match. */
const excerpt = (text: string, query: string) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const positions = terms
    .map((term) => text.toLowerCase().indexOf(term))
    .filter((position) => position >= 0);
  const start = Math.max(
    0,
    (positions.length ? Math.min(...positions) : 0) - 50,
  );
  const end = Math.min(text.length, start + 180);
  return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
};

type Results =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; query: string; found: SearchDocument[] };

const statusText = (results: Results) => {
  if (results.status === 'loading') return 'Loading search…';
  if (results.status === 'error') {
    return 'Search could not load. Check your connection and try again.';
  }

  const { query, found } = results;
  if (!query) return 'Search pages, API methods, and examples.';
  if (found.length === 0) return `No results for “${query}”. Try another term.`;

  return found.length === 12
    ? 'Showing the top 12 results.'
    : `${found.length} result${found.length === 1 ? '' : 's'}.`;
};

export default function SearchDialog({
  open,
  onOpenChange,
  opener,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where focus goes back to when the dialog closes. */
  opener: RefObject<HTMLElement | null>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  // Following a result moves to another page, where the opener is gone.
  const followed = useRef(false);

  useEffect(() => {
    if (!open) return;

    let current = true;
    const trimmed = query.trim();
    loadEngine()
      .then((find) => {
        if (!current) return;
        setResults({
          status: 'ready',
          query: trimmed,
          found: trimmed ? find(trimmed) : [],
        });
      })
      .catch(() => {
        if (current) setResults({ status: 'error' });
      });

    return () => {
      current = false;
    };
  }, [open, query, attempt]);

  const found = results.status === 'ready' ? results.found : [];

  // Leave modified clicks to the browser (for example, opening a new tab).
  const follow = (event: MouseEvent) => {
    if (
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    followed.current = true;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="docs-search"
        className="search-dialog"
        overlayClassName="search-backdrop"
        initialFocus={() => {
          input.current?.select();
          return input.current;
        }}
        finalFocus={() => {
          const left = followed.current;
          followed.current = false;
          return left ? false : (opener.current ?? true);
        }}
      >
        <Autocomplete
          items={found}
          filter={null}
          inline
          open
          autoHighlight
          value={query}
          onValueChange={setQuery}
          itemToStringValue={(result: SearchDocument) =>
            result.heading || result.title
          }
        >
          <div className="search-panel">
            <DialogTitle render={<h2 />} className="sr-only">
              Search documentation
            </DialogTitle>
            <div className="search-input-row">
              <Icon name="search" className="size-5" />
              <label htmlFor="search-input" className="sr-only">
                Search documentation
              </label>
              <AutocompleteInput
                ref={input}
                id="search-input"
                placeholder="Search documentation…"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="search-help"
                enterKeyHint="go"
              />
              <DialogClose
                render={<Button variant="icon" aria-label="Close search" />}
              >
                <Icon name="close" className="size-4" />
              </DialogClose>
            </div>
            <AutocompleteList
              className="search-results"
              aria-label="Search results"
            >
              {(result: SearchDocument) => (
                <AutocompleteItem
                  key={result.id}
                  value={result}
                  className="search-result"
                  render={<SiteLink href={result.url} />}
                  onClick={follow}
                >
                  <span className="search-result-page">
                    {result.heading ? result.title : 'Documentation'}
                  </span>
                  <span className="search-result-title">
                    {result.heading || result.title}
                  </span>
                  <span className="search-result-snippet">
                    {excerpt(result.text, query)}
                  </span>
                </AutocompleteItem>
              )}
            </AutocompleteList>
            <AutocompleteStatus
              render={<p />}
              className="search-status"
              aria-atomic="true"
            >
              {statusText(results)}
            </AutocompleteStatus>
            <Button
              className="search-retry"
              hidden={results.status !== 'error'}
              onClick={() => {
                input.current?.focus();
                setResults({ status: 'loading' });
                setAttempt((count) => count + 1);
              }}
            >
              Retry search
            </Button>
            <p id="search-help" className="search-help">
              <span>
                <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> to
                select
              </span>
              <span>
                <kbd className="kbd">Enter</kbd> to open
              </span>
              <span>
                <kbd className="kbd">Esc</kbd> to close
              </span>
            </p>
          </div>
        </Autocomplete>
      </DialogContent>
    </Dialog>
  );
}
