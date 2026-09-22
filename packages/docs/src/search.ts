import type { SearchDocument } from './search-model.ts';

type Search = (query: string) => SearchDocument[];

/** Show the words around a match; use textContent when inserting authored text. */
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

export const mountSearch = () => {
  const dialog = document.querySelector<HTMLDialogElement>('#docs-search');
  const trigger =
    document.querySelector<HTMLButtonElement>('[data-search-open]');
  const input = dialog?.querySelector<HTMLInputElement>('#search-input');
  const list = dialog?.querySelector<HTMLUListElement>('#search-results');
  const status = dialog?.querySelector<HTMLElement>('[data-search-status]');
  const retry = dialog?.querySelector<HTMLButtonElement>('[data-search-retry]');
  if (!dialog || !trigger || !input || !list || !status || !retry) return;

  let search: Promise<Search> | undefined;
  let results: SearchDocument[] = [];
  let selected = -1;
  let revision = 0;
  let opener: HTMLElement | null = null;

  const load = () => {
    search ??= Promise.all([
      import('./search-engine.ts'),
      fetch(`${import.meta.env.BASE_URL}search-index.json`).then((response) => {
        if (!response.ok) throw new Error(`Search index: ${response.status}`);
        return response.text();
      }),
    ])
      .then(([engine, serialized]) => engine.loadSearch(serialized))
      .catch((error) => {
        search = undefined;
        throw error;
      });
    return search;
  };

  const select = (index: number, scroll = false) => {
    selected = index;
    [...list.children].forEach((element, position) => {
      element.setAttribute('aria-selected', String(position === selected));
    });
    const active = list.children[selected];
    if (active) {
      input.setAttribute('aria-activedescendant', active.id);
      if (scroll) active.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const update = async () => {
    const current = ++revision;
    const query = input.value.trim();
    results = [];
    select(-1);
    list.replaceChildren();
    list.setAttribute('aria-busy', 'true');
    retry.hidden = true;
    status.textContent = 'Loading search…';
    try {
      const find = await load();
      if (current !== revision || !dialog.open) return;
      results = query ? find(query) : [];
      const fragment = document.createDocumentFragment();
      results.forEach((result, index) => {
        const option = document.createElement('li');
        option.id = `search-result-${index}`;
        option.className = 'search-result';
        option.setAttribute('role', 'option');
        option.dataset.index = String(index);
        const title = document.createElement('span');
        title.className = 'search-result-title';
        title.textContent = result.heading || result.title;
        const page = document.createElement('span');
        page.className = 'search-result-page';
        page.textContent = result.heading ? result.title : 'Documentation';
        const snippet = document.createElement('span');
        snippet.className = 'search-result-snippet';
        snippet.textContent = excerpt(result.text, query);
        option.append(page, title, snippet);
        fragment.append(option);
      });
      list.replaceChildren(fragment);
      list.scrollTop = 0;
      select(results.length ? 0 : -1);
      status.textContent = !query
        ? 'Search pages, API methods, and examples.'
        : results.length
          ? `${results.length === 12 ? 'Showing the top 12 results' : `${results.length} result${results.length === 1 ? '' : 's'}`}.`
          : `No results for “${query}”. Try another term.`;
    } catch {
      if (current !== revision || !dialog.open) return;
      status.textContent =
        'Search could not load. Check your connection and try again.';
      retry.hidden = false;
    } finally {
      if (current === revision) list.setAttribute('aria-busy', 'false');
    }
  };

  const open = () => {
    if (!dialog.open) {
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : trigger;
      dialog.showModal();
      document.documentElement.setAttribute('data-search-modal-open', '');
      input.setAttribute('aria-expanded', 'true');
      void update();
    }
    input.focus();
    input.select();
  };

  const navigate = (index: number) => {
    const result = results[index];
    if (!result) return;
    dialog.close();
    window.location.assign(result.url);
  };

  trigger.hidden = false;
  const shortcut = trigger.querySelector('[data-search-shortcut]');
  if (shortcut)
    shortcut.textContent = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      ? '⌘ K'
      : 'Ctrl K';
  trigger.addEventListener('click', open);
  dialog
    .querySelector('[data-search-close]')
    ?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    revision++;
    document.documentElement.removeAttribute('data-search-modal-open');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    opener?.focus({ preventScroll: true });
  });
  input.addEventListener('input', (event) => {
    if (!(event instanceof InputEvent) || !event.isComposing) void update();
  });
  input.addEventListener('compositionend', () => void update());
  retry.addEventListener('click', () => {
    input.focus();
    void update();
  });
  input.addEventListener('keydown', (event) => {
    if (
      event.isComposing ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    if (
      (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
      results.length
    ) {
      event.preventDefault();
      select(
        (selected + (event.key === 'ArrowDown' ? 1 : -1) + results.length) %
          results.length,
        true,
      );
    } else if (event.key === 'Enter' && selected >= 0) {
      event.preventDefault();
      navigate(selected);
    }
  });
  list.addEventListener('pointerdown', (event) => event.preventDefault());
  list.addEventListener('click', (event) => {
    const option = (event.target as Element).closest<HTMLElement>(
      '[data-index]',
    );
    if (option) navigate(Number(option.dataset.index));
  });
  document.addEventListener('keydown', (event) => {
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
    if (!event.repeat) open();
  });
};
