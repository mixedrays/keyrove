import type { GroupOptions } from '@mixedrays/keyrove';

import type { IconName } from './icons.ts';

/**
 * What each docs demo is beyond its markup, in one entry per demo.
 *
 * A demo is a fragment under content/_demos and the entry here of the same
 * name. The fragment is what a reader copies; the entry is everything a page
 * adds to make it run and read well. build/demos.ts reads an entry to stamp
 * the demo, and src/demos.ts reads it to wire one, so neither has a table of
 * demo names of its own to keep in step with the other.
 *
 * Nothing here touches the filesystem, and the types are all it takes from
 * keyrove and the icon set, so the browser bundle imports it too.
 */

/**
 * Behaviour a demo runs beyond navigation, chained after `keyRove` in the
 * order listed, so a key one leaves alone falls through to the next exactly
 * as the pages' own `||` chains do. src/demos.ts implements each one.
 *
 * - `typeahead` finds an item by its label, with the demo's `group`.
 * - `selection` is the listbox's pick: Space, Enter or a click.
 * - `folds` opens and closes the sidebar's folders.
 * - `branches` opens, closes and steps through the tree's folders.
 */
export type DemoExtra = 'typeahead' | 'selection' | 'folds' | 'branches';

/** One icon, or a folder's pair, which `aria-expanded` picks between. */
export type ItemIcon = IconName | { closed: IconName; open: IconName };

/** A live item, as an entry's `icons` sees it. */
type DemoItem = {
  /** The item's text, trimmed. */
  label: string;
  /** Whether it carries `aria-expanded`: a folder rather than a file. */
  expandable: boolean;
};

export type DemoDefinition = {
  /**
   * The settings the group is described with, for a demo described in
   * JavaScript rather than in markup. Handed to every handler exactly as the
   * page's snippet hands it to them. Without one, the group is configured by
   * its own attributes, which is what every other page teaches.
   */
  group?: GroupOptions;
  /** What runs after navigation, in order. Without any, navigation alone. */
  extras?: readonly DemoExtra[];
  /**
   * Decorative icons for the live preview, by item label or worked out per
   * item. Presentation only: the source block stays the fragment as written,
   * and the icons are `aria-hidden`, so labels and typeahead are unchanged.
   * Only items whose content is plain text are decorated.
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

/**
 * Every demo, by the name of its file under content/_demos.
 *
 * Typeahead is opted into rather than given to every list: on a page that
 * never mentions it, letters doing something would be a surprise.
 */
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
  // Described in JavaScript, so its typeahead is handed the same object as
  // navigation, which is the point the options page makes.
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
  // A row inside a closed folder is still in the DOM, so it is still an item;
  // `skip` is what keeps a move from landing on one nobody can see.
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

/** The entry for a demo, or a build-stopping error naming the one missing. */
export const demoDefinition = (name: string): DemoDefinition => {
  if (!Object.hasOwn(DEMO_DEFINITIONS, name)) {
    throw new Error(
      `[docs] no demo named "${name}" in build/demo-definitions.ts.`,
    );
  }

  return DEMO_DEFINITIONS[name];
};
