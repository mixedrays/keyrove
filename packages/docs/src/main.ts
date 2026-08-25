import {
  KEYROVE_ATTR_ITEM,
  KEYROVE_ATTR_ROVING_TABINDEX,
  KEYROVE_ATTR_SKIP,
  keyRove,
  type Callbacks,
} from '@mixedrays/keyrove';
import { Braces, ExternalLink, Keyboard, Rocket, createElement } from 'lucide';

import './style.css';

/**
 * Wiring for the live demos.
 *
 * The markup lives in index.html; items are generated here so a list long
 * enough to show off PageUp/PageDown doesn't take 30 lines of HTML.
 */

type ItemSpec = {
  label: string;
  /** Rendered but not navigable — a section heading, say. */
  skip?: boolean;
};

const reportKeys = (name: string) => {
  const log = document.querySelector<HTMLOutputElement>(`[data-log="${name}"]`);
  if (!log) return {};

  const announce = (action: string) => (({ focused }: { focused: Element | null }) => {
    log.textContent = `${action} → ${focused?.textContent?.trim() ?? '—'}`;
  });

  return {
    next: announce('next'),
    prev: announce('prev'),
    home: announce('home'),
    end: announce('end'),
    pageUp: announce('pageUp'),
    pageDown: announce('pageDown'),
  } satisfies Callbacks;
};

const buildDemo = ({
  name,
  items,
  itemTag = 'li',
  roving = false,
}: {
  name: string;
  items: ItemSpec[];
  itemTag?: string;
  roving?: boolean;
}) => {
  const root = document.querySelector<HTMLElement>(`[data-demo="${name}"]`);
  if (!root) return;

  let firstNavigableSeen = false;

  for (const spec of items) {
    const item = document.createElement(itemTag);
    item.className = 'item';
    item.textContent = spec.label;

    // Grid cells and toolbar buttons size to content instead of filling a row.
    if (itemTag === 'button') item.classList.add('w-auto', 'text-center');

    if (spec.skip) {
      item.setAttribute(KEYROVE_ATTR_SKIP, '');
      item.classList.add('item-skipped');
    }

    item.setAttribute(KEYROVE_ATTR_ITEM, '');

    if (roving) {
      item.setAttribute(KEYROVE_ATTR_ROVING_TABINDEX, '');
      // A roving group holds exactly one tab stop, on the first navigable item.
      const isFirstStop = !spec.skip && !firstNavigableSeen;
      item.tabIndex = isFirstStop ? 0 : -1;
      if (isFirstStop) firstNavigableSeen = true;
    } else {
      item.tabIndex = 0;
    }

    root.append(item);
  }

  const callbacks = reportKeys(name);
  root.addEventListener('keydown', (e) => keyRove(e, { callbacks }));
};

const range = (count: number, label: (n: number) => string): ItemSpec[] =>
  Array.from({ length: count }, (_, i) => ({ label: label(i + 1) }));

buildDemo({
  name: 'list',
  items: range(24, (n) => `Item ${n}`),
});

buildDemo({
  name: 'grid',
  items: range(24, (n) => String(n)),
  itemTag: 'button',
});

buildDemo({
  name: 'roving',
  items: range(6, (n) => `Option ${n}`),
  roving: true,
});

buildDemo({
  name: 'skip',
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
});

buildDemo({
  name: 'keys',
  items: [
    { label: 'Bold' },
    { label: 'Italic' },
    { label: 'Underline' },
    { label: 'Link' },
    { label: 'Code' },
  ],
  itemTag: 'button',
});

/**
 * Header nav icons.
 *
 * `lucide` rather than `lucide-react`: the site is vanilla TS, and the React
 * binding would pull in react + react-dom for four glyphs. Same icon set,
 * same version. Lucide dropped brand marks in v1, so the repo link gets
 * `ExternalLink` — the label already says GitHub.
 */
const NAV_ICONS = {
  'quick-start': Rocket,
  demos: Keyboard,
  api: Braces,
  github: ExternalLink,
};

for (const [key, icon] of Object.entries(NAV_ICONS)) {
  const slot = document.querySelector(`[data-nav-icon="${key}"]`);
  if (!slot) continue;

  const svg = createElement(icon);
  // The slot reserved `size-4`; carry it over so the row never reflows.
  svg.setAttribute('class', 'size-4 shrink-0');
  svg.setAttribute('aria-hidden', 'true');
  // Lucide's default 2px stroke reads heavy next to 14px nav text.
  svg.setAttribute('stroke-width', '1.75');
  slot.replaceWith(svg);
}
