import {
  Archive,
  ArrowRightToLine,
  Bold,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleSlash,
  Code,
  FileCode,
  FileDown,
  FileJson,
  FilePen,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Hand,
  Inbox,
  Italic,
  Layers,
  Link,
  Mail,
  MessageSquare,
  MousePointer2,
  PenTool,
  Pin,
  Pipette,
  Reply,
  Scan,
  Send,
  ShieldAlert,
  SkipForward,
  Sparkles,
  Square,
  Trash2,
  Type,
  Underline,
} from 'lucide';

import { MARK } from '../src/brand.ts';
import { CHROME_ICONS, fromLucide, type IconDef } from '../src/icons.ts';

/**
 * Icons, rendered into the page HTML at build time.
 *
 * They used to be `<span data-icon>` placeholders that the bundle swapped for
 * glyphs on load, which meant every navigation showed a row of empty boxes
 * until it ran. Serialising them here costs nothing at runtime — the icon data
 * is plain arrays — and keeps all but the chrome's own icons (src/icons.ts)
 * out of the shipped bundle.
 */

const ICONS = {
  ...CHROME_ICONS,

  // The landing page's illustrations and next steps, placed from the markdown
  // with the placeholder `expandIcons` reads.
  layers: fromLucide(Layers),
  skip: fromLucide(SkipForward),
  sparkles: fromLucide(Sparkles),
  tab: fromLucide(ArrowRightToLine),

  // The mail folders in the landing page's hero demo.
  inbox: fromLucide(Inbox),
  drafts: fromLucide(FilePen),
  sent: fromLucide(Send),
  spam: fromLucide(ShieldAlert),
  trash: fromLucide(Trash2),

  // Decorative item icons for compact demo previews.
  link: fromLucide(Link),
  mail: fromLucide(Mail),
  'file-download': fromLucide(FileDown),
  message: fromLucide(MessageSquare),
  pointer: fromLucide(MousePointer2),
  frame: fromLucide(Scan),
  square: fromLucide(Square),
  circle: fromLucide(Circle),
  pen: fromLucide(PenTool),
  type: fromLucide(Type),
  pipette: fromLucide(Pipette),
  hand: fromLucide(Hand),
  reply: fromLucide(Reply),
  pin: fromLucide(Pin),
  folder: fromLucide(Folder),
  'folder-open': fromLucide(FolderOpen),
  'file-code': fromLucide(FileCode),
  'file-json': fromLucide(FileJson),
  'file-text': fromLucide(FileText),
  'file-spreadsheet': fromLucide(FileSpreadsheet),
  bold: fromLucide(Bold),
  italic: fromLucide(Italic),
  underline: fromLucide(Underline),
  code: fromLucide(Code),
  'circle-dashed': fromLucide(CircleDashed),
  'circle-slash': fromLucide(CircleSlash),
  'circle-dot': fromLucide(CircleDot),
  'circle-check': fromLucide(CircleCheck),
  archive: fromLucide(Archive),
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

/**
 * The logo's square mark (src/brand.ts), as the body of `favicon.svg`.
 *
 * The header colours the wordmark from the page: its letters are
 * `currentColor` and its ring follows `dark:`. A favicon has no page to
 * inherit from, so it writes the colours out, and switches them with an
 * inline media query.
 *
 * A file rather than a `data:` URI, which browsers accept but Google Search
 * does not: it shows a favicon beside a result only when it can fetch one from
 * a URL, and falls back to a generic globe otherwise.
 */
export const faviconSvg = (() => {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}">`,
    // indigo-600 and zinc-900, then indigo-400 and zinc-100 — the header's
    // colours. The mark sits on browser chrome rather than on the page, so it
    // follows the system theme whatever the header toggle has been set to.
    '<style>rect { stroke: #4f46e5 } path { fill: #18181b }',
    '@media (prefers-color-scheme: dark) { rect { stroke: #818cf8 } path { fill: #f4f4f5 } }</style>',
    MARK.ring,
    MARK.letter,
    '</svg>',
  ].join(' ');

  return `${svg}\n`;
})();

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

/**
 * The placeholder a content file writes where it wants an icon, with the
 * classes to draw it at: `<span data-icon="layers" class="size-5"></span>`.
 *
 * Markdown has no way to reach `icon()`, and pasting the SVG into a content
 * file would put a second copy of the geometry where nobody would update it.
 */
const ICON_PLACEHOLDER =
  /<span data-icon="([\w-]+)"(?: class="([^"]*)")?><\/span>/g;

const isIconName = (name: string): name is IconName =>
  Object.prototype.hasOwnProperty.call(ICONS, name);

/** Swaps every icon placeholder in rendered HTML for the icon it names. */
export const expandIcons = (html: string): string =>
  html.replace(ICON_PLACEHOLDER, (_match, name: string, className = '') => {
    if (!isIconName(name)) {
      throw new Error(`[docs] no icon named "${name}" in build/icons.ts.`);
    }

    return icon(name, className);
  });

/**
 * Drops the placeholders from a page's `.md` twin, where an icon has nothing
 * to draw and an empty `<span>` would only be noise beside the text it
 * decorates.
 */
export const stripIcons = (markdown: string): string =>
  markdown.replace(ICON_PLACEHOLDER, '');
