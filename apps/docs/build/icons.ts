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

// Rendered at build time, so navigation never shows empty boxes and only the
// chrome's icons (src/icons.ts) ship in the bundle.

const ICONS = {
  ...CHROME_ICONS,

  // Placed from the landing page's markdown.
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

// A favicon has no page to inherit colours from, so it writes them out. A
// file, not a `data:` URI: Google Search shows only fetchable favicons.
export const faviconSvg = (() => {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}">`,
    // The header's colours. It sits on browser chrome, so it follows the
    // system theme, not the toggle.
    '<style>rect { stroke: #4f46e5 } path { fill: #18181b }',
    '@media (prefers-color-scheme: dark) { rect { stroke: #818cf8 } path { fill: #f4f4f5 } }</style>',
    MARK.ring,
    MARK.letter,
    '</svg>',
  ].join(' ');

  return `${svg}\n`;
})();

export const icon = (name: IconName, className: string) => {
  const { viewBox, strokeWidth, body } = ICONS[name];

  // A filled mark carries `fill` on its path; a stroked one on the wrapper.
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

// `<span data-icon="layers" class="size-5"></span>`: markdown can't reach
// `icon()`, and pasted SVG would be a copy nobody updates.
const ICON_PLACEHOLDER =
  /<span data-icon="([\w-]+)"(?: class="([^"]*)")?><\/span>/g;

const isIconName = (name: string): name is IconName =>
  Object.prototype.hasOwnProperty.call(ICONS, name);

export const expandIcons = (html: string): string =>
  html.replace(ICON_PLACEHOLDER, (_match, name: string, className = '') => {
    if (!isIconName(name)) {
      throw new Error(`[docs] no icon named "${name}" in build/icons.ts.`);
    }

    return icon(name, className);
  });

export const stripIcons = (markdown: string): string =>
  markdown.replace(ICON_PLACEHOLDER, '');
