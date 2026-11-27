import type { GroupOptions } from '@mixedrays/keyrove';

import type { IconName } from './icons.ts';

// Shared by build and browser, so no filesystem access and type-only imports.

/** Chained after `keyRove` in order, as the pages' `||` chains do. */
export type DemoExtra = 'typeahead' | 'selection' | 'folds' | 'branches';

/** One icon, or a folder's pair, which `aria-expanded` picks between. */
export type ItemIcon = IconName | { closed: IconName; open: IconName };

type DemoItem = {
  label: string;
  /** Carries `aria-expanded`. */
  expandable: boolean;
};

export type DemoDefinition = {
  /** For a demo described in JavaScript; else attributes configure it. */
  group?: GroupOptions;
  extras?: readonly DemoExtra[];
  /**
   * Live preview only, and `aria-hidden`, so labels and typeahead are
   * unchanged. Only plain-text items are decorated.
   */
  icons?: Readonly<Record<string, IconName>> | ((item: DemoItem) => ItemIcon);
};

const FOLDERS: Record<string, IconName> = {
  Inbox: 'inbox',
  Drafts: 'drafts',
  Sent: 'sent',
};

const TOOLS: Record<string, IconName> = {
  Move: 'pointer',
  Frame: 'frame',
  Rectangle: 'square',
  Ellipse: 'circle',
  Pen: 'pen',
  Text: 'type',
  Eyedropper: 'pipette',
  Hand: 'hand',
};

// Typeahead is opt-in: on a page that never mentions it, letters doing
// something would surprise.
export const DEMO_DEFINITIONS: Readonly<Record<string, DemoDefinition>> = {
  editable: {},
  grid: {},
  keys: {
    icons: {
      Bold: 'bold',
      Italic: 'italic',
      Underline: 'underline',
      Link: 'link',
      Code: 'code',
    },
  },
  labels: { extras: ['typeahead'] },
  'landing-grid': {},
  'landing-horizontal': { icons: FOLDERS },
  'landing-loop': { icons: FOLDERS },
  'landing-roving': { icons: FOLDERS },
  'landing-tools': { icons: TOOLS },
  list: {},
  listbox: { extras: ['typeahead', 'selection'] },
  loop: {},
  // Typeahead gets the same object as navigation: the options page's point.
  menu: {
    group: { items: '[role="menuitem"]', loop: true, rovingTabindex: true },
    extras: ['typeahead'],
    icons: {
      'Copy link': 'link',
      'Email a copy': 'mail',
      'Export as PDF': 'file-download',
      'Post to Slack': 'message',
      'Open in Figma': 'pen',
    },
  },
  // The reaction buttons already have emoji; only the menu rows get icons.
  nested: {
    icons: {
      Reply: 'reply',
      'Reply in thread': 'message',
      'Copy link': 'link',
      'Pin to channel': 'pin',
      'Delete message': 'trash',
    },
  },
  orientation: {},
  panes: {},
  responsive: {},
  roving: {
    icons: {
      Backlog: 'circle-dashed',
      'To do': 'circle',
      Blocked: 'circle-slash',
      Review: 'circle-dot',
      Done: 'circle-check',
      Archived: 'archive',
    },
  },
  rtl: {},
  sidebar: { extras: ['folds'] },
  skip: {
    icons: {
      'quarterly-report.pdf': 'file-text',
      'budget-v3-final-FINAL.xlsx': 'file-spreadsheet',
      'roadmap.md': 'file-code',
      'design-review.fig': 'pen',
      'pension-fund.xls': 'file-spreadsheet',
    },
  },
  tools: { icons: TOOLS },
  // Rows in a closed folder are still items; `skip` keeps moves off them.
  tree: {
    group: {
      items: '[role="treeitem"]',
      skip: '[hidden] [role="treeitem"]',
      rovingTabindex: true,
    },
    extras: ['typeahead', 'branches'],
    icons: ({ label, expandable }) =>
      expandable
        ? { closed: 'folder', open: 'folder-open' }
        : label.endsWith('.json')
          ? 'file-json'
          : /\.(tsx?|css)$/.test(label)
            ? 'file-code'
            : 'file-text',
  },
  typeahead: { extras: ['typeahead'] },
};

export const demoDefinition = (name: string): DemoDefinition => {
  if (!Object.hasOwn(DEMO_DEFINITIONS, name)) {
    throw new Error(
      `[docs] no demo named "${name}" in build/demo-definitions.ts.`,
    );
  }

  return DEMO_DEFINITIONS[name];
};
