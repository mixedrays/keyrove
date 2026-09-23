import { icon, type IconName } from './icons.ts';

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

const ITEMS: Record<string, Record<string, IconName>> = {
  'landing-loop': FOLDERS,
  'landing-horizontal': FOLDERS,
  'landing-roving': FOLDERS,
  menu: {
    'Copy link': 'link',
    'Email a copy': 'mail',
    'Export as PDF': 'file-download',
    'Post to Slack': 'message',
    'Open in Figma': 'pen',
  },
  tools: TOOLS,
  'landing-tools': TOOLS,
  nested: {
    Reply: 'reply',
    'Reply in thread': 'message',
    'Copy link': 'link',
    'Pin to channel': 'pin',
    'Delete message': 'trash',
  },
};

// Only plain-text demo items are decorated. The nested reaction buttons
// already have emoji; grids use their time and month labels on their own.
const ITEM =
  /<(li|button|div)\b([^>]*\b(?:data-keyrove-item|role="(?:menuitem|treeitem)")[^>]*)>([^<]*)<\/\1>/g;

/**
 * Add decorative icons to the live preview at build time. Like the detailed
 * demos' CSS icons, these are presentation: copied navigation examples stay
 * minimal and the aria-hidden SVGs leave labels and typeahead unchanged.
 */
export const decorateDemo = (name: string, markup: string): string =>
  markup.replace(ITEM, (original, tag: string, attrs: string, text: string) => {
    const label = text.trim();
    let glyph: string;
    if (name === 'tree') {
      if (attrs.includes('aria-expanded=')) {
        glyph =
          icon('folder', 'demo-item-icon demo-item-icon--closed') +
          icon('folder-open', 'demo-item-icon demo-item-icon--open');
      } else {
        const fileIcon = label.endsWith('.json')
          ? 'file-json'
          : /\.(tsx?|css)$/.test(label)
            ? 'file-code'
            : 'file-text';
        glyph = icon(fileIcon, 'demo-item-icon');
      }
    } else {
      const itemIcon = ITEMS[name]?.[label];
      if (!itemIcon) return original;
      glyph = icon(itemIcon, 'demo-item-icon');
    }
    return `<${tag}${attrs}>${glyph}${text}</${tag}>`;
  });
