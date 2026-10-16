import type { DemoDefinition, ItemIcon } from './demo-definitions.ts';
import { icon } from './icons.ts';

// Only plain-text demo items are decorated. The nested reaction buttons
// already have emoji; grids use their time and month labels on their own.
const ITEM =
  /<(li|button|div)\b([^>]*\b(?:data-keyrove-item|role="(?:menuitem|treeitem)")[^>]*)>([^<]*)<\/\1>/g;

const draw = (glyph: ItemIcon) =>
  typeof glyph === 'string'
    ? icon(glyph, 'demo-item-icon')
    : icon(glyph.closed, 'demo-item-icon demo-item-icon--closed') +
      icon(glyph.open, 'demo-item-icon demo-item-icon--open');

/**
 * Add a demo definition's decorative icons to the live preview at build time.
 * Copied navigation examples stay minimal, and the aria-hidden SVGs leave
 * labels and typeahead unchanged.
 */
export const decorateDemo = (
  markup: string,
  icons: DemoDefinition['icons'],
): string => {
  if (!icons) return markup;

  return markup.replace(
    ITEM,
    (original, tag: string, attrs: string, text: string) => {
      const label = text.trim();
      const glyph =
        typeof icons === 'function'
          ? icons({ label, expandable: attrs.includes('aria-expanded=') })
          : Object.hasOwn(icons, label)
            ? icons[label]
            : undefined;

      return glyph
        ? `<${tag}${attrs}>${draw(glyph)}${text}</${tag}>`
        : original;
    },
  );
};
