import type { DemoDefinition, ItemIcon } from './demo-definitions.ts';
import { icon } from './icons.ts';

// The reaction buttons already have emoji; grids keep their labels bare.
const ITEM =
  /<(li|button|div)\b([^>]*\b(?:data-keyrove-item|role="(?:menuitem|treeitem)")[^>]*)>([^<]*)<\/\1>/g;

const draw = (glyph: ItemIcon) =>
  typeof glyph === 'string'
    ? icon(glyph, 'demo-item-icon')
    : icon(glyph.closed, 'demo-item-icon demo-item-icon--closed') +
      icon(glyph.open, 'demo-item-icon demo-item-icon--open');

// Live preview only, so copied examples stay minimal.
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
