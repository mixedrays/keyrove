import {
  BookOpen,
  Braces,
  Check,
  Copy,
  Keyboard,
  LayoutGrid,
  Menu,
  Moon,
  Sun,
  type IconNode,
} from 'lucide';

/**
 * Icons, rendered into the HTML at build time.
 *
 * They used to be `<span data-icon>` placeholders that main.ts swapped for
 * glyphs on load, which meant every navigation showed a row of empty boxes
 * until the bundle ran. Serialising them here costs nothing at runtime — the
 * icon data is plain arrays — and takes `lucide` out of the shipped bundle
 * entirely.
 */

/**
 * An icon's geometry, independent of the size it is drawn at.
 *
 * `strokeWidth` is in the icon's own viewBox units rather than pixels, so an
 * icon drawn on a larger grid can still be given the same visual weight as the
 * rest — which is the only reason this is per-icon and not a constant. A mark
 * drawn as a fill rather than a stroke sets it to `null` and carries its own
 * `fill` on the path.
 */
type IconDef = {
  viewBox: string;
  strokeWidth: number | null;
  body: string;
};

const renderChild = ([tag, attrs]: IconNode[number]) => {
  const rendered = Object.entries(attrs)
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ');

  return `<${tag} ${rendered} />`;
};

/** Lucide ships every icon on a 24-unit grid at a nominal 2px stroke. */
const fromLucide = (node: IconNode): IconDef => ({
  viewBox: '0 0 24 24',
  // Lucide's default 2px stroke reads heavy next to 14px nav text.
  strokeWidth: 1.75,
  body: node.map(renderChild).join(''),
});

const ICONS = {
  menu: fromLucide(Menu),
  book: fromLucide(BookOpen),
  keyboard: fromLucide(Keyboard),
  grid: fromLucide(LayoutGrid),
  braces: fromLucide(Braces),
  copy: fromLucide(Copy),
  check: fromLucide(Check),
  sun: fromLucide(Sun),
  moon: fromLucide(Moon),

  /*
   * The markdown mark — a filled glyph on a 16-unit grid, so it opts out of the
   * stroke attributes the rest of the set is drawn with.
   */
  markdown: {
    viewBox: '0 0 16 16',
    strokeWidth: null,
    body: '<path fill="currentColor" d="M14.846 12.9233H1.154a1.153 1.153 0 0 1-.44136-.0878 1.152 1.152 0 0 1-.37416-.25 1.153 1.153 0 0 1-.25002-.3741 1.154 1.154 0 0 1-.08779-.4414V4.22999A1.15335 1.15335 0 0 1 1.154 3.07666h13.692c.1515 0 .3014.02983.4414.08779a1.1535 1.1535 0 0 1 .7119 1.06554v7.53871c.0001.1515-.0296.3015-.0876.4415-.0579.14-.1428.2673-.2499.3744a1.153 1.153 0 0 1-.3743.2502c-.14.058-.29.0885-.4415.0885m-11-2.308V7.61533l1.53867 1.92333 1.538-1.92333v2.99997h1.53867V5.38533H6.92267l-1.538 1.92333L3.846 5.38533H2.30734v5.23137zm10.308-2.61531h-1.5387V5.38466h-1.538v2.61533H9.53867L11.846 10.6927z" />',
  },

  /*
   * The GitHub mark, from svgrepo.com/show/504388. Lucide dropped brand marks
   * in v1, so this is the one icon on the site that is not from the set.
   *
   * Drawn on a 192-unit grid rather than 24, so its stroke is scaled to match:
   * 14/192 is the same ratio as the 1.75/24 the lucide icons use, which is what
   * keeps it from reading lighter than its neighbours in the header. The
   * source's own `stroke="#000000"` is dropped — the wrapper below sets
   * `currentColor`, without which the mark would stay black in dark mode.
   */
  github: {
    viewBox: '0 0 192 192',
    strokeWidth: 14,
    body: '<path d="M120.755 170c.03-4.669.059-20.874.059-27.29 0-9.272-3.167-15.339-6.719-18.41 22.051-2.464 45.201-10.863 45.201-49.067 0-10.855-3.824-19.735-10.175-26.683 1.017-2.516 4.413-12.63-.987-26.32 0 0-8.296-2.672-27.202 10.204-7.912-2.213-16.371-3.308-24.784-3.352-8.414.044-16.872 1.14-24.785 3.352C52.457 19.558 44.162 22.23 44.162 22.23c-5.4 13.69-2.004 23.804-.987 26.32C36.824 55.498 33 64.378 33 75.233c0 38.204 23.149 46.603 45.2 49.067-3.551 3.071-6.719 9.138-6.719 18.41 0 6.416.03 22.621.059 27.29M27 130c9.939.703 15.67 9.735 15.67 9.735 8.834 15.199 23.178 10.803 28.815 8.265" />',
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

/**
 * One inline `<svg>`.
 *
 * `className` carries the size, so a caller sizes an icon the same way it sizes
 * anything else on the page.
 */
export const icon = (name: IconName, className: string) => {
  const { viewBox, strokeWidth, body } = ICONS[name];

  // A filled mark carries `fill` on its own path; a stroked one is drawn by
  // the wrapper, so the two need different attribute sets.
  const stroke =
    strokeWidth === null
      ? []
      : [
          'stroke="currentColor"',
          `stroke-width="${strokeWidth}"`,
          'stroke-linecap="round"',
          'stroke-linejoin="round"',
        ];

  return [
    `<svg class="${className} shrink-0"`,
    'xmlns="http://www.w3.org/2000/svg"',
    `viewBox="${viewBox}"`,
    'fill="none"',
    ...stroke,
    `aria-hidden="true">${body}</svg>`,
  ].join(' ');
};
