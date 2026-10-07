import {
  Archive,
  ArrowRight,
  ArrowRightToLine,
  Bold,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleSlash,
  Code,
  Command,
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
  RefreshCw,
  Reply,
  Scan,
  Send,
  ShieldAlert,
  SkipForward,
  Sparkles,
  Square,
  TextCursorInput,
  Trash2,
  Type,
  Underline,
} from 'lucide';

import {
  CHROME_ICONS,
  fromLucide,
  LUCIDE_STROKE_WIDTH,
  type IconDef,
} from '../src/icons.ts';

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
  'arrow-right': fromLucide(ArrowRight),

  // The landing page's feature cards and next steps, placed from the markdown
  // with the placeholder `expandIcons` reads.
  command: fromLucide(Command),
  layers: fromLucide(Layers),
  refresh: fromLucide(RefreshCw),
  skip: fromLucide(SkipForward),
  sparkles: fromLucide(Sparkles),
  tab: fromLucide(ArrowRightToLine),
  'text-cursor': fromLucide(TextCursorInput),

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
 * The keyboard mark on its own, as the body of `favicon.svg`.
 *
 * The same glyph at the same weight as the header wordmark, with the two
 * changes a standalone document forces: `currentColor` has nothing to inherit
 * from out here, so the accent is written out; and there is no stylesheet, so
 * the dark variant the wordmark gets from `dark:` is an inline media query.
 *
 * A file rather than a `data:` URI, which browsers accept but Google Search
 * does not: it shows a favicon beside a result only when it can fetch one from
 * a URL, and falls back to a generic globe otherwise.
 */
export const faviconSvg = (() => {
  const { viewBox, body } = ICONS.keyboard;

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    `viewBox="${viewBox}"`,
    'fill="none"',
    // indigo-600 and, below, indigo-400 — the wordmark's two colours. The mark
    // sits on browser chrome rather than on the page, so it follows the system
    // theme whatever the header toggle has been set to.
    'stroke="#4f46e5"',
    `stroke-width="${LUCIDE_STROKE_WIDTH}"`,
    'stroke-linecap="round"',
    'stroke-linejoin="round">',
    '<style>@media (prefers-color-scheme: dark) { svg { stroke: #818cf8 } }</style>',
    body,
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
