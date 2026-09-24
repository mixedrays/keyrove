import {
  BookOpen,
  Check,
  Copy,
  Download,
  Keyboard,
  Moon,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Sun,
  TriangleAlert,
  type IconNode,
} from 'lucide';

/**
 * The bench's icons, drawn as the docs site draws its own (see
 * packages/docs/build/icons.ts): lucide at a 1.75 stroke, inlined into the
 * HTML at build time so none of them wait on the bundle.
 */

const renderNode = (node: IconNode) =>
  node
    .map(([tag, attrs]) => {
      const rendered = Object.entries(attrs)
        .map(([key, value]) => `${key}="${String(value)}"`)
        .join(' ');

      return `<${tag} ${rendered} />`;
    })
    .join('');

const ICONS = {
  book: renderNode(BookOpen),
  check: renderNode(Check),
  copy: renderNode(Copy),
  download: renderNode(Download),
  keyboard: renderNode(Keyboard),
  moon: renderNode(Moon),
  play: renderNode(Play),
  reset: renderNode(RotateCcw),
  settings: renderNode(SlidersHorizontal),
  stop: renderNode(Square),
  sun: renderNode(Sun),
  warning: renderNode(TriangleAlert),
};

export type IconName = keyof typeof ICONS | 'github';

/** The GitHub mark, the one icon not from lucide — the docs header's own. */
const GITHUB =
  '<svg class="CLASS shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M120.755 170c.03-4.669.059-20.874.059-27.29 0-9.272-3.167-15.339-6.719-18.41 22.051-2.464 45.201-10.863 45.201-49.067 0-10.855-3.824-19.735-10.175-26.683 1.017-2.516 4.413-12.63-.987-26.32 0 0-8.296-2.672-27.202 10.204-7.912-2.213-16.371-3.308-24.784-3.352-8.414.044-16.872 1.14-24.785 3.352C52.457 19.558 44.162 22.23 44.162 22.23c-5.4 13.69-2.004 23.804-.987 26.32C36.824 55.498 33 64.378 33 75.233c0 38.204 23.149 46.603 45.2 49.067-3.551 3.071-6.719 9.138-6.719 18.41 0 6.416.03 22.621.059 27.29M27 130c9.939.703 15.67 9.735 15.67 9.735 8.834 15.199 23.178 10.803 28.815 8.265" /></svg>';

/** One inline `<svg>`; `className` carries its size. */
export const icon = (name: IconName, className: string) =>
  name === 'github'
    ? GITHUB.replace('CLASS', className)
    : `<svg class="${className} shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/**
 * The docs' placeholder: `<span data-icon="play" class="size-4"></span>`.
 * Prettier may break the closing tag as `</span\n>` to hug the next element.
 */
const PLACEHOLDER =
  /<span data-icon="([\w-]+)"(?: class="([^"]*)")?><\/span\s*>/g;

export const expandIcons = (html: string) =>
  html.replace(PLACEHOLDER, (_match, name: string, className = '') => {
    if (name !== 'github' && !(name in ICONS)) {
      throw new Error(`[bench] no icon named "${name}" in src/icons.ts.`);
    }

    return icon(name as IconName, className);
  });
