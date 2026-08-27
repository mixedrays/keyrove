import {
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROOT,
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

/** A nested navigation root, rendered where an item would otherwise go. */
type GroupSpec = { group: DemoSpec };

type Entry = ItemSpec | GroupSpec;

type DemoSpec = {
  items: Entry[];
  /** The element the items are rendered as. */
  itemTag?: 'li' | 'button';
  /** The element holding them; `ul` unless the demo is not a list. */
  rootTag?: 'ul' | 'div' | 'li';
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
  nested: {
    items: [
      {
        // A reaction row inside the menu: its own root, so it reads
        // horizontally while the menu around it stays vertical. An `li`
        // because the surface holding it is a `ul`.
        group: {
          items: [
            { label: '👍' },
            { label: '❤️' },
            { label: '😂' },
            { label: '🎉' },
            { label: '👀' },
          ],
          itemTag: 'button',
          rootTag: 'li',
          surfaceClass: 'demo-nested flex gap-1.5',
          attributes: {
            'data-keyrove-next-key': 'ArrowRight',
            'data-keyrove-prev-key': 'ArrowLeft',
          },
        },
      },
      { label: 'Reply' },
      { label: 'Reply in thread' },
      { label: 'Copy link' },
      { label: 'Pin to channel' },
      { label: 'Delete message' },
    ],
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

const isGroup = (entry: Entry): entry is GroupSpec => 'group' in entry;

const buildItems = (surface: HTMLElement, spec: DemoSpec) => {
  const tag = spec.itemTag ?? 'li';
  let firstNavigableSeen = false;

  for (const entry of spec.items) {
    if (isGroup(entry)) {
      surface.append(buildSurface(entry.group, { nested: true }));
      continue;
    }

    const { label, skip } = entry;
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

const buildSurface = (
  spec: DemoSpec,
  { nested = false }: { nested?: boolean } = {},
): HTMLElement => {
  // Typed as the base element: a `'ul' | 'div'` argument leaves
  // `createElement` returning a union, which loses addEventListener's
  // event map and with it the keydown event's type.
  const surface: HTMLElement = document.createElement(spec.rootTag ?? 'ul');
  surface.className = `demo-surface ${spec.surfaceClass ?? ''}`;

  // The outermost surface is the listener's element, which keyrove already
  // takes as the root; a nested one has to declare itself one. From then on the
  // nearest root wins, so this group's attributes govern while focus is inside
  // it — and nothing is inherited from the surface around it.
  if (nested) surface.setAttribute(KEYROVE_ATTR_ROOT, '');

  for (const [attribute, value] of Object.entries(spec.attributes ?? {})) {
    surface.setAttribute(attribute, value);
  }

  buildItems(surface, spec);

  return surface;
};

/**
 * Escape, out of a nested group.
 *
 * Navigation stops at the nearest root, so no key pressed inside a nested group
 * reaches the group around it — getting back out is the app's job. This is the
 * smallest version of it: hand focus to the item beside the group.
 */
const wireGroupExit = (surface: HTMLElement) => {
  const groups = surface.querySelectorAll<HTMLElement>(
    `[${KEYROVE_ATTR_ROOT}]`,
  );

  for (const group of groups) {
    group.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;

      const exit = [
        group.nextElementSibling,
        group.previousElementSibling,
      ].find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement &&
          el.hasAttribute(KEYROVE_ATTR_ITEM) &&
          !el.hasAttribute(KEYROVE_ATTR_SKIP),
      );

      exit?.focus();
    });
  }
};

const isDemoName = (name: string): name is DemoName => name in DEMOS;

/** Builds every demo the current page asked for. */
export const mountDemos = () => {
  for (const host of document.querySelectorAll<HTMLElement>('[data-demo]')) {
    const name = host.dataset.demo ?? '';
    if (!isDemoName(name)) continue;

    const surface = buildSurface(DEMOS[name]);

    const log = document.createElement('output');
    log.className = 'log';
    log.textContent = 'Waiting for a keypress…';

    const callbacks = reportKeys(log);
    // One listener for the demo, nested roots included: the event bubbles here
    // and keyrove resolves the root from its target, not from this element.
    surface.addEventListener('keydown', (e) => keyRove(e, { callbacks }));
    wireGroupExit(surface);

    host.classList.add('demo');
    host.append(surface, log);
  }
};
