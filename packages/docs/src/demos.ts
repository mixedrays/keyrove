import {
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_SKIP,
  keyRove,
  type Callbacks,
} from '@mixedrays/keyrove';

/**
 * The live demos embedded in the docs.
 *
 * Markdown only writes the placeholder — `<div data-demo="grid"></div>` — and
 * everything about the demo's shape lives here. That keeps the content files
 * readable as markdown (which matters, since they are also served as markdown)
 * and keeps a 24-item list from costing 24 lines of prose.
 */

type ItemSpec = {
  label: string;
  /** Rendered but not navigable — a section heading, say. */
  skip?: boolean;
};

type DemoSpec = {
  items: ItemSpec[];
  /** The element the items are rendered as. */
  itemTag?: 'li' | 'button';
  /** The element holding them; `ul` unless the demo is not a list. */
  rootTag?: 'ul' | 'div';
  roving?: boolean;
  /** Extra classes for the surface — layout, scrolling. */
  surfaceClass?: string;
  /** keyrove configuration, applied to the surface. */
  attributes?: Record<string, string>;
};

const range = (count: number, label: (n: number) => string): ItemSpec[] =>
  Array.from({ length: count }, (_, i) => ({ label: label(i + 1) }));

const DEMOS = {
  list: {
    items: range(24, (n) => `Item ${n}`),
    surfaceClass: 'max-h-60 overflow-y-auto',
    attributes: { 'data-keyrove-page-length': '5' },
  },
  grid: {
    items: range(24, (n) => String(n)),
    itemTag: 'button',
    rootTag: 'div',
    surfaceClass: 'grid grid-cols-6 gap-1.5',
    attributes: {
      'data-keyrove-cols-length': '6',
      'data-keyrove-page-length': '2',
    },
  },
  roving: {
    items: range(6, (n) => `Option ${n}`),
    roving: true,
  },
  skip: {
    items: [
      { label: 'Recent', skip: true },
      { label: 'quarterly-report.pdf' },
      { label: 'budget-v3.xlsx' },
      { label: 'Shared with me', skip: true },
      { label: 'roadmap.md' },
      { label: 'design-review.fig' },
      { label: 'Archived', skip: true },
      { label: 'notes-2023.txt' },
    ],
  },
  keys: {
    items: [
      { label: 'Bold' },
      { label: 'Italic' },
      { label: 'Underline' },
      { label: 'Link' },
      { label: 'Code' },
    ],
    itemTag: 'button',
    rootTag: 'div',
    surfaceClass: 'flex flex-wrap gap-1.5',
    attributes: {
      'data-keyrove-next-key': 'ArrowRight',
      'data-keyrove-prev-key': 'ArrowLeft',
    },
  },
} satisfies Record<string, DemoSpec>;

type DemoName = keyof typeof DEMOS;

/** Reports each move into the demo's log, so the key that fired is visible. */
const reportKeys = (log: HTMLElement): Callbacks => {
  const announce =
    (action: string) =>
    ({ focused }: { focused: Element | null }) => {
      log.textContent = `${action} → ${focused?.textContent?.trim() ?? '—'}`;
    };

  return {
    next: announce('next'),
    prev: announce('prev'),
    home: announce('home'),
    end: announce('end'),
    pageUp: announce('pageUp'),
    pageDown: announce('pageDown'),
  };
};

const buildItems = (surface: HTMLElement, spec: DemoSpec) => {
  const tag = spec.itemTag ?? 'li';
  let firstNavigableSeen = false;

  for (const { label, skip } of spec.items) {
    const item = document.createElement(tag);
    item.className = 'item';
    item.textContent = label;

    // Grid cells and toolbar buttons size to content instead of filling a row.
    if (tag === 'button') item.classList.add('w-auto', 'text-center');

    if (skip) {
      item.setAttribute(KEYROVE_ATTR_SKIP, '');
      item.classList.add('item-skipped');
    }

    item.setAttribute(KEYROVE_ATTR_ITEM, '');

    if (spec.roving) {
      item.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, '');
      // A roving group holds exactly one tab stop, on the first navigable item.
      const isFirstStop = !skip && !firstNavigableSeen;
      item.tabIndex = isFirstStop ? 0 : -1;
      if (isFirstStop) firstNavigableSeen = true;
    } else {
      item.tabIndex = 0;
    }

    surface.append(item);
  }
};

const isDemoName = (name: string): name is DemoName => name in DEMOS;

/** Builds every demo the current page asked for. */
export const mountDemos = () => {
  for (const host of document.querySelectorAll<HTMLElement>('[data-demo]')) {
    const name = host.dataset.demo ?? '';
    if (!isDemoName(name)) continue;

    const spec: DemoSpec = DEMOS[name];
    // Typed as the base element: a `'ul' | 'div'` argument leaves
    // `createElement` returning a union, which loses addEventListener's
    // event map and with it the keydown event's type.
    const surface: HTMLElement = document.createElement(spec.rootTag ?? 'ul');
    surface.className = `demo-surface ${spec.surfaceClass ?? ''}`;

    for (const [attribute, value] of Object.entries(spec.attributes ?? {})) {
      surface.setAttribute(attribute, value);
    }

    buildItems(surface, spec);

    const log = document.createElement('output');
    log.className = 'log';
    log.textContent = 'Waiting for a keypress…';

    const callbacks = reportKeys(log);
    surface.addEventListener('keydown', (e) => keyRove(e, { callbacks }));

    host.classList.add('demo');
    host.append(surface, log);
  }
};
